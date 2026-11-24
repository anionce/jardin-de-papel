import { useMemo, useState, type FormEvent } from "react"
import { Check, Pencil, Plus, Star, Trash2, X } from "lucide-react"
import { Squiggle } from "@/components/decor/Flower"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateEachBook } from "@/lib/db"
import {
  addPerson,
  countBooksByPerson,
  findPerson,
  removePerson,
  removePersonPatches,
  renamePerson,
  renamePersonPatches,
  setDefaultPerson,
} from "@/lib/people"
import { saveSettings } from "@/lib/settings"
import type { LibrarySettings } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useLibraryStore } from "@/store/useLibraryStore"
import { useSettingsStore } from "@/store/useSettingsStore"

export const PeoplePage = () => {
  const books = useLibraryStore((s) => s.books)
  const settings = useSettingsStore((s) => s.settings)
  const counts = useMemo(() => countBooksByPerson(books, settings), [books, settings])

  return (
    <div className="pb-4">
      <section className="mb-8 rounded-[1.75rem] bg-blush/70 px-7 py-9">
        <h1 className="font-serif text-4xl leading-tight font-bold text-burgundy">Personas</h1>
        <Squiggle className="mt-2 text-burgundy" />
        <p className="mt-3 max-w-lg text-sm text-foreground/85">
          Quién comparte esta biblioteca. Cada libro es de una persona; la marcada con la estrella es la de por defecto:
          los libros nuevos y los que no tienen a nadie asignado son suyos.
        </p>
      </section>

      <ul className="mx-auto flex max-w-2xl flex-col gap-2">
        {settings.people.map((person) => (
          <PersonItem key={person} person={person} bookCount={counts.get(person) ?? 0} settings={settings} />
        ))}
      </ul>

      <AddPersonForm settings={settings} />
    </div>
  )
}

interface PersonItemProps {
  person: string
  bookCount: number
  settings: LibrarySettings
}

const PersonItem = ({ person, bookCount, settings }: PersonItemProps) => {
  const books = useLibraryStore((s) => s.books)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(person)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const isDefault = settings.defaultPerson === person
  const isOnlyPerson = settings.people.length === 1
  const clash = findPerson(settings, name)
  const nameTaken = Boolean(clash && clash !== person)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  const handleRename = (e: FormEvent) => {
    e.preventDefault()
    const next = name.trim()
    if (!next || nameTaken || next === person) {
      setEditing(false)
      return
    }
    void run(async () => {
      await updateEachBook(renamePersonPatches(books, person, next))
      await saveSettings(renamePerson(settings, person, next))
    })
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    const after = removePerson(settings, person)
    void run(async () => {
      await updateEachBook(removePersonPatches(books, person, after))
      await saveSettings(after)
    })
  }

  if (editing) {
    return (
      <li className="rounded-2xl bg-card px-4 py-3">
        <form onSubmit={handleRename} className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
            aria-label="Nuevo nombre"
            autoFocus
            className="h-9 min-w-40 flex-1"
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
              setName(person)
            }}
          >
            <X />
          </Button>
          {nameTaken && <p className="w-full text-xs text-destructive">Ya hay alguien con ese nombre.</p>}
        </form>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-2xl bg-card px-4 py-3">
      <button
        type="button"
        onClick={() => void run(() => saveSettings(setDefaultPerson(settings, person)))}
        disabled={busy || isDefault}
        aria-label={isDefault ? `${person} es la persona por defecto` : `Hacer a ${person} la persona por defecto`}
        className="cursor-pointer rounded-full p-1 disabled:cursor-default"
      >
        <Star className={cn("size-5", isDefault ? "fill-mustard text-mustard" : "text-muted-foreground")} />
      </button>
      <span className="font-serif text-lg font-bold text-burgundy">{person}</span>
      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
        {bookCount} {bookCount === 1 ? "libro" : "libros"}
      </span>
      <div className="-ml-2 flex w-full flex-wrap gap-1 sm:ml-auto sm:w-auto">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="rounded-full">
          <Pencil /> Renombrar
        </Button>
        {!isOnlyPerson && (
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy} className="rounded-full">
            <Trash2 /> {confirmDelete ? "¿Seguro? Sus libros pasan a la de por defecto" : "Quitar"}
          </Button>
        )}
      </div>
    </li>
  )
}

const AddPersonForm = ({ settings }: { settings: LibrarySettings }) => {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const taken = Boolean(findPerson(settings, name))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || taken) return
    setBusy(true)
    try {
      await saveSettings(addPerson(settings, name))
      setName("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de otra persona"
        aria-label="Nombre de otra persona"
        className="h-10 min-w-48 flex-1 rounded-full"
      />
      <Button type="submit" disabled={busy || !name.trim() || taken} className="h-10 rounded-full px-5">
        <Plus /> Añadir persona
      </Button>
      {taken && <p className="w-full text-xs text-destructive">Esa persona ya está en la lista.</p>}
    </form>
  )
}
