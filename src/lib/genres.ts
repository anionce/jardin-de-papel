import { normalize } from "@/lib/text"
import type { Book } from "@/lib/types"

/** Géneros de un libro (siempre una lista, aunque esté vacía). */
export function bookGenres(book: Pick<Book, "genres">): string[] {
  return book.genres ?? []
}

/** Sin vacíos ni repetidos ("Novela" y "novela" cuentan como uno). */
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

/** Lista para guardar: vacía → undefined (se borra el campo). */
export function genresPatch(genres: string[]): string[] | undefined {
  const cleaned = cleanGenres(genres)
  return cleaned.length > 0 ? cleaned : undefined
}

export function hasGenre(book: Pick<Book, "genres">, genre: string): boolean {
  const key = normalize(genre)
  return bookGenres(book).some((g) => normalize(g) === key)
}
