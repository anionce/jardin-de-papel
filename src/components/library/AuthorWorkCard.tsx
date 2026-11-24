import { Check, ExternalLink } from "lucide-react"
import { BookCover } from "@/components/library/BookCover"
import type { AuthorWork } from "@/lib/authorWorks"

interface AuthorWorkCardProps {
  work: AuthorWork
  author: string
  onOwned: () => void
}

export const AuthorWorkCard = ({ work, author, onOwned }: AuthorWorkCardProps) => {
  return (
    <article className="flex flex-col items-center text-center">
      <BookCover
        book={{ id: work.key, title: work.title, author, coverUrl: work.coverUrl, coverChecked: true, read: false, createdAt: 0 }}
        className="w-24 sm:w-28"
      />
      <h3 className="mt-3 line-clamp-2 font-serif text-[15px] leading-snug font-bold text-burgundy">{work.title}</h3>
      {work.spanishTitle && <p className="mt-0.5 line-clamp-2 text-xs text-foreground/80">En español: «{work.spanishTitle}»</p>}
      {work.year && <p className="mt-0.5 text-xs text-muted-foreground">{work.year}</p>}
      <a
        href={work.buyUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:border-sage-deep hover:text-sage-deep"
      >
        <ExternalLink className="size-3" /> Buscar en librerías
      </a>
      <button
        type="button"
        onClick={onOwned}
        className="mt-1.5 inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
      >
        <Check className="size-3" /> Ya lo tengo
      </button>
    </article>
  )
}
