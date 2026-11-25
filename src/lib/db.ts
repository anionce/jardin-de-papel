import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
  type WriteBatch,
} from "firebase/firestore"
import { auth, firestore } from "@/lib/firebase"
import { currentLibrary, currentMemberPerson } from "@/lib/membership"
import type { Book, BookDraft } from "@/lib/types"

const COLLECTION = "books"

const BATCH_LIMIT = 500
const LOCAL_KEY = "biblioteca-books"

type Listener = (books: Book[]) => void

const fromStored = (data: Omit<Book, "id">, id: string): Book => {
  const { genre, ...rest } = data
  const genres = rest.genres?.length ? rest.genres : genre ? [genre] : undefined
  return { ...rest, genres, id }
}

const localListeners = new Set<Listener>()

const readLocal = (): Book[] => {
  try {
    return (JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as Book[]).map((b) => fromStored(b, b.id))
  } catch {
    return []
  }
}

const writeLocal = (books: Book[]) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(books))
  localListeners.forEach((listener) => listener(books))
}

export const subscribeBooks = (onChange: Listener, onError: (error: Error) => void): () => void => {
  if (!firestore) {
    localListeners.add(onChange)
    onChange(readLocal())
    return () => localListeners.delete(onChange)
  }

  const cache = new Map<string, Book>()
  return onSnapshot(
    query(collection(firestore, COLLECTION), where("owner", "==", currentLibrary())),
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

type BookPatch = { id: string; patch: Partial<BookDraft> }

const commitInBatches = async <T>(items: T[], write: (batch: WriteBatch, item: T) => void) => {
  if (!firestore) return
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore)
    for (const item of items.slice(i, i + BATCH_LIMIT)) write(batch, item)
    await batch.commit()
  }
}

const currentUserName = (): string | undefined => {
  return auth?.currentUser?.displayName ?? undefined
}

export const addBooks = async (drafts: BookDraft[]) => {
  const now = Date.now()
  const addedBy = currentUserName()

  const person = currentMemberPerson()
  const books = drafts.map((draft, i) => ({ ...draft, person: draft.person ?? person, addedBy, createdAt: now - i }))

  if (!firestore) {
    writeLocal([...books.map((b) => ({ ...b, id: crypto.randomUUID() })), ...readLocal()])
    return
  }
  const owner = currentLibrary()
  const db = firestore
  await commitInBatches(books, (batch, book) => batch.set(doc(collection(db, COLLECTION)), { ...book, owner }))
}

export const addBook = (draft: BookDraft) => addBooks([draft])

const toFirestorePatch = (patch: Partial<BookDraft>) => {
  const data = Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [key, value === undefined ? deleteField() : value])
  )

  if ("genres" in patch) data.genre = deleteField()
  return data
}

export const updateEachBook = async (patches: BookPatch[]) => {
  if (patches.length === 0) return
  if (!firestore) {
    const byId = new Map(patches.map((p) => [p.id, p.patch]))
    writeLocal(readLocal().map((b) => ({ ...b, ...byId.get(b.id) })))
    return
  }
  const db = firestore
  await commitInBatches(patches, (batch, { id, patch }) => batch.update(doc(db, COLLECTION, id), toFirestorePatch(patch)))
}

export const updateBooks = (ids: string[], patch: Partial<BookDraft>) => updateEachBook(ids.map((id) => ({ id, patch })))

export const updateBook = (id: string, patch: Partial<BookDraft>) => updateEachBook([{ id, patch }])

export const removeBooks = async (ids: string[]) => {
  if (ids.length === 0) return
  if (!firestore) {
    const idSet = new Set(ids)
    writeLocal(readLocal().filter((b) => !idSet.has(b.id)))
    return
  }
  const db = firestore
  await commitInBatches(ids, (batch, id) => batch.delete(doc(db, COLLECTION, id)))
}

export const removeBook = (id: string) => removeBooks([id])
