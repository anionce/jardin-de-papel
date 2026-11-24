import { authorKey, titleKey } from "@/lib/text"
import type { Book } from "@/lib/types"

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

export const bookshopSearchUrl = (title: string, author: string) =>
  `${BOOKSHOP_SEARCH}${encodeURIComponent(`${title} ${author}`)}`

const workTitleKey = (title: string) => titleKey(title.replace(/\s*\([^)]*\)/g, ""))

export const otherWorks = (
  docs: OpenLibraryWorkDoc[],
  owned: Book[],
  author: string,
  ownedOriginalTitles: string[] = []
): AuthorWork[] => {
  const ownedWorks = new Set(owned.map((b) => b.workKey).filter(Boolean))
  const seenTitles = new Set([...owned.map((b) => b.title ?? ""), ...ownedOriginalTitles].map(workTitleKey))
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

export const fetchWorkTitles = async (workKeys: string[], signal: AbortSignal): Promise<string[]> => {
  const titles = await Promise.all(
    workKeys.map((key) =>
      getJson<{ title?: string }>(`${OPEN_LIBRARY}${key}.json`, signal)
        .then((work) => work.title)
        .catch(() => undefined)
    )
  )
  return titles.filter((title): title is string => Boolean(title))
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
