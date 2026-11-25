import { authorKey, titleKey } from "@/lib/text"
import type { Book } from "@/lib/types"
import type { WorkMatch, WorkMatchRequest } from "@/lib/workMatching"

const OPEN_LIBRARY = "https://openlibrary.org"
const WORKS_LIMIT = 60
const MIN_EDITIONS = 2
const MAX_CO_AUTHORS = 2
const NOT_A_SINGLE_WORK = /omnibus|double|collection|boxed|box set|cassette|trilog|quartet|chronicles 1/i
const BOOKSHOP_SEARCH = "https://www.todostuslibros.com/busquedas?keyword="

export interface AuthorWork {
  key: string
  title: string
  year?: number
  coverUrl?: string
  originalTitle?: string
  buyUrl: string
}

export interface OpenLibraryWorkDoc {
  key: string
  title?: string
  first_publish_year?: number
  cover_i?: number
  edition_count?: number
  author_name?: string[]
}

interface OpenLibraryAuthorDoc {
  key: string
  name?: string
  work_count?: number
}

const authorParts = (author: string | undefined) => (author ?? "").split(/,| y | & | and /i).map(authorKey).filter(Boolean)

export const isByAuthor = (book: Pick<Book, "author">, name: string) => {
  const wanted = authorKey(name)
  return authorKey(book.author) === wanted || authorParts(book.author).includes(wanted)
}

export const mainAuthor = (name: string) => name.split(/,| y | & | and /i)[0].trim()

export const booksByAuthor = (books: Book[], name: string) => books.filter((book) => isByAuthor(book, name))

export const hideWork = (hiddenWorks: string[] | undefined, key: string) => [...new Set([...(hiddenWorks ?? []), key])]

export const bookshopSearchUrl = (title: string, author: string) =>
  `${BOOKSHOP_SEARCH}${encodeURIComponent(`${title} ${author}`)}`

const workTitleKey = (title: string) => titleKey(title.replace(/\s*\([^)]*\)/g, ""))

export const otherWorks = (
  docs: OpenLibraryWorkDoc[],
  owned: Book[],
  author: string,
  ownedWorkKeys: string[] = [],
  hiddenWorks: string[] = []
): AuthorWork[] => {
  const ownedWorks = new Set([...owned.map((b) => b.workKey), ...ownedWorkKeys, ...hiddenWorks].filter(Boolean))
  const ownedDocTitles = docs.filter((d) => ownedWorks.has(d.key)).map((d) => d.title ?? "")
  const seenTitles = new Set([...owned.map((b) => b.title ?? ""), ...ownedDocTitles].map(workTitleKey))
  const works: AuthorWork[] = []
  for (const doc of docs) {
    if (!doc.title || ownedWorks.has(doc.key)) continue
    if ((doc.edition_count ?? 0) < MIN_EDITIONS || (doc.author_name?.length ?? 0) > MAX_CO_AUTHORS) continue
    if (NOT_A_SINGLE_WORK.test(doc.title)) continue
    const key = workTitleKey(doc.title)
    if (!key || seenTitles.has(key)) continue
    seenTitles.add(key)
    works.push({
      key: doc.key,
      title: doc.title,
      year: doc.first_publish_year,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
      buyUrl: bookshopSearchUrl(doc.title, author),
    })
  }
  return works
}

interface SpanishEditionDoc {
  title?: string
  language?: string[]
  cover_i?: number
  editions?: { docs?: { title?: string; language?: string[]; cover_i?: number }[] }
}

const SPANISH = "spa"

const sameWorkTitle = (a: string | undefined, b: string) =>
  (a ?? "").split(" / ").some((part) => workTitleKey(part) === workTitleKey(b))

export const workMatchRequest = (author: string, owned: Book[], works: AuthorWork[]): WorkMatchRequest => ({
  author,
  owned: [...new Set(owned.flatMap((b) => (b.title ? [b.title] : [])))].sort(),
  candidates: works.map((w) => ({ key: w.key, title: w.title, ...(w.year ? { year: w.year } : {}) })),
})

