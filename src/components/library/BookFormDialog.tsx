import { Fragment, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Camera, ImageOff, Loader2, Search, Trash2 } from "lucide-react"
import { BookCover } from "@/components/library/BookCover"
import { BookSuggestions } from "@/components/library/BookSuggestions"
import { GenresInput } from "@/components/library/GenresInput"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useBookSuggestions } from "@/hooks/useBookSuggestions"
import { useCoverSearch } from "@/hooks/useCoverSearch"
import type { BookSuggestion } from "@/lib/bookLookup"
import { applySuggestion, identityChanged, toDraft, toValues, type FormValues } from "@/lib/bookForm"
import { addBook, removeBook, updateBook } from "@/lib/db"
import { similarBooksFinder } from "@/lib/duplicates"
import { isUploadedImage } from "@/lib/image"
import { uniqueGenres, uniquePublishers } from "@/lib/search"
import { cn } from "@/lib/utils"
import type { Book, BookDraft } from "@/lib/types"
import { useBookFormStore } from "@/store/useBookFormStore"
import { useLibraryStore } from "@/store/useLibraryStore"

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

const DATALISTS: Partial<Record<TextField, string>> = { publisher: "publisher-options" }

export const BookFormDialog = () => {
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
        {open && <BookForm key={editing?.id ?? "new"} editing={editing} onDone={close} />}
      </DialogContent>
    </Dialog>
  )
}

const BookForm = ({ editing, onDone }: { editing: Book | null; onDone: () => void }) => {
  const books = useLibraryStore((s) => s.books)
  const genres = useMemo(() => uniqueGenres(books), [books])
  const publishers = useMemo(() => uniquePublishers(books), [books])
  const [values, setValues] = useState<FormValues>(() => toValues(editing))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [similar, setSimilar] = useState<Book[] | null>(null)
  const [lookupEnabled, setLookupEnabled] = useState(false)
  const lookup = useBookSuggestions(values.title, values.author, lookupEnabled)
  const cover = useCoverSearch(values, setValues, editing)
  const fileInput = useRef<HTMLInputElement>(null)

  const set = (name: keyof FormValues, value: string | boolean) => {
    setValues((v) => ({ ...v, [name]: value }))
    if (name === "title" || name === "author") {
      setSimilar(null)
      setLookupEnabled(true)
    }
  }

  const pickSuggestion = (suggestion: BookSuggestion) => {
    setValues((v) => applySuggestion(v, suggestion))
    setSimilar(null)
    setLookupEnabled(false)
    cover.setEditionPublisher(suggestion.publisher ?? values.publisher)
  }

  const preview: Book = { ...toDraft(values), id: editing?.id ?? "nuevo", coverChecked: true, createdAt: 0 }

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) void cover.uploadCover(file)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const draft = toDraft(values)
    const isNewIdentity = identityChanged(editing, draft)

    if (similar === null && isNewIdentity) {
      const matches = similarBooksFinder(books.filter((b) => b.id !== editing?.id))(draft)
      if (matches.length > 0) {
        setSimilar(matches)
        return
      }
    }

    setSaving(true)
    try {
      const patch: Partial<BookDraft> = isNewIdentity
        ? { ...draft, workKey: undefined, workChecked: undefined, workVersion: undefined }
        : draft
      if (editing) await updateBook(editing.id, patch)
      else await addBook(draft)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
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
              onClick={cover.findNextCover}
              disabled={cover.searching || (!values.title.trim() && !values.isbn.trim())}
              className="rounded-full"
            >
              {cover.searching ? <Loader2 className="animate-spin" /> : <Search />}{" "}
              {cover.hasCandidates && values.coverUrl ? "Otra portada" : "Buscar portada"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={cover.searching}
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
          {cover.message && <p className="text-xs text-muted-foreground">{cover.message}</p>}
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
              onBlur={field.name === "publisher" ? cover.findPublisherEdition : undefined}
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
