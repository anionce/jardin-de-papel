import { bookGenres } from "@/lib/genres"
import { bookPerson } from "@/lib/people"
import { normalize } from "@/lib/text"
import type { Book, LibrarySettings, ReadFilter, SortField, SortKey } from "@/lib/types"

export interface LibraryQuery {
  text: string
  read: ReadFilter
  genres: string[]
  sort: SortKey
  person?: string | null
  settings?: LibrarySettings
}

const haystack = (book: Book): string => {
  return normalize(
    [book.title, book.author, book.publisher, ...bookGenres(book), book.year, book.isbn].filter(Boolean).join(" ")
  )
}

const matchesText = (book: Book, text: string): boolean => {
  const terms = normalize(text).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const hay = haystack(book)
  return terms.every((term) => hay.includes(term))
}

const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true })

const SORT_VALUE: Record<SortField, (b: Book) => string | number | undefined> = {
  recent: (b) => b.createdAt,
  title: (b) => b.title,
  author: (b) => b.author,
  year: (b) => b.year,
  pages: (b) => b.pages,
}

export const DEFAULT_SORT: SortKey = "recent-desc"

const sorter = (key: SortKey): (a: Book, b: Book) => number => {
  const [field, direction] = key.split("-") as [SortField, "asc" | "desc"]
  const value = SORT_VALUE[field] ?? SORT_VALUE.recent
  const sign = direction === "desc" ? -1 : 1
  return (a, b) => {
    const [va, vb] = [value(a), value(b)]

    if (va === undefined || vb === undefined) {
      return va === vb ? 0 : va === undefined ? 1 : -1
    }
    const order = typeof va === "number" && typeof vb === "number" ? va - vb : collator.compare(String(va), String(vb))
    if (order !== 0) return sign * order

    return field === "title" ? 0 : collator.compare(a.title ?? "", b.title ?? "")
  }
}

export const filterBooks = (books: Book[], query: LibraryQuery): Book[] => {
  return books
    .filter((book) => {
      if (query.read === "read" && !book.read) return false
      if (query.read === "unread" && book.read) return false
      if (query.genres.length > 0 && !bookGenres(book).some((g) => query.genres.includes(g))) return false
      if (query.person && query.settings && bookPerson(book, query.settings) !== query.person) return false
      return matchesText(book, query.text)
    })
    .sort(sorter(query.sort))
}

export const uniqueGenres = (books: Book[]): string[] => {
  const genres = new Set(books.flatMap(bookGenres))
  return [...genres].sort(collator.compare)
}

export const uniquePublishers = (books: Book[]): string[] => {
  const counts = new Map<string, Map<string, number>>()
  for (const { publisher } of books) {
    const name = publisher?.trim()
    if (!name) continue
    const key = normalize(name)
    const spellings = counts.get(key) ?? new Map<string, number>()
    spellings.set(name, (spellings.get(name) ?? 0) + 1)
    counts.set(key, spellings)
  }
  const names = [...counts.values()].map((spellings) => [...spellings].sort((a, b) => b[1] - a[1])[0][0])
  return names.sort(collator.compare)
}

export const bookKey = (book: Pick<Book, "title" | "author" | "goodreadsId">): string => {
  if (book.goodreadsId) return `gr:${book.goodreadsId}`
  return `ta:${normalize(book.title ?? "")}|${normalize(book.author ?? "")}`
}
