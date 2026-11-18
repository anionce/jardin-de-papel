import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { normalize } from "@/lib/text"
import { cn } from "@/lib/utils"
import type { ReadFilter, SortKey } from "@/lib/types"
import { useFiltersStore } from "@/store/useFiltersStore"

const READ_OPTIONS: { value: ReadFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "read", label: "Leídos" },
  { value: "unread", label: "Por leer" },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent-desc", label: "Añadidos: recientes primero" },
  { value: "recent-asc", label: "Añadidos: antiguos primero" },
  { value: "title-asc", label: "Título (A–Z)" },
  { value: "title-desc", label: "Título (Z–A)" },
  { value: "author-asc", label: "Autor (A–Z)" },
  { value: "author-desc", label: "Autor (Z–A)" },
  { value: "year-desc", label: "Año: nuevos primero" },
  { value: "year-asc", label: "Año: antiguos primero" },
  { value: "pages-desc", label: "Páginas: más largos primero" },
  { value: "pages-asc", label: "Páginas: más cortos primero" },
]

const selectClass =
  "h-9 cursor-pointer rounded-full border border-border bg-background px-3.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/20"

export function LibraryFilters({ genres }: { genres: string[] }) {
  const { read, sort, setRead, setSort } = useFiltersStore()

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <div className="flex gap-1 rounded-full bg-secondary p-1">
        {READ_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRead(option.value)}
            className={cn(
              "cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              read === option.value ? "bg-burgundy text-on-color" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {genres.length > 0 && <GenreFilter genres={genres} />}

      <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar" className={selectClass}>
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function GenreFilter({ genres }: { genres: string[] }) {
  const selected = useFiltersStore((s) => s.genres)
  const toggleGenre = useFiltersStore((s) => s.toggleGenre)
  const setGenres = useFiltersStore((s) => s.setGenres)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const visible = genres.filter((g) => normalize(g).includes(normalize(query)))
  const label =
    selected.length === 0 ? "Todos los géneros" : selected.length === 1 ? selected[0] : `${selected.length} géneros`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(selectClass, "inline-flex max-w-56 items-center gap-1.5", selected.length > 0 && "border-burgundy text-burgundy")}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </button>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => setGenres([])}
          aria-label="Quitar filtro de géneros"
          className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-burgundy text-on-color"
        >
          <X className="size-3" />
        </button>
      )}
      {open && (
        <div className="absolute top-11 left-1/2 z-30 w-64 -translate-x-1/2 rounded-2xl border border-border bg-paper p-2 text-left shadow-xl shadow-black/15">
          {genres.length > 8 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar género…"
              autoFocus
              className="mb-1 h-8 w-full rounded-full border border-border bg-background px-3 text-sm outline-none"
            />
          )}
          <ul className="max-h-64 overflow-y-auto">
            {visible.map((genre) => {
              const checked = selected.includes(genre)
              return (
                <li key={genre}>
                  <button
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    aria-pressed={checked}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-secondary"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        checked ? "border-burgundy bg-burgundy text-on-color" : "border-border"
                      )}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{genre}</span>
                  </button>
                </li>
              )
            })}
            {visible.length === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">Ningún género</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
