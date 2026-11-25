import { useDeferredValue, useMemo } from "react"
import { filterBooks } from "@/lib/search"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useLibraryStore } from "@/store/useLibraryStore"
import { useSettingsStore } from "@/store/useSettingsStore"

export const useFilteredBooks = () => {
  const books = useLibraryStore((s) => s.books)

  const text = useDeferredValue(useFiltersStore((s) => s.text))
  const read = useFiltersStore((s) => s.read)
  const genres = useFiltersStore((s) => s.genres)
  const sort = useFiltersStore((s) => s.sort)
  const person = useFiltersStore((s) => s.person)
  const shelf = useFiltersStore((s) => s.shelf)
  const settings = useSettingsStore((s) => s.settings)

  return useMemo(
    () => filterBooks(books, { text, read, genres, sort, person, shelf, settings }),
    [books, text, read, genres, sort, person, shelf, settings]
  )
}
