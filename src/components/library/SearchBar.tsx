import { Search, X } from "lucide-react"
import { useFiltersStore } from "@/store/useFiltersStore"

export function SearchBar() {
  const text = useFiltersStore((s) => s.text)
  const setText = useFiltersStore((s) => s.setText)

  return (
    <label className="relative flex w-full max-w-md items-center">
      <Search className="absolute left-4 size-4 text-muted-foreground" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Busca por título, autor, editorial, año…"
        aria-label="Buscar libros"
        className="h-12 w-full rounded-full bg-paper pr-11 pl-11 text-[15px] text-foreground shadow-md shadow-black/15 outline-none placeholder:text-muted-foreground/80 focus-visible:ring-3 focus-visible:ring-mustard/60 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
          aria-label="Borrar búsqueda"
          className="absolute right-3 cursor-pointer rounded-full p-1 text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      )}
    </label>
  )
}
