import { Loader2, X } from "lucide-react"
import { BookCover } from "@/components/library/BookCover"
import type { BookSuggestion } from "@/lib/bookLookup"

interface Props {
  loading: boolean
  suggestions: BookSuggestion[]
  onPick: (book: BookSuggestion) => void
  onClose: () => void
}

export const BookSuggestions = ({ loading, suggestions, onPick, onClose }: Props) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-2 sm:col-span-2">
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          {suggestions.length > 0
            ? "¿Es alguno de estos? Púlsalo para rellenar los datos"
            : loading
              ? "Buscando…"
              : "No he encontrado nada; puedes rellenarlo a mano"}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar sugerencias"
          className="cursor-pointer rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      {suggestions.length > 0 && (
        <ul className="flex max-h-72 flex-col overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onPick(s)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-sage/30"
              >
                <BookCover
                  book={{ id: s.id, title: s.title, author: s.author, coverUrl: s.coverUrl, coverChecked: true, read: false, createdAt: 0 }}
                  className="w-9 shrink-0"
                />
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-semibold">{s.title}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {[s.author, s.publisher, s.year].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
