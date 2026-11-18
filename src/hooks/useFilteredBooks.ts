import { useDeferredValue, useMemo } from "react"
import { filterBooks } from "@/lib/search"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useLibraryStore } from "@/store/useLibraryStore"

export const useFilteredBooks = () => {
  const books = useLibraryStore((s) => s.books)

  const text = useDeferredValue(useFiltersStore((s) => s.text))
  const read = useFiltersStore((s) => s.read)
  const genres = useFiltersStore((s) => s.genres)
  const sort = useFiltersStore((s) => s.sort)

  return useMemo(() => filterBooks(books, { text, read, genres, sort }), [books, text, read, genres, sort])
}
