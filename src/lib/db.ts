import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore"
import { auth, firestore } from "@/lib/firebase"
import type { Book, BookDraft } from "@/lib/types"

// Una colección para todos, pero cada libro tiene dueño (`owner`, su correo)
// y cada cuenta sólo lee y escribe los suyos: lo exigen las reglas de Firestore.
const COLLECTION = "books"

/** Correo de la cuenta con la que se ha entrado. */
function currentOwner(): string {
  const email = auth?.currentUser?.email
  if (!email) throw new Error("Hay que entrar con Google")
  return email
}
const BATCH_LIMIT = 500
const LOCAL_KEY = "biblioteca-books"

type Listener = (books: Book[]) => void

/** Libros guardados con el formato antiguo (`genre`, uno solo) → `genres`. */
function fromStored(data: Omit<Book, "id">, id: string): Book {
  const { genre, ...rest } = data
  const genres = rest.genres?.length ? rest.genres : genre ? [genre] : undefined
  return { ...rest, genres, id }
}

/* ---------- Modo local (sin Firebase configurado) ---------- */

const localListeners = new Set<Listener>()

function readLocal(): Book[] {
  try {
    return (JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as Book[]).map((b) => fromStored(b, b.id))
  } catch {
    return []
  }
}

function writeLocal(books: Book[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(books))
  localListeners.forEach((listener) => listener(books))
}

function newId() {
  return crypto.randomUUID()
}

/* ---------- API pública ---------- */

export function subscribeBooks(onChange: Listener, onError: (error: Error) => void): () => void {
  if (!firestore) {
    localListeners.add(onChange)
    onChange(readLocal())
    return () => localListeners.delete(onChange)
  }
  // Sólo se crean objetos nuevos para los libros que cambian: los demás
  // conservan su identidad y React no vuelve a pintar toda la estantería
  // cada vez que se guarda una portada.
  const cache = new Map<string, Book>()
  return onSnapshot(
    query(collection(firestore, COLLECTION), where("owner", "==", currentOwner())),
    (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "removed") cache.delete(change.doc.id)
        else cache.set(change.doc.id, fromStored(change.doc.data() as Omit<Book, "id">, change.doc.id))
      }
      onChange(snapshot.docs.map((d) => cache.get(d.id)!))
    },
    onError
  )
}

export async function addBooks(drafts: BookDraft[], addedBy?: string) {
  const now = Date.now()
  // createdAt escalonado para que el orden "recientes" respete el del CSV.
  const books = drafts.map((draft, i) => ({ ...draft, addedBy, createdAt: now - i }))

  if (!firestore) {
    writeLocal([...books.map((b) => ({ ...b, id: newId() })), ...readLocal()])
    return
  }
  const owner = currentOwner()
  for (let i = 0; i < books.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore)
    for (const book of books.slice(i, i + BATCH_LIMIT)) batch.set(doc(collection(firestore, COLLECTION)), { ...book, owner })
    await batch.commit()
  }
}

export async function addBook(draft: BookDraft, addedBy?: string) {
  if (!firestore) return addBooks([draft], addedBy)
  await addDoc(collection(firestore, COLLECTION), { ...draft, addedBy, owner: currentOwner(), createdAt: Date.now() })
}

/** Un campo que llega `undefined` se borra del documento (el usuario vació el input). */
function toFirestorePatch(patch: Partial<BookDraft>) {
  const data = Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [key, value === undefined ? deleteField() : value])
  )
  // Al guardar la lista de géneros, se borra el campo antiguo de un solo género.
  if ("genres" in patch) data.genre = deleteField()
  return data
}

export async function updateBook(id: string, patch: Partial<BookDraft>) {
  if (!firestore) {
    writeLocal(readLocal().map((b) => (b.id === id ? { ...b, ...patch } : b)))
    return
  }
  await updateDoc(doc(firestore, COLLECTION, id), toFirestorePatch(patch))
}

/** Mismo cambio para varios libros (selección múltiple, renombrar géneros…). */
export async function updateBooks(ids: string[], patch: Partial<BookDraft>) {
  if (ids.length === 0) return
  if (!firestore) {
    const idSet = new Set(ids)
    writeLocal(readLocal().map((b) => (idSet.has(b.id) ? { ...b, ...patch } : b)))
    return
  }
  const data = toFirestorePatch(patch)
  for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore)
    for (const id of ids.slice(i, i + BATCH_LIMIT)) batch.update(doc(firestore, COLLECTION, id), data)
    await batch.commit()
  }
}

/** Un cambio distinto para cada libro, en lotes (búsqueda de portadas en segundo plano). */
export async function updateEachBook(patches: { id: string; patch: Partial<BookDraft> }[]) {
  if (patches.length === 0) return
  if (!firestore) {
    const byId = new Map(patches.map((p) => [p.id, p.patch]))
    writeLocal(readLocal().map((b) => (byId.has(b.id) ? { ...b, ...byId.get(b.id) } : b)))
    return
  }
  for (let i = 0; i < patches.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore)
    for (const { id, patch } of patches.slice(i, i + BATCH_LIMIT)) {
      batch.update(doc(firestore, COLLECTION, id), toFirestorePatch(patch))
    }
    await batch.commit()
  }
}

/**
 * Paso único al separar bibliotecas: los libros de antes no tenían dueño.
 * Cada cuenta se queda con los que añadió ella (por su nombre en `addedBy`).
 * Cuando las reglas ya exigen dueño, leer sin filtro falla y no hace nada.
 */
export async function claimUnownedBooks(): Promise<number> {
  const user = auth?.currentUser
  if (!firestore || !user?.email || !user.displayName) return 0
  const snapshot = await getDocs(collection(firestore, COLLECTION))
  const mine = snapshot.docs.filter((d) => {
    const data = d.data() as Partial<Book>
    return !data.owner && data.addedBy === user.displayName
  })
  for (let i = 0; i < mine.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore)
    for (const d of mine.slice(i, i + BATCH_LIMIT)) batch.update(d.ref, { owner: user.email })
    await batch.commit()
  }
  return mine.length
}

export async function removeBooks(ids: string[]) {
  if (ids.length === 0) return
  if (!firestore) {
    const idSet = new Set(ids)
    writeLocal(readLocal().filter((b) => !idSet.has(b.id)))
    return
  }
  for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore)
    for (const id of ids.slice(i, i + BATCH_LIMIT)) batch.delete(doc(firestore, COLLECTION, id))
    await batch.commit()
  }
}

export async function removeBook(id: string) {
  if (!firestore) {
    writeLocal(readLocal().filter((b) => b.id !== id))
    return
  }
  await deleteDoc(doc(firestore, COLLECTION, id))
}
