import { useMemo } from "react"
import { findDuplicateGroups } from "@/lib/duplicates"
import { useLibraryStore } from "@/store/useLibraryStore"

export const useDuplicateGroups = () => {
  const books = useLibraryStore((s) => s.books)
  return useMemo(() => findDuplicateGroups(books), [books])
}
