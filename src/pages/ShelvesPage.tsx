import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Camera, Check, ImageOff, Library, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { Squiggle } from "@/components/decor/Flower"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateEachBook } from "@/lib/db"
import { locationPhotoToDataUrl } from "@/lib/image"
import { saveSettings } from "@/lib/settings"
import {
  addShelf,
  countBooksByShelf,
  findShelf,
  removeShelf,
  removeShelfPatches,
  renameShelf,
  renameShelfPatches,
  setShelfPhoto,
  shelvesOf,
} from "@/lib/shelves"
import type { LibrarySettings, Shelf } from "@/lib/types"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useLibraryStore } from "@/store/useLibraryStore"
import { useSettingsStore } from "@/store/useSettingsStore"

const bookCount = (n: number) => `${n} ${n === 1 ? "libro" : "libros"}`

export const ShelvesPage = () => {
  const books = useLibraryStore((s) => s.books)
  const settings = useSettingsStore((s) => s.settings)
  const counts = useMemo(() => countBooksByShelf(books, settings), [books, settings])
  const shelves = shelvesOf(settings)

  return (
    <div className="pb-4">
      <section className="mb-8 rounded-[1.75rem] bg-mustard/40 px-7 py-9">
        <h1 className="font-serif text-4xl leading-tight font-bold text-burgundy">Estanterías</h1>
        <Squiggle className="mt-2 text-burgundy" />
        <p className="mt-3 max-w-lg text-sm text-foreground/85">
          Añade tus estanterías con una foto. Luego, en cada libro, elige en cuál está.
        </p>
      </section>

      {shelves.length === 0 && (
        <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-muted-foreground">Todavía no hay estanterías.</p>
      )}
      <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shelves.map((shelf) => (
          <ShelfItem key={shelf.name} shelf={shelf} bookCount={counts.get(shelf.name) ?? 0} settings={settings} />
        ))}
      </ul>

      <AddShelfForm settings={settings} />
    </div>
  )
}

interface ShelfItemProps {
  shelf: Shelf
  bookCount: number
  settings: LibrarySettings
}

const ShelfItem = ({ shelf, bookCount: count, settings }: ShelfItemProps) => {
  const books = useLibraryStore((s) => s.books)
  const resetFilters = useFiltersStore((s) => s.reset)
  const setShelf = useFiltersStore((s) => s.setShelf)
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(shelf.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clash = findShelf(settings, name)
  const nameTaken = Boolean(clash && clash.name !== shelf.name)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch {
      setError("No se ha podido guardar. Prueba otra vez.")
    } finally {
      setBusy(false)
    }
  }

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    void run(async () => saveSettings(setShelfPhoto(settings, shelf.name, await locationPhotoToDataUrl(file))))
  }

  const handleRename = (e: FormEvent) => {
    e.preventDefault()
    const next = name.trim()
    if (!next || nameTaken || next === shelf.name) {
      setEditing(false)
      return
    }
    void run(async () => {
      await updateEachBook(renameShelfPatches(books, shelf.name, next))
      await saveSettings(renameShelf(settings, shelf.name, next))
    })
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    void run(async () => {
      await updateEachBook(removeShelfPatches(books, shelf.name))
      await saveSettings(removeShelf(settings, shelf.name))
    })
  }

  const showBooks = () => {
    resetFilters()
    setShelf(shelf.name)
    navigate("/")
  }

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl bg-card">
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={busy}
        aria-label={shelf.photo ? `Cambiar la foto de ${shelf.name}` : `Añadir una foto de ${shelf.name}`}
        className="relative flex aspect-[4/3] cursor-pointer items-center justify-center bg-secondary"
      >
        {shelf.photo ? (
          <img src={shelf.photo} alt={`Estantería ${shelf.name}`} className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
            <Camera className="size-6" /> Añadir foto
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-paper/60">
            <Loader2 className="size-6 animate-spin text-burgundy" />
          </span>
        )}
      </button>
      <input ref={fileInput} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />

      <div className="flex flex-col gap-2 p-3">
        {editing ? (
          <form onSubmit={handleRename} className="flex items-center gap-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.target.select()}
              aria-label="Nuevo nombre"
              autoFocus
              className="h-9 min-w-0 flex-1"
            />
            <Button type="submit" size="icon-sm" disabled={busy || nameTaken} aria-label="Guardar nombre" className="rounded-full">
              <Check />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Cancelar"
              onClick={() => {
                setEditing(false)
                setName(shelf.name)
              }}
            >
              <X />
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-serif text-lg font-bold text-burgundy">{shelf.name}</span>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {bookCount(count)}
            </span>
          </div>
        )}
        {nameTaken && <p className="text-xs text-destructive">Ya hay una estantería con ese nombre.</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="-ml-2 flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={showBooks} disabled={count === 0} className="rounded-full">
            <Library /> Ver libros
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="rounded-full">
            <Pencil /> Renombrar
          </Button>
          {shelf.photo && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void run(() => saveSettings(setShelfPhoto(settings, shelf.name, undefined)))}
              className="rounded-full"
            >
              <ImageOff /> Quitar foto
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy} className="rounded-full">
            <Trash2 /> {confirmDelete ? "¿Seguro? Sus libros quedan sin estantería" : "Quitar"}
          </Button>
        </div>
      </div>
    </li>
  )
}

const AddShelfForm = ({ settings }: { settings: LibrarySettings }) => {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const taken = Boolean(findShelf(settings, name))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || taken) return
    setBusy(true)
    try {
      await saveSettings(addShelf(settings, name))
      setName("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Salón izquierda, dormitorio…"
        aria-label="Nombre de la estantería"
        className="h-10 min-w-48 flex-1 rounded-full"
      />
      <Button type="submit" disabled={busy || !name.trim() || taken} className="h-10 rounded-full px-5">
        <Plus /> Añadir estantería
      </Button>
      {taken && <p className="w-full text-xs text-destructive">Esa estantería ya existe.</p>}
    </form>
  )
}
