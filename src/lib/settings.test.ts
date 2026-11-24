import { describe, expect, it } from "vitest"
import { FALLBACK_PERSON_NAME } from "@/lib/people"
import { saveSettings, subscribeSettings } from "@/lib/settings"
import type { LibrarySettings } from "@/lib/types"

const latestSettings = () => {
  let settings: LibrarySettings | null = null
  const unsubscribe = subscribeSettings(
    (next) => (settings = next),
    () => undefined
  )
  return { get: () => settings, unsubscribe }
}

describe("settings in local mode", () => {
  it("starts with a single default person", () => {
    const current = latestSettings()
    expect(current.get()).toEqual({ people: [FALLBACK_PERSON_NAME], defaultPerson: FALLBACK_PERSON_NAME })
    current.unsubscribe()
  })

  it("saves and notifies subscribers", async () => {
    const current = latestSettings()
    await saveSettings({ people: ["Alex", "Sam"], defaultPerson: "Sam" })
    expect(current.get()).toEqual({ people: ["Alex", "Sam"], defaultPerson: "Sam" })
    current.unsubscribe()
  })

  it("ignores broken stored settings", () => {
    localStorage.setItem("biblioteca-settings", JSON.stringify({ people: [] }))
    const current = latestSettings()
    expect(current.get()?.people).toEqual([FALLBACK_PERSON_NAME])
    current.unsubscribe()
  })
})
