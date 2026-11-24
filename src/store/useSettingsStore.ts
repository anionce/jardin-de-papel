import { create } from "zustand"
import { initialSettings } from "@/lib/people"
import type { LibrarySettings } from "@/lib/types"

interface SettingsState {
  settings: LibrarySettings
  setSettings: (settings: LibrarySettings) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: initialSettings(),
  setSettings: (settings) => set({ settings }),
}))
