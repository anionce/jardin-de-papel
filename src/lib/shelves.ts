import { normalize } from "@/lib/text"
import type { Book, BookDraft, LibrarySettings, Shelf } from "@/lib/types"

export const NO_SHELF = "__none__"

type BookPatch = { id: string; patch: Partial<BookDraft> }

const sameName = (a: string, b: string) => normalize(a) === normalize(b)

export const shelvesOf = (settings: LibrarySettings): Shelf[] => settings.shelves ?? []

export const findShelf = (settings: LibrarySettings, name: string): Shelf | undefined =>
  shelvesOf(settings).find((shelf) => sameName(shelf.name, name))

export const bookShelf = (book: Pick<Book, "shelf">, settings: LibrarySettings): string | undefined =>
  book.shelf ? findShelf(settings, book.shelf)?.name : undefined

export const addShelf = (settings: LibrarySettings, name: string): LibrarySettings => {
  const trimmed = name.trim()
  if (!trimmed || findShelf(settings, trimmed)) return settings
  return { ...settings, shelves: [...shelvesOf(settings), { name: trimmed }] }
}

export const renameShelf = (settings: LibrarySettings, from: string, to: string): LibrarySettings => {
  const trimmed = to.trim()
  const clash = findShelf(settings, trimmed)
  if (!trimmed || (clash && clash.name !== from)) return settings
  return { ...settings, shelves: shelvesOf(settings).map((s) => (s.name === from ? { ...s, name: trimmed } : s)) }
}

export const removeShelf = (settings: LibrarySettings, name: string): LibrarySettings => ({
  ...settings,
  shelves: shelvesOf(settings).filter((s) => s.name !== name),
})

export const setShelfPhoto = (settings: LibrarySettings, name: string, photo: string | undefined): LibrarySettings => ({
  ...settings,
  shelves: shelvesOf(settings).map((s) => (s.name !== name ? s : photo ? { name: s.name, photo } : { name: s.name })),
})

const booksOnShelf = (books: Book[], name: string) => books.filter((b) => b.shelf && sameName(b.shelf, name))

export const renameShelfPatches = (books: Book[], from: string, to: string): BookPatch[] =>
  booksOnShelf(books, from).map((b) => ({ id: b.id, patch: { shelf: to.trim() } }))

export const removeShelfPatches = (books: Book[], name: string): BookPatch[] =>
  booksOnShelf(books, name).map((b) => ({ id: b.id, patch: { shelf: undefined } }))

export const countBooksByShelf = (books: Book[], settings: LibrarySettings): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const book of books) {
    const shelf = bookShelf(book, settings)
    if (shelf) counts.set(shelf, (counts.get(shelf) ?? 0) + 1)
  }
  return counts
}

export const matchesShelf = (book: Book, shelf: string | null | undefined, settings: LibrarySettings): boolean => {
  if (!shelf) return true
  const current = bookShelf(book, settings)
  return shelf === NO_SHELF ? !current : current === shelf
}
