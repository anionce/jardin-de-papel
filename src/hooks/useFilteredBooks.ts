import { useDeferredValue, useMemo } from "react"
import { filterBooks } from "@/lib/search"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useLibraryStore } from "@/store/useLibraryStore"

export function useFilteredBooks() {
  const books = useLibraryStore((s) => s.books)
  // Lo escrito se aplica sin bloquear el teclado: con muchos libros, filtrar
  // y pintar la rejilla puede ir un poco por detrás de lo que tecleas.
  const text = useDeferredValue(useFiltersStore((s) => s.text))
  const read = useFiltersStore((s) => s.read)
  const genres = useFiltersStore((s) => s.genres)
  const sort = useFiltersStore((s) => s.sort)

  return useMemo(() => filterBooks(books, { text, read, genres, sort }), [books, text, read, genres, sort])
}
