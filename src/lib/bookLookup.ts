import { authorKey, cleanTitle, normalize, titleKey } from "@/lib/text"
import type { Book } from "@/lib/types"

const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined

class CoverQuotaError extends Error {}

const OPEN_LIBRARY_TIMEOUT_MS = 6000

let googleQuotaHit = false

function checkGoogleQuota(res: Response) {
  if (res.status !== 429) return
  googleQuotaHit = true
  throw new CoverQuotaError("Google Books: cuota diaria agotada")
}

const openLibraryCoverUrl = (coverId: number) => `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`

const secureThumbnail = (url: string) => url.replace(/^http:/, "https:").replace("&edge=curl", "")

const preferredIsbn = (isbns: string[] = []) => isbns.find((i) => i.length === 13) ?? isbns[0]

function titleMatches(doc: OpenLibraryDoc, wanted: string): boolean {
  return titleKey(doc.title) === wanted || Boolean(doc.editions?.docs?.some((e) => titleKey(e.title) === wanted))
}

type LookupInput = Pick<Book, "title" | "author" | "isbn">

interface OpenLibraryDoc {
  key?: string
  number_of_pages_median?: number
  cover_i?: number
  title?: string
  editions?: { docs?: { title?: string }[] }
}

export const WORK_LOOKUP_VERSION = 3

export const TRUSTED_WORK_VERSION = 2

async function googleThumbnails(query: string, maxResults = 5): Promise<string[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults), fields: "items(volumeInfo/imageLinks)" })
  if (GOOGLE_BOOKS_KEY) params.set("key", GOOGLE_BOOKS_KEY)
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
  checkGoogleQuota(res)
  if (!res.ok) return []
  const data = (await res.json()) as { items?: { volumeInfo?: { imageLinks?: { thumbnail?: string } } }[] }
  return (data.items ?? []).flatMap((i) => {
    const thumbnail = i.volumeInfo?.imageLinks?.thumbnail
    return thumbnail ? [secureThumbnail(thumbnail)] : []
  })
}

async function openLibraryDoc(book: LookupInput): Promise<OpenLibraryDoc | undefined> {
  const search = async (params: Record<string, string>) => {
    const query = new URLSearchParams({
      ...params,
      fields: "key,cover_i,title,number_of_pages_median,editions,editions.title",
      limit: "10",
      sort: "editions",
      lang: "en",
    })
    const res = await fetch(`https://openlibrary.org/search.json?${query}`)
    if (!res.ok) return []
    const data = (await res.json()) as { docs?: OpenLibraryDoc[] }
    return data.docs ?? []
  }

  if (book.isbn) {
    const [byIsbn] = await search({ isbn: book.isbn })
    if (byIsbn) return byIsbn
  }

  if (!book.title || !book.author) return undefined

  const wanted = titleKey(book.title)
  const docs = await search({ q: cleanTitle(book.title), author: book.author })
  return docs.find((doc) => titleMatches(doc, wanted))
}

export interface LookupResult {
  workKey?: string
  pages?: number
  coverUrl?: string
  coverComplete: boolean
}

export async function lookupBook(
  book: LookupInput,
  options: { cover: boolean }
): Promise<LookupResult> {
  const doc = await openLibraryDoc(book).catch(() => undefined)
  const result: LookupResult = { workKey: doc?.key, pages: doc?.number_of_pages_median, coverComplete: true }
  if (!options.cover) return result

  if (!googleQuotaHit) {
    const title = book.title ? cleanTitle(book.title) : undefined
    const queries = [
      book.isbn && `isbn:${book.isbn}`,
      title && (book.author ? `intitle:${title} inauthor:${book.author}` : `intitle:${title}`),
    ].filter((q): q is string => Boolean(q))
    for (const query of queries) {
      try {
        result.coverUrl = (await googleThumbnails(query))[0]
      } catch (error) {
        if (!(error instanceof CoverQuotaError)) continue
        result.coverComplete = false
        break
      }
      if (result.coverUrl) return result
    }
  } else {
    result.coverComplete = false
  }

  result.coverUrl = doc?.cover_i ? openLibraryCoverUrl(doc.cover_i) : undefined
  if (result.coverUrl) result.coverComplete = true
  return result
}

export interface EditionMatch {
  coverUrl?: string
  isbn?: string
}

