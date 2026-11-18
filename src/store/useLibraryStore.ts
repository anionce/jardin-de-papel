import { create } from "zustand"
import type { Book } from "@/lib/types"

interface LibraryState {
  books: Book[]
  loaded: boolean
  error: string | null
  setBooks: (books: Book[]) => void
  setError: (error: string | null) => void
}

export const useLibraryStore = create<LibraryState>()((set) => ({
  books: [],
  loaded: false,
  error: null,
  setBooks: (books) => set({ books, loaded: true, error: null }),
  setError: (error) => set({ error, loaded: true }),
}))