export const applyWorkMatches = (works: AuthorWork[], matches: WorkMatch[], owned: Book[], author: string): AuthorWork[] => {
  const byKey = new Map(matches.map((m) => [m.key, m]))
  const ownedTitles = new Set(owned.map((b) => titleKey(b.title)).filter(Boolean))
  return works.flatMap((work) => {
    const match = byKey.get(work.key)
    if (!match) return [work]
    if (!match.show || match.ownedTitle || ownedTitles.has(titleKey(match.spanishTitle))) return []
    if (!match.spanishTitle) return [work]
    const spanish = { ...work, title: match.spanishTitle, buyUrl: bookshopSearchUrl(match.spanishTitle, author) }
    return [sameWorkTitle(work.title, match.spanishTitle) ? spanish : { ...spanish, originalTitle: work.title }]
  })
}

export const spanishCoverFrom = (docs: SpanishEditionDoc[], title: string): string | undefined => {
  for (const doc of docs) {
    const edition = doc.editions?.docs?.find((e) => e.cover_i && e.language?.includes(SPANISH) && sameWorkTitle(e.title, title))
    const cover = edition?.cover_i ?? (doc.language?.includes(SPANISH) && sameWorkTitle(doc.title, title) ? doc.cover_i : undefined)
    if (cover) return `https://covers.openlibrary.org/b/id/${cover}-M.jpg`
  }
  return undefined
}

export const fetchSpanishCover = async (title: string, author: string, signal: AbortSignal): Promise<string | undefined> => {
  const params = new URLSearchParams({
    title,
    author,
    lang: "es",
    limit: "3",
    fields: "title,language,cover_i,editions,editions.title,editions.language,editions.cover_i",
  })
  const { docs = [] } = await getJson<{ docs?: SpanishEditionDoc[] }>(`${OPEN_LIBRARY}/search.json?${params}`, signal)
  return spanishCoverFrom(docs, title)
}

const getJson = async <T,>(url: string, signal: AbortSignal): Promise<T> => {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open Library ${res.status}`)
  return (await res.json()) as T
}

const findAuthorKey = async (name: string, signal: AbortSignal) => {
  const params = new URLSearchParams({ q: name, limit: "5" })
  const { docs = [] } = await getJson<{ docs?: OpenLibraryAuthorDoc[] }>(`${OPEN_LIBRARY}/search/authors.json?${params}`, signal)
  const wanted = authorKey(name)
  const sameName = docs.filter((d) => authorKey(d.name) === wanted)
  const best = (sameName.length > 0 ? sameName : docs).sort((a, b) => (b.work_count ?? 0) - (a.work_count ?? 0))[0]
  return best?.key
}

interface OpenLibraryMatchDoc {
  key: string
  title?: string
  editions?: { docs?: { title?: string }[] }
}

const OWNED_MATCH_LIMIT = "5"

export const fetchOwnedWorkKeys = async (owned: Book[], author: string, signal: AbortSignal): Promise<string[]> => {
  const keys = await Promise.all(
    owned.map(async (book) => {
      if (!book.title) return []
      const wanted = workTitleKey(book.title)
      const params = new URLSearchParams({
        q: book.title.replace(/\s*\([^)]*\)/g, ""),
        author,
        sort: "editions",
        limit: OWNED_MATCH_LIMIT,
        lang: "en",
        fields: "key,title,editions,editions.title",
      })
      const { docs = [] } = await getJson<{ docs?: OpenLibraryMatchDoc[] }>(`${OPEN_LIBRARY}/search.json?${params}`, signal).catch(
        () => ({ docs: [] })
      )
      return docs
        .filter((d) => workTitleKey(d.title ?? "") === wanted || d.editions?.docs?.some((e) => workTitleKey(e.title ?? "") === wanted))
        .map((d) => d.key)
    })
  )
  return keys.flat()
}

export const fetchAuthorWorkDocs = async (name: string, signal: AbortSignal): Promise<OpenLibraryWorkDoc[]> => {
  const key = await findAuthorKey(mainAuthor(name), signal)
  if (!key) return []
  const params = new URLSearchParams({
    author_key: key,
    sort: "editions",
    limit: String(WORKS_LIMIT),
    fields: "key,title,first_publish_year,cover_i,edition_count,author_name",
  })
  const { docs = [] } = await getJson<{ docs?: OpenLibraryWorkDoc[] }>(`${OPEN_LIBRARY}/search.json?${params}`, signal)
  return docs
}
