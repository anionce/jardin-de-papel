import { useMemo } from "react"
import { findDuplicateGroups } from "@/lib/duplicates"
import { useLibraryStore } from "@/store/useLibraryStore"

export function useDuplicateGroups() {
  const books = useLibraryStore((s) => s.books)
  return useMemo(() => findDuplicateGroups(books), [books])
}
