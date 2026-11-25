import { memo } from "react"
import { Link } from "react-router-dom"
import { BookMarked, Check, MapPin } from "lucide-react"
import { BookCover } from "@/components/library/BookCover"
import { updateBook } from "@/lib/db"
import { bookPerson, hasSeveralPeople } from "@/lib/people"
import { bookShelf } from "@/lib/shelves"
import { hashString } from "@/lib/text"
import { cn } from "@/lib/utils"
import type { Book } from "@/lib/types"
import { useBookFormStore } from "@/store/useBookFormStore"
import { useSelectionStore } from "@/store/useSelectionStore"
import { useSettingsStore } from "@/store/useSettingsStore"

const ARCH_COLORS = ["bg-blush/70", "bg-mustard/35", "bg-sage/45", "bg-coral/35", "bg-secondary"]

export const BookCard = memo(({ book }: { book: Book }) => {
  const openEdit = useBookFormStore((s) => s.openEdit)
  const selecting = useSelectionStore((s) => s.active)
  const selected = useSelectionStore((s) => s.ids.has(book.id))
  const toggle = useSelectionStore((s) => s.toggle)
  const settings = useSettingsStore((s) => s.settings)
  const owner = hasSeveralPeople(settings) ? bookPerson(book, settings) : undefined
  const place = [bookShelf(book, settings), book.location].filter(Boolean).join(" · ")
  const meta = [book.year, book.publisher, book.pages && `${book.pages} págs.`].filter(Boolean).join(" · ")

  return (
    <article className="group flex flex-col items-center text-center">
      <button
        type="button"
        onClick={() => (selecting ? toggle(book.id) : openEdit(book))}
        aria-label={selecting ? `Seleccionar ${book.title ?? "libro"}` : `Editar ${book.title ?? "libro"}`}
        aria-pressed={selecting ? selected : undefined}
        className={cn(
          "relative flex aspect-[4/5] w-full cursor-pointer items-end justify-center rounded-t-full rounded-b-2xl px-[22%] pb-5 transition-all",
          ARCH_COLORS[hashString(book.id) % ARCH_COLORS.length],
          selecting ? "ring-offset-2 ring-offset-paper" : "group-hover:-translate-y-1",
          selected && "ring-3 ring-burgundy"
        )}
      >
        <BookCover book={book} className={cn("w-full transition-opacity", selecting && !selected && "opacity-70")} />
        {selecting && (
          <span
            className={cn(
              "absolute top-[18%] right-[12%] flex size-7 items-center justify-center rounded-full border-2 shadow-md",
              selected ? "border-burgundy bg-burgundy text-on-color" : "border-paper bg-paper/80"
            )}
          >
            {selected && <Check className="size-4" />}
          </span>
        )}
      </button>

      <h3 className="mt-3 line-clamp-2 font-serif text-[15px] leading-snug font-bold text-burgundy">
        {book.title ?? <span className="italic opacity-60">Sin título</span>}
      </h3>
      {book.author && (
        <Link
          to={`/autor/${encodeURIComponent(book.author)}`}
          className="mt-0.5 line-clamp-1 text-[13px] text-foreground/80 underline-offset-2 hover:text-burgundy hover:underline"
        >
          {book.author}
        </Link>
      )}
      {meta && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{meta}</p>}
      {owner && <p className="mt-0.5 text-[11px] font-semibold text-sage-deep">De {owner}</p>}
      {place && (
        <p className="mt-0.5 inline-flex max-w-full items-center gap-0.5 text-[11px] text-muted-foreground">
          <MapPin className="size-3 shrink-0" /> <span className="line-clamp-1">{place}</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => updateBook(book.id, { read: !book.read })}
        disabled={selecting}
        className={cn(
          "mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default",
          book.read
            ? "bg-sage-deep text-on-color hover:bg-sage-deep/85"
            : "border border-border text-muted-foreground hover:border-sage-deep hover:text-sage-deep"
        )}
        title={book.read ? "Marcar como no leído" : "Marcar como leído"}
      >
        {book.read ? <Check className="size-3" /> : <BookMarked className="size-3" />}
        {book.read ? "Leído" : "Por leer"}
      </button>
    </article>
  )
})
