import Papa from "papaparse"
import { similarBooksFinder } from "@/lib/duplicates"
import { bookKey } from "@/lib/search"
import type { Book, BookDraft } from "@/lib/types"

export interface GoodreadsImport {
  books: BookDraft[]
  skipped: number
}

const NON_GENRE_SHELVES = new Set([
  "to-read", "currently-reading", "read", "owned", "own", "books-i-own", "owned-books",
  "favorites", "favourites", "favorite", "kindle", "ebook", "ebooks", "e-book", "audiobook",
  "audiobooks", "audio", "library", "wishlist", "wish-list", "dnf", "did-not-finish", "tbr",
  "re-read", "reread", "borrowed", "physical", "paperback", "hardcover",
])

const toYear = (value: string | undefined): number | undefined => {
  const n = parseInt((value ?? "").replace(/[^\d]/g, ""), 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const cleanIsbn = (raw: string | undefined): string | undefined => {
  const digits = (raw ?? "").replace(/[^0-9Xx]/g, "")
  return digits.length >= 10 ? digits : undefined
}

const pickGenres = (raw: string | undefined): string[] | undefined => {
  const genres = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && !NON_GENRE_SHELVES.has(s) && !/\d/.test(s) && !s.includes("star"))
    .map((shelf) => {
      const words = shelf.replace(/[-_]+/g, " ")
      return words.charAt(0).toUpperCase() + words.slice(1)
    })
  return genres.length > 0 ? [...new Set(genres)] : undefined
}

const clean = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const mapRow = (row: Record<string, string>): BookDraft | null => {
  const title = clean(row["Title"])
  const author = clean(row["Author"])
  if (!title && !author) return null

  return {
    title,
    author,
    publisher: clean(row["Publisher"]),
    genres: pickGenres(row["Bookshelves"]),
    year: toYear(row["Original Publication Year"]) ?? toYear(row["Year Published"]),
    pages: toYear(row["Number of Pages"]),
    isbn: cleanIsbn(row["ISBN13"]) ?? cleanIsbn(row["ISBN"]),
    read: (row["Exclusive Shelf"] ?? "").trim().toLowerCase() === "read",
    goodreadsId: clean(row["Book Id"]),
  }
}

export const parseGoodreadsCsv = (file: File): Promise<GoodreadsImport> => {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        if (!meta.fields?.includes("Title")) {
          reject(new Error("Este archivo no parece una exportación de Goodreads (falta la columna «Title»)."))
          return
        }
        const books: BookDraft[] = []
        let skipped = 0
        for (const row of data) {
          const book = mapRow(row)
          if (book) books.push(book)
          else skipped++
        }
        resolve({ books, skipped })
      },
      error: (error) => reject(error),
    })
  })
}

export interface ImportPlan {
  fresh: BookDraft[]
  duplicates: number
  unreadSkipped: number
  similar: number
}

export const planImport = (parsed: GoodreadsImport, existing: Book[], onlyRead: boolean): ImportPlan => {
  const candidates = onlyRead ? parsed.books.filter((b) => b.read) : parsed.books
  const keysOf = (b: Pick<Book, "title" | "author" | "goodreadsId">) => [bookKey(b), bookKey({ ...b, goodreadsId: undefined })]
  const known = new Set(existing.flatMap(keysOf))
  const fresh = candidates.filter((b) => !keysOf(b).some((key) => known.has(key)))
  const findSimilar = similarBooksFinder(existing)
  return {
    fresh,
    duplicates: candidates.length - fresh.length,
    unreadSkipped: parsed.books.length - candidates.length,
    similar: fresh.filter((b) => findSimilar(b).length > 0).length,
  }
}
