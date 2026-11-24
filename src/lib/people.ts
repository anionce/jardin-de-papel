import { normalize } from "@/lib/text"
import type { Book, LibrarySettings } from "@/lib/types"

export const FALLBACK_PERSON_NAME = "Yo"

const samePerson = (a: string, b: string) => normalize(a) === normalize(b)

const firstName = (displayName?: string | null) => displayName?.trim().split(/\s+/)[0]

export const initialSettings = (displayName?: string | null): LibrarySettings => {
  const name = firstName(displayName) || FALLBACK_PERSON_NAME
  return { people: [name], defaultPerson: name }
}

export const hasSeveralPeople = (settings: LibrarySettings) => settings.people.length > 1

export const bookPerson = (book: Pick<Book, "person">, settings: LibrarySettings): string => {
  const person = book.person && settings.people.find((p) => samePerson(p, book.person ?? ""))
  return person || settings.defaultPerson
}

export const findPerson = (settings: LibrarySettings, name: string) => {
  return settings.people.find((p) => samePerson(p, name))
}

export const addPerson = (settings: LibrarySettings, name: string): LibrarySettings => {
  const trimmed = name.trim()
  if (!trimmed || findPerson(settings, trimmed)) return settings
  return { ...settings, people: [...settings.people, trimmed] }
}

export const renamePerson = (settings: LibrarySettings, from: string, to: string): LibrarySettings => {
  const trimmed = to.trim()
  const clash = findPerson(settings, trimmed)
  if (!trimmed || (clash && clash !== from)) return settings
  return {
    people: settings.people.map((p) => (p === from ? trimmed : p)),
    defaultPerson: settings.defaultPerson === from ? trimmed : settings.defaultPerson,
  }
}

export const removePerson = (settings: LibrarySettings, name: string): LibrarySettings => {
  const people = settings.people.filter((p) => p !== name)
  if (people.length === 0) return settings
  return { people, defaultPerson: settings.defaultPerson === name ? people[0] : settings.defaultPerson }
}

export const setDefaultPerson = (settings: LibrarySettings, name: string): LibrarySettings => {
  return settings.people.includes(name) ? { ...settings, defaultPerson: name } : settings
}

export const countBooksByPerson = (books: Book[], settings: LibrarySettings): Map<string, number> => {
  const counts = new Map(settings.people.map((p) => [p, 0]))
  for (const book of books) {
    const person = bookPerson(book, settings)
    counts.set(person, (counts.get(person) ?? 0) + 1)
  }
  return counts
}

type PersonPatch = { id: string; patch: { person: string | undefined } }

export const renamePersonPatches = (books: Book[], from: string, to: string): PersonPatch[] => {
  return books.filter((b) => b.person === from).map((b) => ({ id: b.id, patch: { person: to } }))
}

export const removePersonPatches = (books: Book[], name: string, settingsAfter: LibrarySettings): PersonPatch[] => {
  return books
    .filter((b) => b.person === name)
    .map((b) => ({ id: b.id, patch: { person: settingsAfter.defaultPerson } }))
}
