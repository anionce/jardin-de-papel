import { create } from "zustand"
import { initialSettings } from "@/lib/people"
import type { LibrarySettings } from "@/lib/types"

interface SettingsState {
  settings: LibrarySettings
  memberPerson?: string
  setSettings: (settings: LibrarySettings) => void
  setMemberPerson: (memberPerson: string | undefined) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: initialSettings(),
  setSettings: (settings) => set({ settings }),
  setMemberPerson: (memberPerson) => set({ memberPerson }),
}))
