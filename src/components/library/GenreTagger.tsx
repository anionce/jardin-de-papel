import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Check, Loader2, SkipForward, Tags, X } from "lucide-react"
import { BookCover } from "@/components/library/BookCover"
import { GenresInput } from "@/components/library/GenresInput"
import { Button } from "@/components/ui/button"
import { updateBook } from "@/lib/db"
import { genresPatch, suggestedGenres, untaggedBooks } from "@/lib/genres"
import { uniqueGenres } from "@/lib/search"
import type { Book } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useLibraryStore } from "@/store/useLibraryStore"

export const GenreTagger = () => {
  const books = useLibraryStore((s) => s.books)
  const [open, setOpen] = useState(false)
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(() => new Set())
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set())
  const queue = useMemo(() => untaggedBooks(books, new Set([...skipped, ...done])), [books, skipped, done])
  const untagged = useMemo(() => untaggedBooks(books, new Set()).length, [books])
  const current = queue[0]

  if (untagged === 0) return null

  if (!open) {
    return (
      <div className="mx-auto mb-8 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-mustard/30 px-5 py-4">
        <p className="text-sm">
          <span className="font-semibold">{untagged}</span> {untagged === 1 ? "libro no tiene" : "libros no tienen"} género.
        </p>
        <Button onClick={() => setOpen(true)} className="h-10 rounded-full px-5">
          <Tags /> Ponerles género
        </Button>
      </div>
    )
  }

  return (
    <section aria-label="Poner género" className="mx-auto mb-10 max-w-2xl rounded-[1.5rem] bg-card p-5 shadow-lg shadow-black/5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {queue.length === 0 ? "¡Listo!" : `Quedan ${queue.length}`}
          {skipped.size > 0 && ` · ${skipped.size} ${skipped.size === 1 ? "saltado" : "saltados"}`}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="rounded-full">
          <X /> Terminar
        </Button>
      </div>
      {current ? (
        <TagCard
          key={current.id}
          book={current}
          books={books}
          onSkip={() => setSkipped((s) => new Set(s).add(current.id))}
          onSaved={() => setDone((s) => new Set(s).add(current.id))}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-serif text-xl font-bold text-burgundy">
            {skipped.size > 0 ? "Solo quedan los que has saltado" : "Todos tus libros tienen género"}
          </p>
          {skipped.size > 0 && (
            <Button variant="outline" onClick={() => setSkipped(new Set())} className="rounded-full">
              Volver a los saltados
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

interface TagCardProps {
  book: Book
  books: Book[]
  onSkip: () => void
  onSaved: () => void
}

const TagCard = ({ book, books, onSkip, onSaved }: TagCardProps) => {
  const [chosen, setChosen] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const suggestions = useMemo(() => suggestedGenres(book, books), [book, books])
  const allGenres = useMemo(() => uniqueGenres(books), [books])

  const toggle = (genre: string) =>
    setChosen((current) => (current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]))

  const save = async () => {
    const genres = genresPatch(chosen)
    if (!genres) return
    setSaving(true)
    try {
      await updateBook(book.id, { genres })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <BookCover book={book} className="w-20 shrink-0" />
        <div className="min-w-0">
          <h2 className="font-serif text-xl leading-snug font-bold text-burgundy">{book.title ?? "Sin título"}</h2>
          {book.author && (
            <Link to={`/autor/${encodeURIComponent(book.author)}`} className="text-sm text-foreground/80 hover:underline">
              {book.author}
            </Link>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Géneros sugeridos">
          {suggestions.map((genre) => {
            const selected = chosen.includes(genre)
            return (
              <button
                key={genre}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(genre)}
                className={cn(
                  "cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  selected ? "bg-sage-deep text-on-color" : "border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {genre}
              </button>
            )
          })}
        </div>
      )}

      <GenresInput
        value={chosen}
        onChange={setChosen}
        options={allGenres}
        placeholder={suggestions.length > 0 ? "U otro género…" : "Escribe un género…"}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onSkip} disabled={saving} className="rounded-full">
          <SkipForward /> Saltar
        </Button>
        <Button onClick={save} disabled={saving || chosen.length === 0} className="rounded-full px-5">
          {saving ? <Loader2 className="animate-spin" /> : <Check />} Guardar y siguiente
        </Button>
      </div>
    </div>
  )
}
