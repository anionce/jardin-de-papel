import { Fragment, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Camera, ImageOff, Loader2, Search, Trash2 } from "lucide-react"
import { BookCover } from "@/components/library/BookCover"
import { BookSuggestions } from "@/components/library/BookSuggestions"
import { GenresInput } from "@/components/library/GenresInput"
import { genresPatch } from "@/lib/genres"
import { useBookSuggestions } from "@/hooks/useBookSuggestions"
import type { BookSuggestion } from "@/lib/bookLookup"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { findCoverCandidates, findEdition, TRUSTED_WORK_VERSION } from "@/lib/bookLookup"
import { imageFileToDataUrl, isUploadedImage, preloadImage } from "@/lib/image"
import { addBook, removeBook, updateBook } from "@/lib/db"
import { similarBooksFinder } from "@/lib/duplicates"
import { uniqueGenres, uniquePublishers } from "@/lib/search"
import { normalize } from "@/lib/text"
import { cn } from "@/lib/utils"
import type { Book, BookDraft } from "@/lib/types"
import { useBookFormStore } from "@/store/useBookFormStore"
import { useLibraryStore } from "@/store/useLibraryStore"

interface FormValues {
  title: string
  author: string
  publisher: string
  genres: string[]
  year: string
  pages: string
  isbn: string
  coverUrl: string
  /** El usuario quitó la portada a propósito: no volver a buscarla sola. */
  coverRemoved: boolean
  read: boolean
}

function toValues(book: Book | null): FormValues {
  return {
    title: book?.title ?? "",
    author: book?.author ?? "",
    publisher: book?.publisher ?? "",
    genres: book?.genres ?? [],
    year: book?.year ? String(book.year) : "",
    pages: book?.pages ? String(book.pages) : "",
    isbn: book?.isbn ?? "",
    coverUrl: book?.coverUrl ?? "",
    coverRemoved: Boolean(book?.coverChecked && !book.coverUrl),
    read: book?.read ?? false,
  }
}

/** Campos vacíos → undefined (en edición, eso borra el dato guardado). */
function toDraft(values: FormValues): BookDraft {
  const text = (v: string) => v.trim() || undefined
  const year = parseInt(values.year, 10)
  const pages = parseInt(values.pages, 10)
  return {
    title: text(values.title),
    author: text(values.author),
    publisher: text(values.publisher),
    genres: genresPatch(values.genres),
    year: Number.isFinite(year) ? year : undefined,
    pages: Number.isFinite(pages) && pages > 0 ? pages : undefined,
    isbn: text(values.isbn.replace(/[^0-9Xx]/g, "")),
    coverUrl: text(values.coverUrl),
    // Sin portada y sin quitarla a propósito → la búsqueda automática lo
    // reintentará con los datos nuevos (p. ej. tras corregir título o ISBN).
    coverChecked: values.coverUrl.trim() || values.coverRemoved ? true : undefined,
    read: values.read,
  }
}

type TextField = Exclude<keyof FormValues, "read" | "coverUrl" | "coverRemoved" | "genres">

const FIELDS: { name: TextField; label: string; placeholder: string; inputMode?: "numeric" }[] = [
  { name: "title", label: "Título", placeholder: "Cien años de soledad" },
  { name: "author", label: "Autor", placeholder: "Gabriel García Márquez" },
  { name: "publisher", label: "Editorial", placeholder: "Penguin Random House" },
  { name: "year", label: "Año", placeholder: "1967", inputMode: "numeric" },
  { name: "pages", label: "Páginas", placeholder: "471", inputMode: "numeric" },
  { name: "isbn", label: "ISBN", placeholder: "9788497592208", inputMode: "numeric" },
]

const FULL_WIDTH = new Set<TextField>(["title", "author", "publisher", "isbn"])

/** Campos que se autocompletan con lo que ya hay en la estantería. */
const DATALISTS: Partial<Record<TextField, string>> = { publisher: "publisher-options" }

