import { similarBooksFinder } from "@/lib/duplicates"
import type { SpineReading } from "@/lib/shelfReading"
import { authorKey, titleKey } from "@/lib/text"
import { isUploadedImage } from "@/lib/image"
import type { Book, BookDraft } from "@/lib/types"

export interface PhotoCandidate {
  key: string
  title: string
  author: string
  publisher: string
  uncertain: boolean
  include: boolean
  existing?: Book
}

const surnameKey = (author: string) => authorKey(author.trim().split(/\s+/).pop())

const candidateKey = (reading: SpineReading) => `${titleKey(reading.title)}|${surnameKey(reading.author)}`

const sameBook = (a: SpineReading, b: SpineReading) => {
  if (titleKey(a.title) !== titleKey(b.title)) return false
  const [authorA, authorB] = [surnameKey(a.author), surnameKey(b.author)]
  return !authorA || !authorB || authorA === authorB
}

const mergeReadings = (kept: SpineReading, other: SpineReading): SpineReading => ({
  title: kept.title,
  author: kept.author || other.author,
  publisher: kept.publisher || other.publisher,
  uncertain: kept.uncertain && other.uncertain,
})

export const buildCandidates = (readings: SpineReading[][], library: Book[]): PhotoCandidate[] => {
  const unique: SpineReading[] = []
  for (const reading of readings.flat()) {
    const index = unique.findIndex((u) => sameBook(u, reading))
    if (index === -1) unique.push(reading)
    else unique[index] = mergeReadings(unique[index], reading)
  }

  const findSimilar = similarBooksFinder(library)
  return unique.map((reading) => {
    const existing = findSimilar({ title: reading.title, author: reading.author || undefined })[0]
    return { ...reading, key: candidateKey(reading), include: !existing, existing }
  })
}

export const fillsMissingPublisher = (candidate: PhotoCandidate): boolean => {
  return Boolean(candidate.existing && !candidate.existing.publisher && candidate.publisher.trim())
}

export const publisherPatches = (candidates: PhotoCandidate[]): { id: string; patch: Partial<BookDraft> }[] => {
  return candidates.filter(fillsMissingPublisher).map((c) => {
    const book = c.existing as Book
    const keepsOwnCover = Boolean(book.coverUrl && isUploadedImage(book.coverUrl))
    const patch: Partial<BookDraft> = { publisher: c.publisher.trim() }
    if (!keepsOwnCover) Object.assign(patch, { coverUrl: undefined, coverChecked: undefined })
    return { id: book.id, patch }
  })
}

type BookPatch = { id: string; patch: Partial<BookDraft> }

export const shelfPatches = (candidates: PhotoCandidate[], shelf: string | undefined): BookPatch[] => {
  if (!shelf) return []
  const ids = new Set(candidates.flatMap((c) => (c.existing && c.existing.shelf !== shelf ? [c.existing.id] : [])))
  return [...ids].map((id) => ({ id, patch: { shelf } }))
}

export const mergePatches = (...lists: BookPatch[][]): BookPatch[] => {
  const byId = new Map<string, Partial<BookDraft>>()
  for (const { id, patch } of lists.flat()) byId.set(id, { ...byId.get(id), ...patch })
  return [...byId].map(([id, patch]) => ({ id, patch }))
}

export const candidatesToDrafts = (candidates: PhotoCandidate[], shelf?: string): BookDraft[] => {
  return candidates
    .filter((c) => c.include && (c.title.trim() || c.author.trim()))
    .map((c) => ({
      title: c.title.trim() || undefined,
      author: c.author.trim() || undefined,
      publisher: c.publisher.trim() || undefined,
      read: false,
      ...(shelf ? { shelf } : {}),
    }))
}
