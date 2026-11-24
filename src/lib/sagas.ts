import { bookshopSearchUrl } from "@/lib/authorWorks"
import { SAGA_CATALOG, type SagaDefinition } from "@/lib/sagaCatalog"
import { authorKey, normalize, titleKey } from "@/lib/text"
import type { Book } from "@/lib/types"

export interface SagaEntry {
  number: number
  title?: string
  book?: Book
  buyUrl?: string
}

export interface SagaProgress {
  name: string
  author: string
  entries: SagaEntry[]
  owned: number
  total: number
  complete: boolean
  totalKnown: boolean
}

const SERIES_SUFFIX = /\(([^()#]+?),?\s*#(\d+)[^()]*\)\s*$/

const surnameKey = (author: string | undefined) => authorKey(author?.split(/,| y | & /)[0].trim().split(/\s+/).pop())

const sameAuthor = (book: Book, author: string) => surnameKey(book.author) === surnameKey(author)

const matchesTitle = (book: Book, titles: string[]) => {
  const key = titleKey(book.title)
  return titles.some((title) => {
    const wanted = titleKey(title)
    return key === wanted || key.startsWith(`${wanted} `)
  })
}

const progress = (name: string, author: string, entries: SagaEntry[], totalKnown: boolean): SagaProgress => {
  const owned = entries.filter((e) => e.book).length
  return { name, author, entries, owned, total: entries.length, complete: owned === entries.length, totalKnown }
}

const catalogProgress = (saga: SagaDefinition, books: Book[]): SagaProgress => {
  const byAuthor = books.filter((b) => sameAuthor(b, saga.author))
  const entries = saga.volumes.map((volume) => {
    const book = byAuthor.find((b) => matchesTitle(b, volume.titles))
    const title = volume.titles[0]
    return { number: volume.number, title, book, buyUrl: book ? undefined : bookshopSearchUrl(title, saga.author) }
  })
  return progress(saga.name, saga.author, entries, true)
}

export const seriesFromTitle = (title: string | undefined) => {
  const match = title?.match(SERIES_SUFFIX)
  return match ? { name: match[1].trim(), number: Number(match[2]) } : undefined
}

const detectedProgress = (books: Book[], claimed: Set<string>): SagaProgress[] => {
  const groups = new Map<string, { name: string; author: string; byNumber: Map<number, Book> }>()
  for (const book of books) {
    if (claimed.has(book.id)) continue
    const series = seriesFromTitle(book.title)
    if (!series) continue
    const key = `${normalize(series.name)}|${surnameKey(book.author)}`
    const group = groups.get(key) ?? { name: series.name, author: book.author ?? "", byNumber: new Map() }
    group.byNumber.set(series.number, book)
    groups.set(key, group)
  }
  return [...groups.values()].map(({ name, author, byNumber }) => {
    const last = Math.max(...byNumber.keys())
    const entries = Array.from({ length: last }, (_, index) => {
      const number = index + 1
      const book = byNumber.get(number)
      return { number, book, buyUrl: book ? undefined : bookshopSearchUrl(`${name} ${number}`, author) }
    })
    return progress(name, author, entries, false)
  })
}

export const sagaProgress = (books: Book[]): SagaProgress[] => {
  const fromCatalog = SAGA_CATALOG.map((saga) => catalogProgress(saga, books)).filter((s) => s.owned > 0)
  const claimed = new Set(fromCatalog.flatMap((s) => s.entries.flatMap((e) => (e.book ? [e.book.id] : []))))
  const catalogNames = new Set(SAGA_CATALOG.map((s) => normalize(s.name)))
  const detected = detectedProgress(books, claimed).filter((s) => !catalogNames.has(normalize(s.name)) && s.total > 1)
  return [...fromCatalog, ...detected].sort((a, b) => Number(a.complete) - Number(b.complete) || a.name.localeCompare(b.name, "es"))
}