export function BookFormDialog({ addedBy }: { addedBy?: string }) {
  const { open, editing, close } = useBookFormStore()

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] grid-cols-1 overflow-x-hidden overflow-y-auto rounded-[1.75rem] bg-paper p-5 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold text-burgundy">
            {editing ? "Editar libro" : "Añadir un libro"}
          </DialogTitle>
          <DialogDescription>Todos los campos son opcionales: rellena lo que sepas.</DialogDescription>
        </DialogHeader>
        {/* key: cada apertura arranca con el formulario limpio / del libro editado */}
        {open && <BookForm key={editing?.id ?? "new"} editing={editing} addedBy={addedBy} onDone={close} />}
      </DialogContent>
    </Dialog>
  )
}

function BookForm({ editing, addedBy, onDone }: { editing: Book | null; addedBy?: string; onDone: () => void }) {
  const books = useLibraryStore((s) => s.books)
  const genres = useMemo(() => uniqueGenres(books), [books])
  const publishers = useMemo(() => uniquePublishers(books), [books])
  const [values, setValues] = useState<FormValues>(() => toValues(editing))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [searchingCover, setSearchingCover] = useState(false)
  const [coverMessage, setCoverMessage] = useState<string | null>(null)
  /** Libros parecidos ya en la estantería; se avisa una vez antes de guardar. */
  const [similar, setSimilar] = useState<Book[] | null>(null)

  /** Editorial a la que corresponden la portada y el ISBN que hay ahora. */
  const [editionPublisher, setEditionPublisher] = useState(values.publisher)

  /** Sólo se busca cuando el usuario escribe título o autor (no al abrir para editar). */
  const [lookupEnabled, setLookupEnabled] = useState(false)
  const lookup = useBookSuggestions(values.title, values.author, lookupEnabled)

  const set = (name: keyof FormValues, value: string | boolean) => {
    setValues((v) => ({ ...v, [name]: value }))
    if (name === "title" || name === "author") {
      setSimilar(null)
      setLookupEnabled(true)
    }
  }

  function pickSuggestion(s: BookSuggestion) {
    setValues((v) => ({
      ...v,
      title: s.title,
      author: s.author ?? v.author,
      publisher: s.publisher ?? v.publisher,
      year: s.year ? String(s.year) : v.year,
      pages: s.pages ? String(s.pages) : v.pages,
      isbn: s.isbn ?? v.isbn,
      coverUrl: s.coverUrl ?? v.coverUrl,
      coverRemoved: s.coverUrl ? false : v.coverRemoved,
    }))
    setSimilar(null)
    setLookupEnabled(false)
    setEditionPublisher(s.publisher ?? values.publisher)
  }

  /**
   * Al cambiar la editorial (otra edición del mismo libro), se busca esa
   * edición para poner su portada y su ISBN.
   */
  async function handlePublisherBlur() {
    const publisher = values.publisher.trim()
    if (!publisher || !values.title.trim() || normalize(publisher) === normalize(editionPublisher)) return
    setEditionPublisher(publisher)
    setSearchingCover(true)
    setCoverMessage(`Buscando la edición de ${publisher}…`)
    try {
      const edition = await findEdition({ title: values.title, author: values.author || undefined, publisher })
      if (edition?.coverUrl || edition?.isbn) {
        setValues((v) => ({
          ...v,
          coverUrl: edition.coverUrl ?? v.coverUrl,
          coverRemoved: edition.coverUrl ? false : v.coverRemoved,
          isbn: edition.isbn ?? v.isbn,
        }))
        const what = [edition.coverUrl && "Portada", edition.isbn && "ISBN"].filter(Boolean).join(" e ")
        setCoverMessage(`${what} de la edición de ${publisher}.`)
      } else {
        setCoverMessage(`No he encontrado la edición de ${publisher}; se queda la portada que había.`)
      }
    } catch {
      setCoverMessage("No se ha podido buscar la edición ahora mismo.")
    } finally {
      setSearchingCover(false)
    }
  }

  const preview: Book = {
    ...toDraft(values),
    id: editing?.id ?? "nuevo",
    coverChecked: true,
    createdAt: 0,
  }

  /** Portadas encontradas para estos datos; cada clic en "Buscar portada" pasa a la siguiente. */
  const [coverCandidates, setCoverCandidates] = useState<{ key: string; urls: string[] } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  /** Portadas que no cargaron: no se vuelven a probar. */
  const failedCovers = useRef(new Set<string>())

  async function handleFindCover() {
    const draft = toDraft(values)
    const key = [draft.title, draft.author, draft.publisher, draft.isbn].map((v) => normalize(v ?? "")).join("|")
    setCoverMessage(null)
    let urls = coverCandidates?.key === key ? coverCandidates.urls : null
    if (!urls) {
      setSearchingCover(true)
      try {
        // La obra ya conocida ahorra una búsqueda (si no han cambiado título ni autor).
        const sameBook =
          editing !== null &&
          (editing.workVersion ?? 0) >= TRUSTED_WORK_VERSION &&
          editing.title === draft.title &&
          editing.author === draft.author
        urls = await findCoverCandidates({ ...draft, workKey: sameBook ? editing.workKey : undefined })
        setCoverCandidates({ key, urls })
      } catch {
        setCoverMessage("No se ha podido buscar ahora mismo. Prueba más tarde.")
        return
      } finally {
        setSearchingCover(false)
      }
    }
    const current = urls.indexOf(values.coverUrl)
    // Se prueban las siguientes hasta dar con una que cargue de verdad: así
    // cada clic enseña una portada distinta, no un hueco en blanco.
    setSearchingCover(true)
    setCoverMessage("Cargando portada…")
    let found = -1
    for (let step = 1; step <= urls.length; step++) {
      const index = (current + step) % urls.length
      if (index === current) break
      if (failedCovers.current.has(urls[index])) continue
      if (await preloadImage(urls[index])) {
        found = index
        break
      }
      failedCovers.current.add(urls[index])
    }
    setSearchingCover(false)
    if (found === -1) {
      setCoverMessage(
        current === -1
          ? "No he encontrado portada. Sube una foto o pega la URL de una imagen."
          : "No he encontrado otra portada. Puedes subir una foto."
      )
      return
    }
    setValues((v) => ({ ...v, coverUrl: urls[found], coverRemoved: false }))
    setCoverMessage(
      found <= current
        ? `No hay más: vuelvo a la primera (${found + 1} de ${urls.length}).`
        : `Portada ${found + 1} de ${urls.length}. ¿No es esta? Pulsa otra vez.`
    )
    // La siguiente se va cargando ya, para que el próximo clic sea inmediato.
    const upcoming = urls[(found + 1) % urls.length]
    if (upcoming && !failedCovers.current.has(upcoming)) void preloadImage(upcoming)
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setSearchingCover(true)
    setCoverMessage(null)
    try {
      const coverUrl = await imageFileToDataUrl(file)
      setValues((v) => ({ ...v, coverUrl, coverRemoved: false }))
      setCoverMessage("Foto lista. Se guardará con el libro.")
    } catch {
      setCoverMessage("No he podido leer esa imagen. Prueba con una foto JPG o PNG.")
    } finally {
      setSearchingCover(false)
    }
  }

  function identityChanged(draft: BookDraft): boolean {
    if (!editing) return true
    return draft.title !== editing.title || draft.author !== editing.author || draft.isbn !== editing.isbn
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const draft = toDraft(values)

    // Aviso de posible duplicado (sólo la primera vez que se pulsa guardar).
    if (similar === null && identityChanged(draft)) {
      const matches = similarBooksFinder(books.filter((b) => b.id !== editing?.id))(draft)
      if (matches.length > 0) {
        setSimilar(matches)
        return
      }
    }

    setSaving(true)
    try {
      // Si cambia título, autor o ISBN, la obra de Open Library se vuelve a buscar.
      const patch: Partial<BookDraft> = identityChanged(draft)
        ? { ...draft, workKey: undefined, workChecked: undefined, workVersion: undefined }
        : draft
      if (editing) await updateBook(editing.id, patch)
      else await addBook(draft, addedBy)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await removeBook(editing.id)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <div className="flex gap-3 rounded-2xl bg-card p-3 sm:col-span-2 sm:gap-4">
        <BookCover key={values.coverUrl} book={preview} className="w-16 shrink-0 sm:w-20" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Portada (URL de la imagen)
            <Input
              // Una foto subida es un data URL larguísimo: no se enseña.
              value={isUploadedImage(values.coverUrl) ? "" : values.coverUrl}
              onChange={(e) => setValues((v) => ({ ...v, coverUrl: e.target.value, coverRemoved: false }))}
              placeholder={isUploadedImage(values.coverUrl) ? "Foto subida ✓" : "https://…"}
              inputMode="url"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFindCover}
              disabled={searchingCover || (!values.title.trim() && !values.isbn.trim())}
              className="rounded-full"
            >
              {searchingCover ? <Loader2 className="animate-spin" /> : <Search />}{" "}
              {coverCandidates && values.coverUrl ? "Otra portada" : "Buscar portada"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={searchingCover}
              className="rounded-full"
            >
              <Camera /> Subir foto
            </Button>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {values.coverUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setValues((v) => ({ ...v, coverUrl: "", coverRemoved: true }))}
                className="rounded-full text-muted-foreground"
              >
                <ImageOff /> Quitar
              </Button>
            )}
          </div>
          {coverMessage && <p className="text-xs text-muted-foreground">{coverMessage}</p>}
        </div>
      </div>

      {FIELDS.map((field) => (
        <Fragment key={field.name}>
          <label
            className={cn("flex flex-col gap-1.5 text-[13px] font-medium", FULL_WIDTH.has(field.name) && "sm:col-span-2")}
          >
            {field.label}
            <Input
              value={values[field.name]}
              onChange={(e) => set(field.name, e.target.value)}
              placeholder={field.placeholder}
              inputMode={field.inputMode}
              list={DATALISTS[field.name]}
              autoFocus={field.name === "title"}
              autoComplete="off"
              onBlur={field.name === "publisher" ? handlePublisherBlur : undefined}
            />
          </label>
          {field.name === "author" && lookup.active && (
            <BookSuggestions
              loading={lookup.loading}
              suggestions={lookup.suggestions}
              onPick={pickSuggestion}
              onClose={() => setLookupEnabled(false)}
            />
          )}
        </Fragment>
      ))}
      <div className="flex flex-col gap-1.5 text-[13px] font-medium sm:col-span-2">
        <span>Géneros</span>
        <GenresInput value={values.genres} onChange={(genres) => setValues((v) => ({ ...v, genres }))} options={genres} />
      </div>
      <datalist id="publisher-options">
        {publishers.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <fieldset className="flex items-center gap-3 sm:col-span-2">
        <legend className="sr-only">¿Leído?</legend>
        <span className="text-[13px] font-medium">¿Leído?</span>
        {[
          { value: true, label: "Sí" },
          { value: false, label: "No" },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={values.read === option.value}
            onClick={() => set("read", option.value)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              values.read === option.value ? "bg-sage-deep text-on-color" : "border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </fieldset>

      {similar && similar.length > 0 && (
        <div className="rounded-2xl bg-mustard/30 px-4 py-3 text-sm sm:col-span-2" role="alert">
          <p className="font-semibold">Parece que ya lo tienes:</p>
          <ul className="mt-1 list-disc pl-5">
            {similar.slice(0, 3).map((b) => (
              <li key={b.id}>
                «{b.title ?? "Sin título"}»{b.author && ` de ${b.author}`}
                {b.year && ` (${b.year})`}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-foreground/75">Si es otra edición y quieres las dos, pulsa guardar otra vez.</p>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 sm:col-span-2">
        {editing ? (
          <Button type="button" variant="destructive" onClick={handleDelete} className="h-10 rounded-full px-4">
            <Trash2 /> {confirmDelete ? "¿Seguro? Pulsa otra vez" : "Eliminar"}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={saving} className="h-10 rounded-full px-6">
          {similar && similar.length > 0 ? "Guardar igualmente" : editing ? "Guardar cambios" : "Añadir a la estantería"}
        </Button>
      </div>
    </form>
  )
}
