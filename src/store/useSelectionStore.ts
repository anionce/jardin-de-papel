import { create } from "zustand"

interface SelectionState {
  active: boolean
  ids: Set<string>
  start: () => void
  stop: () => void
  toggle: (id: string) => void
  setMany: (ids: string[]) => void
  clear: () => void
}

/** Modo "Seleccionar" de la estantería: marcar varios libros y actuar sobre todos. */
export const useSelectionStore = create<SelectionState>()((set) => ({
  active: false,
  ids: new Set(),
  start: () => set({ active: true, ids: new Set() }),
  stop: () => set({ active: false, ids: new Set() }),
  toggle: (id) =>
    set((state) => {
      const ids = new Set(state.ids)
      if (ids.has(id)) ids.delete(id)
      else ids.add(id)
      return { ids }
    }),
  setMany: (ids) => set({ ids: new Set(ids) }),
  clear: () => set({ ids: new Set() }),
}))
