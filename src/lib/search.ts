import { bookGenres } from "@/lib/genres"
import { normalize } from "@/lib/text"
import type { Book, ReadFilter, SortField, SortKey } from "@/lib/types"

export interface LibraryQuery {
  text: string
  read: ReadFilter
  /** Géneros elegidos en el filtro: vale el libro que tenga cualquiera de ellos. */
  genres: string[]
  sort: SortKey
}

function haystack(book: Book): string {
  return normalize(
    [book.title, book.author, book.publisher, ...bookGenres(book), book.year, book.isbn].filter(Boolean).join(" ")
  )
}

/** Cada palabra buscada tiene que aparecer en algún campo (AND), así
 * "tolkien 1954" o "anagrama novela" afinan en vez de ampliar. */
function matchesText(book: Book, text: string): boolean {
  const terms = normalize(text).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const hay = haystack(book)
  return terms.every((term) => hay.includes(term))
}

const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true })

/** Valor por el que se ordena; undefined = el libro no tiene ese dato. */
const SORT_VALUE: Record<SortField, (b: Book) => string | number | undefined> = {
  recent: (b) => b.createdAt,
  title: (b) => b.title,
  author: (b) => b.author,
  year: (b) => b.year,
  pages: (b) => b.pages,
}

export const DEFAULT_SORT: SortKey = "recent-desc"

function sorter(key: SortKey): (a: Book, b: Book) => number {
  const [field, direction] = key.split("-") as [SortField, "asc" | "desc"]
  const value = SORT_VALUE[field] ?? SORT_VALUE.recent
  const sign = direction === "desc" ? -1 : 1
  return (a, b) => {
    const [va, vb] = [value(a), value(b)]
    // Los libros sin ese dato van siempre al final, en los dos sentidos.
    if (va === undefined || vb === undefined) {
      return va === vb ? 0 : va === undefined ? 1 : -1
    }
    const order = typeof va === "number" && typeof vb === "number" ? va - vb : collator.compare(String(va), String(vb))
    if (order !== 0) return sign * order
    // Empate (mismo autor, mismo año…): por título.
    return field === "title" ? 0 : collator.compare(a.title ?? "", b.title ?? "")
  }
}

export function filterBooks(books: Book[], query: LibraryQuery): Book[] {
  return books
    .filter((book) => {
      if (query.read === "read" && !book.read) return false
      if (query.read === "unread" && book.read) return false
      if (query.genres.length > 0 && !bookGenres(book).some((g) => query.genres.includes(g))) return false
      return matchesText(book, query.text)
    })
    .sort(sorter(query.sort))
}

export function uniqueGenres(books: Book[]): string[] {
  const genres = new Set(books.flatMap(bookGenres))
  return [...genres].sort(collator.compare)
}

/**
 * Editoriales ya usadas, para autocompletar. "Tusquets" y "TUSQUETS" cuentan
 * como una sola: se ofrece la forma más repetida.
 */
export function uniquePublishers(books: Book[]): string[] {
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

/** Clave para detectar duplicados al importar. */
export function bookKey(book: Pick<Book, "title" | "author" | "goodreadsId">): string {
  if (book.goodreadsId) return `gr:${book.goodreadsId}`
  return `ta:${normalize(book.title ?? "")}|${normalize(book.author ?? "")}`
}
