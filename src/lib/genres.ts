import { normalize } from "@/lib/text"
import type { Book } from "@/lib/types"

export const bookGenres = (book: Pick<Book, "genres">): string[] => {
  return book.genres ?? []
}

export const cleanGenres = (genres: string[]): string[] => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of genres) {
    const genre = raw.trim()
    const key = normalize(genre)
    if (!genre || seen.has(key)) continue
    seen.add(key)
    result.push(genre)
  }
  return result
}

export const genresPatch = (genres: string[]): string[] | undefined => {
  const cleaned = cleanGenres(genres)
  return cleaned.length > 0 ? cleaned : undefined
}

const sameGenre = (a: string, b: string) => normalize(a) === normalize(b)

export const hasGenre = (book: Pick<Book, "genres">, genre: string): boolean => {
  return bookGenres(book).some((g) => sameGenre(g, genre))
}

export const addGenre = (book: Pick<Book, "genres">, genre: string): string[] | undefined => {
  return genresPatch([...bookGenres(book), genre])
}

export const removeGenre = (book: Pick<Book, "genres">, genre: string): string[] | undefined => {
  return genresPatch(bookGenres(book).filter((g) => !sameGenre(g, genre)))
}

export const renameGenre = (book: Pick<Book, "genres">, from: string, to: string): string[] | undefined => {
  return genresPatch(bookGenres(book).map((g) => (g === from ? to : g)))
}

export interface GenreUsage {
  name: string
  ids: string[]
}

const collator = new Intl.Collator("es", { sensitivity: "base" })

export const genreUsage = (books: Book[]): { rows: GenreUsage[]; withoutGenre: number } => {
  const byGenre = new Map<string, string[]>()
  let withoutGenre = 0
  for (const book of books) {
    const genres = bookGenres(book)
    if (genres.length === 0) withoutGenre++
    for (const genre of genres) byGenre.set(genre, [...(byGenre.get(genre) ?? []), book.id])
  }
  const rows = [...byGenre].map(([name, ids]) => ({ name, ids }))
  rows.sort((a, b) => b.ids.length - a.ids.length || collator.compare(a.name, b.name))
  return { rows, withoutGenre }
}

export const untaggedBooks = (books: Book[], skipped: ReadonlySet<string>): Book[] =>
  books
    .filter((book) => bookGenres(book).length === 0 && !skipped.has(book.id))
    .sort((a, b) => collator.compare(a.author ?? "", b.author ?? "") || collator.compare(a.title ?? "", b.title ?? ""))

const SUGGESTION_LIMIT = 14

export const suggestedGenres = (book: Pick<Book, "id" | "author">, books: Book[], limit = SUGGESTION_LIMIT): string[] => {
  const author = normalize(book.author ?? "")
  const byAuthor = new Map<string, number>()
  if (author) {
    for (const other of books) {
      if (other.id === book.id || normalize(other.author ?? "") !== author) continue
      for (const genre of bookGenres(other)) byAuthor.set(genre, (byAuthor.get(genre) ?? 0) + 1)
    }
  }
  const fromAuthor = [...byAuthor].sort((a, b) => b[1] - a[1]).map(([genre]) => genre)
  const popular = genreUsage(books).rows.map((row) => row.name)
  return cleanGenres([...fromAuthor, ...popular]).slice(0, limit)
}
