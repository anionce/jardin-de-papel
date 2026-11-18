import { create } from "zustand"
import type { Book } from "@/lib/types"

interface BookFormState {
  open: boolean
  /** null = libro nuevo */
  editing: Book | null
  openNew: () => void
  openEdit: (book: Book) => void
  close: () => void
}

export const useBookFormStore = create<BookFormState>()((set) => ({
  open: false,
  editing: null,
  openNew: () => set({ open: true, editing: null }),
  openEdit: (book) => set({ open: true, editing: book }),
  close: () => set({ open: false }),
}))
