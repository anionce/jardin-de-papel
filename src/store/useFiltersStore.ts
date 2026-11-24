import { create } from "zustand"
import { persist } from "zustand/middleware"
import { DEFAULT_SORT } from "@/lib/search"
import type { ReadFilter, SortKey } from "@/lib/types"

interface FiltersState {
  text: string
  read: ReadFilter
  genres: string[]
  sort: SortKey
  person: string | null
  setPerson: (person: string | null) => void
  setText: (text: string) => void
  setRead: (read: ReadFilter) => void
  setGenres: (genres: string[]) => void
  toggleGenre: (genre: string) => void
  setSort: (sort: SortKey) => void
  reset: () => void
}

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      text: "",
      read: "all",
      genres: [],
      sort: DEFAULT_SORT,
      person: null,
      setPerson: (person) => set({ person }),
      setText: (text) => set({ text }),
      setRead: (read) => set({ read }),
      setGenres: (genres) => set({ genres }),
      toggleGenre: (genre) =>
        set((s) => ({ genres: s.genres.includes(genre) ? s.genres.filter((g) => g !== genre) : [...s.genres, genre] })),
      setSort: (sort) => set({ sort }),
      reset: () => set({ text: "", read: "all", genres: [], person: null }),
    }),
    {
      name: "biblioteca-filters",
      version: 2,
      migrate: (persisted, version) => {
        const old = persisted as Partial<FiltersState> & { genre?: string | null }
        const { genre, ...rest } = old
        return {
          ...rest,
          sort: version < 1 ? DEFAULT_SORT : rest.sort,
          genres: rest.genres ?? (genre ? [genre] : []),
        } as FiltersState
      },
      partialize: ({ read, genres, sort, person }) => ({ read, genres, sort, person }),
    }
  )
)
