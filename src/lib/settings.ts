import { doc, onSnapshot, setDoc } from "firebase/firestore"
import { auth, firestore } from "@/lib/firebase"
import { currentLibrary } from "@/lib/membership"
import { initialSettings } from "@/lib/people"
import type { LibrarySettings } from "@/lib/types"

const SETTINGS_COLLECTION = "libraries"
const LOCAL_SETTINGS_KEY = "biblioteca-settings"

type SettingsListener = (settings: LibrarySettings) => void

const localSettingsListeners = new Set<SettingsListener>()

const isValidSettings = (value: unknown): value is LibrarySettings => {
  const settings = value as Partial<LibrarySettings> | null
  return Array.isArray(settings?.people) && settings.people.length > 0 && typeof settings.defaultPerson === "string"
}

const readLocalSettings = (): LibrarySettings | null => {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) ?? "null")
    return isValidSettings(stored) ? stored : null
  } catch {
    return null
  }
}

const settingsDoc = () => {
  if (!firestore || !auth?.currentUser?.email) return null
  return doc(firestore, SETTINGS_COLLECTION, currentLibrary())
}

export const saveSettings = async (settings: LibrarySettings) => {
  const ref = settingsDoc()
  if (!ref) {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings))
    localSettingsListeners.forEach((listener) => listener(settings))
    return
  }
  await setDoc(ref, settings)
}

export const subscribeSettings = (onChange: SettingsListener, onError: (error: Error) => void): (() => void) => {
  const fallback = initialSettings(auth?.currentUser?.displayName)
  const ref = settingsDoc()
  if (!ref) {
    localSettingsListeners.add(onChange)
    onChange(readLocalSettings() ?? fallback)
    return () => localSettingsListeners.delete(onChange)
  }
  return onSnapshot(
    ref,
    (snapshot) => {
      const stored = snapshot.data()
      onChange(isValidSettings(stored) ? stored : fallback)
    },
    onError
  )
}
