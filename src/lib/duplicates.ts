import { TRUSTED_WORK_VERSION } from "@/lib/bookLookup"
import { bookGenres, cleanGenres } from "@/lib/genres"
import { authorKey, titleKey } from "@/lib/text"
import type { Book, BookDraft } from "@/lib/types"

type Comparable = Pick<Book, "title" | "author" | "workKey" | "workVersion">

function trustedWork(book: Comparable): string | undefined {
  return (book.workVersion ?? 0) >= TRUSTED_WORK_VERSION ? book.workKey : undefined
}

export type DuplicateReason = "obra" | "título"

export function duplicateReason(a: Comparable, b: Comparable): DuplicateReason | null {
  const work = trustedWork(a)
  if (work && work === trustedWork(b)) return "obra"

  const authorA = authorKey(a.author)
  const titleA = titleKey(a.title)
  if (authorA && titleA && authorA === authorKey(b.author) && titleA === titleKey(b.title)) return "título"
  return null
}

function dismissed(a: Book, b: Book): boolean {
  return Boolean(a.distinctFrom?.includes(b.id) || b.distinctFrom?.includes(a.id))
}

export interface DuplicateGroup {
  books: Book[]
  reason: DuplicateReason
}

export function findDuplicateGroups(books: Book[]): DuplicateGroup[] {
  const parent = new Map<string, string>()
  const reasonOf = new Map<string, DuplicateReason>()
  const linked = new Set<string>()
  const find = (id: string): string => {
    const p = parent.get(id) ?? id
    if (p === id) return id
    const root = find(p)
    parent.set(id, root)
    return root
  }
  const union = (a: Book, b: Book, reason: DuplicateReason) => {
    linked.add(a.id).add(b.id)
    const rootA = find(a.id)
    const rootB = find(b.id)
    if (rootA !== rootB) parent.set(rootB, rootA)
    const root = find(a.id)
    if (reason === "obra" || !reasonOf.has(root)) reasonOf.set(root, reason)
  }

  const buckets = new Map<string, Book[]>()
  for (const book of books) {
    const keys = [trustedWork(book) && `w:${trustedWork(book)}`, authorKey(book.author) && `a:${authorKey(book.author)}`]
    for (const key of keys) if (key) buckets.set(key, [...(buckets.get(key) ?? []), book])
  }

  for (const bucket of buckets.values()) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const [a, b] = [bucket[i], bucket[j]]
        if (dismissed(a, b)) continue
        const reason = duplicateReason(a, b)
        if (reason) union(a, b, reason)
      }
    }
  }

  const groups = new Map<string, Book[]>()
  for (const book of books) {
    if (!linked.has(book.id)) continue
    const root = find(book.id)
    groups.set(root, [...(groups.get(root) ?? []), book])
  }
  return [...groups]
    .filter(([, group]) => group.length > 1)
    .map(([root, group]) => ({ books: group, reason: reasonOf.get(root) ?? "título" }))
}

export function similarBooksFinder(books: Book[]) {
  const byAuthor = new Map<string, Book[]>()
  for (const book of books) {
    const key = authorKey(book.author)
    if (key) byAuthor.set(key, [...(byAuthor.get(key) ?? []), book])
  }
  return (draft: Pick<BookDraft, "title" | "author">): Book[] =>
    (byAuthor.get(authorKey(draft.author)) ?? []).filter((b) => duplicateReason(draft, b) !== null)
}

export function mergeMissingFields(keep: Book, others: Book[]): Partial<BookDraft> {
  const fields = ["title", "author", "publisher", "year", "pages", "isbn", "coverUrl"] as const
  const patch: Partial<BookDraft> = {}
  for (const field of fields) {
    if (keep[field] !== undefined) continue
    const value = others.find((o) => o[field] !== undefined)?.[field]
    if (value !== undefined) Object.assign(patch, { [field]: value })
  }

  const allGenres = cleanGenres([keep, ...others].flatMap(bookGenres))
  if (allGenres.length > bookGenres(keep).length) patch.genres = allGenres

  if (!keep.read && others.some((o) => o.read)) patch.read = true
  return patch
}

export function markDistinctPatches(group: Book[], chosen: Book[]): { id: string; patch: Partial<BookDraft> }[] {
  const chosenIds = new Set(chosen.map((b) => b.id))
  return group.map((book) => {
    const against = chosenIds.has(book.id) ? group.filter((o) => o.id !== book.id) : chosen
    const distinctFrom = [...new Set([...(book.distinctFrom ?? []), ...against.map((o) => o.id)])]
    return { id: book.id, patch: { distinctFrom } }
  })
}
