import { useState } from "react"
import { Flower } from "@/components/decor/Flower"
import { hashString } from "@/lib/text"
import { cn } from "@/lib/utils"
import type { Book } from "@/lib/types"

const COVER_STYLES = [
  { bg: "var(--burgundy)", fg: "var(--on-color)", flower: "var(--blush)" },
  { bg: "var(--sage-deep)", fg: "var(--on-color)", flower: "var(--mustard)" },
  { bg: "var(--coral)", fg: "var(--on-color)", flower: "var(--paper)" },
  { bg: "var(--mustard)", fg: "#3B2226", flower: "var(--coral)" },
  { bg: "#F3E2CC", fg: "var(--burgundy)", flower: "var(--sage)" },
]

const coverSource = (book: Book): string | undefined => {
  if (book.coverUrl) return book.coverUrl
  if (book.isbn && !book.coverChecked) return `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg?default=false`
  return undefined
}

export const BookCover = ({ book, className }: { book: Book; className?: string }) => {
  const src = coverSource(book)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt={book.title ?? "Portada"}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={cn("aspect-[2/3] rounded-md bg-secondary object-cover shadow-lg shadow-black/20", className)}
      />
    )
  }

  const style = COVER_STYLES[hashString(book.id) % COVER_STYLES.length]
  return (
    <div
      className={cn(
        "relative flex aspect-[2/3] flex-col overflow-hidden rounded-md p-2.5 shadow-lg shadow-black/20",
        className
      )}
      style={{ background: style.bg, color: style.fg }}
    >
      <span className="absolute inset-y-0 left-1.5 w-px bg-current opacity-25" />
      <p className="line-clamp-4 font-serif text-[13px] leading-tight font-bold">{book.title ?? "Sin título"}</p>
      {book.author && <p className="mt-1 line-clamp-2 text-[9.5px] leading-tight opacity-80">{book.author}</p>}
      <Flower petal={style.flower} className="absolute -right-3 -bottom-3 w-12 opacity-90" />
    </div>
  )
}
