import { useMemo, useState } from "react"
import { BookCheck, BookMarked, Tag, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { removeBooks, updateBooks, updateEachBook } from "@/lib/db"
import { addGenre, hasGenre, removeGenre } from "@/lib/genres"
import { uniqueGenres } from "@/lib/search"
import type { Book } from "@/lib/types"
import { useLibraryStore } from "@/store/useLibraryStore"
import { useSelectionStore } from "@/store/useSelectionStore"

export function SelectionBar({ visibleBooks }: { visibleBooks: Book[] }) {
  const { ids, stop, setMany, clear } = useSelectionStore()
  const books = useLibraryStore((s) => s.books)
  const genres = useMemo(() => uniqueGenres(books), [books])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [genreOpen, setGenreOpen] = useState(false)
  const [genre, setGenre] = useState("")
  const [busy, setBusy] = useState(false)

  const selected = [...ids]
  const count = selected.length
  const allVisibleSelected = visibleBooks.length > 0 && visibleBooks.every((b) => ids.has(b.id))

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await run(() => removeBooks(selected))
    clear()
  }

  async function handleGenre(mode: "add" | "remove") {
    const name = genre.trim()
    if (!name) return
    const adding = mode === "add"

    const patches = books
      .filter((b) => ids.has(b.id) && hasGenre(b, name) !== adding)
      .map((b) => ({ id: b.id, patch: { genres: adding ? addGenre(b, name) : removeGenre(b, name) } }))
    await run(() => updateEachBook(patches))
    setGenre("")
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:pb-5">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 rounded-[1.5rem] bg-burgundy p-3 text-on-color shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 font-serif text-lg font-bold tabular-nums">
            {count} {count === 1 ? "seleccionado" : "seleccionados"}
          </span>
          <button
            type="button"
            onClick={() => (allVisibleSelected ? clear() : setMany(visibleBooks.map((b) => b.id)))}
            className="cursor-pointer rounded-full px-3 py-1.5 text-sm underline-offset-4 hover:underline"
          >
            {allVisibleSelected ? "Ninguno" : `Todos los visibles (${visibleBooks.length})`}
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={stop}
            aria-label="Salir de la selección"
            className="ml-auto text-on-color hover:bg-on-color/15 hover:text-on-color"
          >
            <X />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={count === 0 || busy}
            onClick={() => run(() => updateBooks(selected, { read: true }))}
            className="h-9 rounded-full bg-paper/15 px-3.5 text-on-color hover:bg-paper/25"
          >
            <BookCheck /> Leídos
          </Button>
          <Button
            disabled={count === 0 || busy}
            onClick={() => run(() => updateBooks(selected, { read: false }))}
            className="h-9 rounded-full bg-paper/15 px-3.5 text-on-color hover:bg-paper/25"
          >
            <BookMarked /> Por leer
          </Button>
          <Button
            disabled={count === 0 || busy}
            onClick={() => setGenreOpen((o) => !o)}
            className="h-9 rounded-full bg-paper/15 px-3.5 text-on-color hover:bg-paper/25"
          >
            <Tag /> Géneros
          </Button>
          <Button
            disabled={count === 0 || busy}
            onClick={handleDelete}
            className="ml-auto h-9 rounded-full bg-coral px-4 text-on-color hover:bg-coral/85"
          >
            <Trash2 /> {confirmDelete ? `¿Borrar ${count}? Pulsa otra vez` : "Borrar"}
          </Button>
        </div>

        {genreOpen && (
          <div className="flex gap-2">
            <Input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              list="selection-genres"
              placeholder="Género"
              className="h-9 bg-paper text-foreground"
              autoFocus
            />
            <datalist id="selection-genres">
              {genres.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <Button
              onClick={() => handleGenre("add")}
              disabled={busy || !genre.trim()}
              className="h-9 rounded-full bg-mustard px-4 text-[#3B2226] hover:bg-mustard/85"
            >
              Añadir
            </Button>
            <Button
              onClick={() => handleGenre("remove")}
              disabled={busy || !genre.trim()}
              className="h-9 rounded-full bg-paper/15 px-4 text-on-color hover:bg-paper/25"
            >
              Quitar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