export async function findEdition(
  book: Pick<Book, "title" | "author" | "publisher">
): Promise<EditionMatch | undefined> {
  if (!book.title || !book.publisher) return undefined
  const params = new URLSearchParams({
    q: cleanTitle(book.title),
    publisher: book.publisher,
    fields: "key,title,editions,editions.title,editions.isbn,editions.cover_i",
    limit: "5",
    lang: "es",
  })
  if (book.author) params.set("author", book.author)
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    signal: AbortSignal.timeout(OPEN_LIBRARY_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Open Library ${res.status}`)
  const data = (await res.json()) as { docs?: OpenLibraryDoc[] }
  const wanted = titleKey(book.title)
  for (const doc of data.docs ?? []) {
    const edition = doc.editions?.docs?.[0] as { title?: string; isbn?: string[]; cover_i?: number } | undefined
    if (!edition) continue
    if (titleKey(edition.title) !== wanted && titleKey(doc.title) !== wanted) continue
    return {
      coverUrl: edition.cover_i ? openLibraryCoverUrl(edition.cover_i) : undefined,
      isbn: preferredIsbn(edition.isbn),
    }
  }
  return undefined
}

interface OpenLibraryEdition {
  title?: string
  covers?: number[]
  languages?: { key: string }[]
}

async function coverWorkKeys(book: Pick<Book, "title" | "author" | "isbn">): Promise<string[]> {
  const doc = await openLibraryDoc(book).catch(() => undefined)
  if (doc?.key) return [doc.key]
  if (!book.title) return []
  const params = new URLSearchParams({
    q: cleanTitle(book.title),
    fields: "key,title,editions,editions.title",
    limit: "5",
    lang: "en",
  })
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    signal: AbortSignal.timeout(OPEN_LIBRARY_TIMEOUT_MS),
  })
  if (!res.ok) return []
  const wanted = titleKey(book.title)
  const docs = ((await res.json()) as { docs?: OpenLibraryDoc[] }).docs ?? []
  return docs
    .filter((d) => d.key && titleMatches(d, wanted))
    .slice(0, 2)
    .map((d) => d.key!)
}

export async function findCoverCandidates(
  book: Pick<Book, "title" | "author" | "isbn" | "publisher" | "workKey">
): Promise<string[]> {
  const first: string[] = []
  const last: string[] = []
  const title = book.title ? cleanTitle(book.title) : undefined
  const ignore = <T,>(promise: Promise<T>, fallback: T) => promise.catch(() => fallback)

  const [edition, workKeys, byIsbn, byTitle] = await Promise.all([
    book.publisher ? ignore(findEdition(book), undefined) : undefined,
    book.workKey ? [book.workKey] : ignore(coverWorkKeys(book), []),
    book.isbn && !googleQuotaHit ? ignore(googleThumbnails(`isbn:${book.isbn}`, 3), []) : [],
    title && !googleQuotaHit
      ? ignore(googleThumbnails(book.author ? `intitle:${title} inauthor:${book.author}` : `intitle:${title}`, 15), [])
      : [],
  ])
  if (edition?.coverUrl) first.push(edition.coverUrl)
  first.push(...byIsbn)

  if (workKeys.length > 0) {
    const editions = (
      await Promise.all(
        workKeys.map(async (workKey) => {
          const res = await fetch(`https://openlibrary.org${workKey}/editions.json?limit=200`, {
            signal: AbortSignal.timeout(OPEN_LIBRARY_TIMEOUT_MS),
          }).catch(() => undefined)
          return res?.ok ? ((await res.json()) as { entries?: OpenLibraryEdition[] }).entries ?? [] : []
        })
      )
    ).flat()
    const wanted = titleKey(book.title)
    const sameTitle: string[] = []
    const spanish: string[] = []
    for (const e of editions) {
      const covers = (e.covers ?? []).filter((id) => id > 0).map(openLibraryCoverUrl)
      if (wanted && titleKey(e.title) === wanted) sameTitle.push(...covers)
      else if (e.languages?.some((l) => l.key === "/languages/spa")) spanish.push(...covers)
      else last.push(...covers)
    }
    first.push(...sameTitle, ...spanish)
  }
  first.push(...byTitle)
  return [...new Set([...first, ...last])]
}

