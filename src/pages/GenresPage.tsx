import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Eye, Pencil, Trash2, X } from "lucide-react"
import { Squiggle } from "@/components/decor/Flower"
import { GenreTagger } from "@/components/library/GenreTagger"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateEachBook } from "@/lib/db"
import { genreUsage, removeGenre, renameGenre, type GenreUsage } from "@/lib/genres"
import { normalize } from "@/lib/text"
import { useFiltersStore } from "@/store/useFiltersStore"
import type { Book } from "@/lib/types"
import { useLibraryStore } from "@/store/useLibraryStore"

export const GenresPage = () => {
  const books = useLibraryStore((s) => s.books)
  const [query, setQuery] = useState("")

  const { rows, withoutGenre } = useMemo(() => genreUsage(books), [books])

  const visible = rows.filter((r) => normalize(r.name).includes(normalize(query)))

  return (
    <div className="pb-4">
      <section className="mb-8 rounded-[1.75rem] bg-sage px-7 py-9">
        <h1 className="font-serif text-4xl leading-tight font-bold text-burgundy">Géneros</h1>
        <Squiggle className="mt-2 text-burgundy" />
        <p className="mt-3 max-w-lg text-sm text-on-color">
          Renombra, une o borra géneros: el cambio se aplica a todos sus libros (un libro puede tener varios). Si
          renombras uno con el nombre de otro que ya existe, se juntan en uno solo.
        </p>
        <p className="mt-2 text-sm text-on-color/85">
          {rows.length} {rows.length === 1 ? "género" : "géneros"} · {withoutGenre}{" "}
          {withoutGenre === 1 ? "libro" : "libros"} sin género
        </p>
      </section>

      <GenreTagger />

      {rows.length > 6 && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar género…"
          className="mx-auto mb-5 max-w-sm rounded-full"
        />
      )}

      {rows.length === 0 ? (
        <p className="text-center text-muted-foreground">Aún no hay géneros. Se crean al añadir o importar libros.</p>
      ) : (
        <ul className="mx-auto flex max-w-2xl flex-col gap-2">
          {visible.map((row) => (
            <GenreItem key={row.name} row={row} existing={rows} />
          ))}
        </ul>
      )}
    </div>
  )
}

const GenreItem = ({ row, existing }: { row: GenreUsage; existing: GenreUsage[] }) => {
  const navigate = useNavigate()
  const setGenreFilter = useFiltersStore((s) => s.setGenres)
  const books = useLibraryStore((s) => s.books)
  const setReadFilter = useFiltersStore((s) => s.setRead)
  const setText = useFiltersStore((s) => s.setText)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(row.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const target = existing.find((r) => r.name !== row.name && normalize(r.name) === normalize(name))

  const updateRowBooks = async (change: (book: Book) => string[] | undefined) => {
    const ids = new Set(row.ids)
    setBusy(true)
    try {
      await updateEachBook(books.filter((b) => ids.has(b.id)).map((b) => ({ id: b.id, patch: { genres: change(b) } })))
    } finally {
      setBusy(false)
    }
  }

  const handleRename = async () => {
    const next = target?.name ?? name.trim()
    if (!next || next === row.name) {
      setEditing(false)
      return
    }
    await updateRowBooks((b) => renameGenre(b, row.name, next))
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await updateRowBooks((b) => removeGenre(b, row.name))
  }

  const showBooks = () => {
    setText("")
    setReadFilter("all")
    setGenreFilter([row.name])
    navigate("/")
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-2xl bg-card px-4 py-3">
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleRename()
          }}
          className="flex flex-1 flex-wrap items-center gap-2"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
            autoFocus
            className="h-9 min-w-40 flex-1"
          />
          <Button type="submit" size="icon-sm" disabled={busy} aria-label="Guardar nombre" className="rounded-full">
            <Check />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cancelar"
            onClick={() => {
              setEditing(false)
              setName(row.name)
            }}
          >
            <X />
          </Button>
          {target && <p className="w-full text-xs text-muted-foreground">Se unirá con «{target.name}».</p>}
        </form>
      ) : (
        <>
          <span className="font-serif text-lg font-bold text-burgundy">{row.name}</span>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {row.ids.length}
          </span>
          <div className="-ml-2 flex w-full flex-wrap gap-1 sm:ml-auto sm:w-auto">
            <Button variant="ghost" size="sm" onClick={showBooks} className="rounded-full">
              <Eye /> Ver
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="rounded-full">
              <Pencil /> Renombrar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy} className="rounded-full">
              <Trash2 /> {confirmDelete ? "¿Seguro?" : "Borrar"}
            </Button>
          </div>
        </>
      )}
    </li>
  )
}
