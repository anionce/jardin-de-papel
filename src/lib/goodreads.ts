import Papa from "papaparse"
import type { BookDraft } from "@/lib/types"

export interface GoodreadsImport {
  books: BookDraft[]
  skipped: number
}

// Estanterías de Goodreads que son estado/formato, no género.
const NON_GENRE_SHELVES = new Set([
  "to-read", "currently-reading", "read", "owned", "own", "books-i-own", "owned-books",
  "favorites", "favourites", "favorite", "kindle", "ebook", "ebooks", "e-book", "audiobook",
  "audiobooks", "audio", "library", "wishlist", "wish-list", "dnf", "did-not-finish", "tbr",
  "re-read", "reread", "borrowed", "physical", "paperback", "hardcover",
])

function toYear(value: string | undefined): number | undefined {
  const n = parseInt((value ?? "").replace(/[^\d]/g, ""), 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Goodreads exporta los ISBN escapados para Excel: ="0439023483". */
function cleanIsbn(raw: string | undefined): string | undefined {
  const digits = (raw ?? "").replace(/[^0-9Xx]/g, "")
  return digits.length >= 10 ? digits : undefined
}

/** "fantasy, science-fiction" → ["Fantasy", "Science fiction"]. Ignora estanterías que no son géneros. */
function pickGenres(raw: string | undefined): string[] | undefined {
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

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function mapRow(row: Record<string, string>): BookDraft | null {
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

export function parseGoodreadsCsv(file: File): Promise<GoodreadsImport> {
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