export interface BookSuggestion {
  id: string
  title: string
  matchTitles?: string[]
  author?: string
  publisher?: string
  year?: number
  pages?: number
  isbn?: string
  coverUrl?: string
}

interface GoogleVolume {
  id: string
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    industryIdentifiers?: { type: string; identifier: string }[]
    pageCount?: number
    imageLinks?: { thumbnail?: string }
  }
}

function parseYear(date?: string | number): number | undefined {
  const year = parseInt(String(date ?? ""), 10)
  return Number.isFinite(year) ? year : undefined
}

async function googleSuggestions(title: string, author: string, signal: AbortSignal): Promise<BookSuggestion[]> {
  const q = [title && `intitle:${title}`, author && `inauthor:${author}`].filter(Boolean).join(" ")
  const params = new URLSearchParams({
    q,
    maxResults: "20",
    printType: "books",
    fields: "items(id,volumeInfo(title,subtitle,authors,publisher,publishedDate,industryIdentifiers,pageCount,imageLinks/thumbnail))",
  })
  if (GOOGLE_BOOKS_KEY) params.set("key", GOOGLE_BOOKS_KEY)
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { signal })
  checkGoogleQuota(res)
  if (!res.ok) throw new Error(`Google Books ${res.status}`)
  const data = (await res.json()) as { items?: GoogleVolume[] }
  return (data.items ?? []).flatMap(({ id, volumeInfo: v }) => {
    if (!v?.title) return []
    const ids = v.industryIdentifiers ?? []
    const isbn = (ids.find((i) => i.type === "ISBN_13") ?? ids.find((i) => i.type === "ISBN_10"))?.identifier
    return [
      {
        id: `g:${id}`,
        title: v.title,
        author: v.authors?.join(", "),
        publisher: v.publisher,
        year: parseYear(v.publishedDate),
        pages: v.pageCount || undefined,
        isbn,
        coverUrl: v.imageLinks?.thumbnail && secureThumbnail(v.imageLinks.thumbnail),
      },
    ]
  })
}

function asPrefix(text: string): string {
  const clean = text.replace(/[:"()[\]{}^~*?\\/!+-]/g, " ").replace(/\s+/g, " ").trim()
  if (/(^|\s)\p{L}{4,}$/u.test(clean)) return `${clean}*`

  const words = clean.split(" ")
  return words.length > 1 && !/\s$/.test(text) ? words.slice(0, -1).join(" ") : clean
}

interface OpenLibrarySuggestionDoc {
  key: string
  title?: string
  author_name?: string[]
  first_publish_year?: number
  number_of_pages_median?: number
  cover_i?: number
  editions?: {
    docs?: { title?: string; publisher?: string[]; isbn?: string[]; publish_date?: string[]; cover_i?: number }[]
  }
}

async function openLibrarySuggestions(
  title: string,
  author: string,
  signal: AbortSignal,
  prefix: boolean
): Promise<BookSuggestion[]> {
  const params = new URLSearchParams({
    fields:
      "key,title,author_name,first_publish_year,number_of_pages_median,cover_i,editions,editions.title,editions.publisher,editions.isbn,editions.publish_date,editions.cover_i",
    limit: "12",
    lang: "es",
  })
  const term = (text: string) => (prefix ? asPrefix(text) : text)
  if (title) params.set("q", term(title))
  if (author) params.set("author", term(author))
  let res: Response | undefined
  try {
    res = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(OPEN_LIBRARY_TIMEOUT_MS)]),
    })
  } catch (error) {
    if (signal.aborted) throw error
  }
  if (!res?.ok) throw new Error(`Open Library ${res?.status ?? "sin respuesta"}`)
  const data = (await res.json()) as { docs?: OpenLibrarySuggestionDoc[] }
  return (data.docs ?? []).flatMap((d) => {
    if (!d.title || !d.author_name?.length) return []
    const edition = d.editions?.docs?.[0]
    const cover = edition?.cover_i ?? d.cover_i
    return [
      {
        id: `ol:${d.key}`,
        title: fixInvertedArticle(edition?.title ?? d.title),
        matchTitles: edition?.title ? [edition.title, d.title] : undefined,
        author: d.author_name.join(", "),
        publisher: edition?.publisher?.[0],
        year: parseYear(edition?.publish_date?.[0]?.match(/\d{4}/)?.[0]) ?? d.first_publish_year,
        pages: d.number_of_pages_median,
        isbn: preferredIsbn(edition?.isbn),
        coverUrl: cover ? openLibraryCoverUrl(cover) : undefined,
      },
    ]
  })
}

