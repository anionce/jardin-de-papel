import { useId, useState, type KeyboardEvent } from "react"
import { Plus, X } from "lucide-react"
import { cleanGenres } from "@/lib/genres"
import { cn } from "@/lib/utils"

interface Props {
  value: string[]
  onChange: (genres: string[]) => void

  options: string[]
  placeholder?: string
  className?: string
}

export const GenresInput = ({ value, onChange, options, placeholder = "Añade un género…", className }: Props) => {
  const [draft, setDraft] = useState("")
  const listId = useId()

  const add = (text = draft) => {
    const next = cleanGenres([...value, ...text.split(",")])
    if (next.length !== value.length) onChange(next)
    setDraft("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      add()
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className
      )}
    >
      {value.map((genre) => (
        <span key={genre} className="inline-flex items-center gap-1 rounded-full bg-sage/45 py-0.5 pr-1 pl-2.5 text-[13px] font-medium">
          {genre}
          <button
            type="button"
            onClick={() => onChange(value.filter((g) => g !== genre))}
            aria-label={`Quitar ${genre}`}
            className="cursor-pointer rounded-full p-0.5 hover:bg-black/10"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => {
          const text = e.target.value
          if (options.includes(text) && !value.includes(text)) add(text)
          else setDraft(text)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => draft.trim() && add()}
        list={listId}
        placeholder={value.length === 0 ? placeholder : ""}
        className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        autoComplete="off"
      />
      {draft.trim() && (
        <button
          type="button"
          onClick={() => add()}
          aria-label="Añadir género"
          className="cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
      )}
      <datalist id={listId}>
        {options
          .filter((o) => !value.includes(o))
          .map((o) => (
            <option key={o} value={o} />
          ))}
      </datalist>
    </div>
  )
}
