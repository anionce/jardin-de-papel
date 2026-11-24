import { useEffect } from "react"
import { subscribeSettings } from "@/lib/settings"
import { useSettingsStore } from "@/store/useSettingsStore"

export const useSettingsSync = (enabled: boolean) => {
  const setSettings = useSettingsStore((s) => s.setSettings)

  useEffect(() => {
    if (!enabled) return
    return subscribeSettings(setSettings, () => undefined)
  }, [enabled, setSettings])
}