function fixInvertedArticle(title: string): string {
  const fixed = title.replace(/^(.+),\s*(el|la|los|las|lo|un|una|the|a|an)$/i, "$2 $1")

  return fixed.charAt(0).toLocaleUpperCase("es") + fixed.slice(1)
}

function matchesTypedTitle(typed: string, suggestion: BookSuggestion): boolean {
  const words = titleKey(typed).split(" ").filter((w) => w.length >= 3)
  if (words.length === 0) return true
  const last = words.pop()!
  if (!suggestion.matchTitles) return true
  return suggestion.matchTitles.some((t) => {
    const title = ` ${titleKey(t)}`
    return words.every((w) => title.includes(` ${w}`)) && title.includes(` ${last}`)
  })
}

const MAX_SUGGESTIONS = 6

const firstAuthorKey = (s: BookSuggestion) => authorKey(s.author?.split(",")[0])

function dedupeSuggestions(list: BookSuggestion[]): BookSuggestion[] {
  const result: BookSuggestion[] = []
  for (const s of list) {
    const key = titleKey(s.title)
    const same = result.find((r) => {
      if (titleKey(r.title) !== key) return false
      const [a, b] = [firstAuthorKey(r), firstAuthorKey(s)]
      return !a || !b || a === b
    })
    if (!same) {
      result.push({ ...s })
      continue
    }
    for (const field of ["author", "publisher", "year", "pages", "isbn", "coverUrl"] as const) {
      if (same[field] === undefined && s[field] !== undefined) Object.assign(same, { [field]: s[field] })
    }
  }
  return result.slice(0, MAX_SUGGESTIONS)
}

const OPEN_LIBRARY_HEAD_START_MS = 1500

const suggestionCache = new Map<string, BookSuggestion[]>()

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))])

export async function searchBookSuggestions(
  input: { title: string; author: string },
  signal: AbortSignal,
  onPartial?: (books: BookSuggestion[]) => void
): Promise<BookSuggestion[]> {
  const title = input.title.trim()
  const author = input.author.trim()
  const cacheKey = `${normalize(title)}|${normalize(author)}`
  const cached = suggestionCache.get(cacheKey)
  if (cached) return cached

  const wantsPrefix = (text: string) => text !== "" && asPrefix(text) !== text
  const search = (prefix: boolean) =>
    openLibrarySuggestions(title, author, signal, prefix).catch(() => [] as BookSuggestion[])
  const withPrefix = wantsPrefix(title) || wantsPrefix(author)

  const keepFirst = (list: BookSuggestion[], keep: boolean) =>
    list.filter((s, i) => (keep && i === 0) || matchesTypedTitle(title, s))
  let exact: BookSuggestion[] | undefined
  let prefixed: BookSuggestion[] | undefined = withPrefix ? undefined : []
  const merged = () => dedupeSuggestions([...keepFirst(exact ?? [], !withPrefix), ...keepFirst(prefixed ?? [], true)])
  const report = () => {
    const partial = merged()
    if (partial.length > 0 && !signal.aborted) onPartial?.(partial)
  }
  const openLibrary = Promise.all([
    search(false).then((r) => {
      exact = r
      report()
    }),
    withPrefix
      ? search(true).then((r) => {
          prefixed = r
          report()
        })
      : undefined,
  ]).then(merged)
  const google = googleQuotaHit
    ? Promise.resolve([] as BookSuggestion[])
    : googleSuggestions(title, author, signal)
        .then(dedupeSuggestions)
        .catch(() => [] as BookSuggestion[])

  let result = await withTimeout(openLibrary, OPEN_LIBRARY_HEAD_START_MS)
  if (!result?.length) {
    const fromGoogle = await google
    result = fromGoogle.length > 0 ? fromGoogle : await openLibrary
  }
  if (signal.aborted) throw new DOMException("Aborted", "AbortError")
  if (result.length > 0) suggestionCache.set(cacheKey, result)
  return result
}
