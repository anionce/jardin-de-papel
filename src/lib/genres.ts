import { normalize } from "@/lib/text"
import type { Book } from "@/lib/types"

export function bookGenres(book: Pick<Book, "genres">): string[] {
  return book.genres ?? []
}

export function cleanGenres(genres: string[]): string[] {
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

export function genresPatch(genres: string[]): string[] | undefined {
  const cleaned = cleanGenres(genres)
  return cleaned.length > 0 ? cleaned : undefined
}

const sameGenre = (a: string, b: string) => normalize(a) === normalize(b)

export function hasGenre(book: Pick<Book, "genres">, genre: string): boolean {
  return bookGenres(book).some((g) => sameGenre(g, genre))
}

export function addGenre(book: Pick<Book, "genres">, genre: string): string[] | undefined {
  return genresPatch([...bookGenres(book), genre])
}

export function removeGenre(book: Pick<Book, "genres">, genre: string): string[] | undefined {
  return genresPatch(bookGenres(book).filter((g) => !sameGenre(g, genre)))
}

export function renameGenre(book: Pick<Book, "genres">, from: string, to: string): string[] | undefined {
  return genresPatch(bookGenres(book).map((g) => (g === from ? to : g)))
}

export interface GenreUsage {
  name: string
  ids: string[]
}

const collator = new Intl.Collator("es", { sensitivity: "base" })

export function genreUsage(books: Book[]): { rows: GenreUsage[]; withoutGenre: number } {
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
