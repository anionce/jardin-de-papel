import { useState } from "react"
import { Check, Copy, Languages, Loader2, Trash2, X } from "lucide-react"
import { Squiggle } from "@/components/decor/Flower"
import { BookCover } from "@/components/library/BookCover"
import { Button } from "@/components/ui/button"
import { useDuplicateGroups } from "@/hooks/useDuplicateGroups"
import { removeBook, removeBooks, updateBook } from "@/lib/db"
import { mergeMissingFields, type DuplicateGroup } from "@/lib/duplicates"
import { cn } from "@/lib/utils"
import type { Book } from "@/lib/types"

export function DuplicatesPage() {
  const groups = useDuplicateGroups()

  return (
    <div className="pb-4">
      <section className="mb-8 rounded-[1.75rem] bg-mustard/45 px-7 py-9">
        <h1 className="font-serif text-3xl leading-tight font-bold break-words text-burgundy sm:text-4xl">Posibles duplicados</h1>
        <Squiggle className="mt-2 text-burgundy" />
        <p className="mt-3 max-w-xl text-sm text-foreground/85">
          Libros que parecen el mismo, aunque estén en otro idioma u otra edición. Elige con cuál te quedas (lo que le
          falte se completa con los datos del otro) o marca que no son duplicados.
        </p>
      </section>

      {groups.length === 0 ? (
        <p className="py-10 text-center font-serif text-xl text-burgundy">No hay duplicados a la vista. ✿</p>
      ) : (
        <ul className="mx-auto flex max-w-3xl flex-col gap-4">
          {groups.map((group) => (
            <GroupCard key={group.books.map((b) => b.id).join("|")} group={group} />
          ))}
        </ul>
      )}
    </div>
  )
}

function GroupCard({ group }: { group: DuplicateGroup }) {
  const [busy, setBusy] = useState(false)
  /** Libro elegido para quedarse, a la espera de confirmar el borrado del resto. */
  const [keepId, setKeepId] = useState<string | null>(null)
  const others = group.books.filter((b) => b.id !== keepId)

  async function confirmKeep() {
    const book = group.books.find((b) => b.id === keepId)
    if (!book) return
    setBusy(true)
    const patch = mergeMissingFields(book, others)
    if (Object.keys(patch).length > 0) await updateBook(book.id, patch)
    await removeBooks(others.map((o) => o.id))
  }

  /** Marca `books` como distintos de todos los demás del grupo. */
  async function markDistinct(books: Book[]) {
    setBusy(true)
    const ids = new Set(books.map((b) => b.id))
    await Promise.all(
      group.books.map((b) => {
        const against = ids.has(b.id) ? group.books.filter((o) => o.id !== b.id) : books
        const distinctFrom = [...new Set([...(b.distinctFrom ?? []), ...against.map((o) => o.id)])]
        return updateBook(b.id, { distinctFrom })
      })
    )
    setBusy(false)
  }

  return (
    <li className="rounded-[1.5rem] bg-card p-4 sm:p-5">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {group.reason === "obra" ? <Languages className="size-3.5" /> : <Copy className="size-3.5" />}
        {group.reason === "obra" ? "Misma obra · puede ser otra edición o idioma" : "Mismo autor y mismo título"}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {group.books.map((book) => (
          <BookOption
            key={book.id}
            book={book}
            disabled={busy}
            selected={keepId === book.id}
            onKeep={() => setKeepId(book.id)}
            onNotDuplicate={group.books.length > 2 ? () => markDistinct([book]) : undefined}
          />
        ))}
      </div>

      {keepId ? (
        <div className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm" role="alert">
          <p className="font-semibold">
            Se {others.length === 1 ? "borrará" : "borrarán"} {others.length === 1 ? "este libro" : `estos ${others.length} libros`}:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {others.map((o) => (
              <li key={o.id}>
                «{o.title ?? "Sin título"}»{o.author && ` de ${o.author}`}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setKeepId(null)} disabled={busy} className="rounded-full">
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmKeep} disabled={busy} className="rounded-full">
              {busy ? <Loader2 className="animate-spin" /> : <Trash2 />} Sí, borrar {others.length === 1 ? "el otro" : `los ${others.length}`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => markDistinct(group.books)} disabled={busy} className="rounded-full">
            {busy ? <Loader2 className="animate-spin" /> : <Check />} {group.books.length > 2 ? "Ninguno es duplicado" : "No son duplicados"}
          </Button>
        </div>
      )}
    </li>
  )
}

interface BookOptionProps {
  book: Book
  disabled: boolean
  selected: boolean
  onKeep: () => void
  /** Sólo en grupos de 3 o más: sacar este libro del grupo. */
  onNotDuplicate?: () => void
}

function BookOption({ book, disabled, selected, onKeep, onNotDuplicate }: BookOptionProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const details = [book.year, book.publisher, book.genres?.join(", ")].filter(Boolean).join(" · ")

  return (
    <div className={cn("flex gap-3 rounded-2xl bg-paper p-3", selected && "ring-2 ring-sage-deep")}>
      <BookCover book={book} className="w-16 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="line-clamp-2 font-serif font-bold text-burgundy">{book.title ?? "Sin título"}</p>
        {book.author && <p className="line-clamp-1 text-sm">{book.author}</p>}
        {details && <p className="line-clamp-1 text-xs text-muted-foreground">{details}</p>}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {book.read ? "Leído" : "Por leer"}
          {book.addedBy && ` · añadido por ${book.addedBy}`}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          <Button size="sm" onClick={onKeep} disabled={disabled} className="rounded-full bg-sage-deep text-on-color hover:bg-sage-deep/85">
            <Check /> Quedarme este
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={disabled}
            onClick={() => (confirmDelete ? removeBook(book.id) : setConfirmDelete(true))}
            className={cn("rounded-full", confirmDelete && "bg-destructive text-destructive-foreground")}
          >
            <Trash2 /> {confirmDelete ? "¿Seguro?" : "Borrar"}
          </Button>
          {onNotDuplicate && (
            <Button size="sm" variant="ghost" disabled={disabled} onClick={onNotDuplicate} className="rounded-full">
              <X /> No es duplicado
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
