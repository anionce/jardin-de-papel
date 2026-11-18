import { authorKey, cleanTitle, normalize, titleKey } from "@/lib/text"
import type { Book } from "@/lib/types"

const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined

/** Google Books cortó por cuota diaria: hay que seguir sin Google y no
 * dar por buscada la portada (se reintentará otro día). */
export class CoverQuotaError extends Error {}

type LookupInput = Pick<Book, "title" | "author" | "isbn">

interface OpenLibraryDoc {
  key?: string
  /** Mediana de páginas entre sus ediciones. */
  number_of_pages_median?: number
  cover_i?: number
  title?: string
  /** La edición que coincidió con la búsqueda (p. ej. la traducción). */
  editions?: { docs?: { title?: string }[] }
}

/**
 * Versión de la búsqueda de obra. La v1 se fiaba del primer resultado y unía
 * libros distintos de una saga (todos los Harry Potter → "La piedra
 * filosofal"); las obras guardadas con una versión anterior no se usan para
 * duplicados y se vuelven a buscar.
 */
export const WORK_LOOKUP_VERSION = 3

/** Desde la v2 la obra es fiable (la v3 sólo añade el número de páginas). */
export const TRUSTED_WORK_VERSION = 2

/** Portadas de Google Books para una búsqueda, en orden de relevancia. */
async function googleThumbnails(query: string, maxResults = 5): Promise<string[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults), fields: "items(volumeInfo/imageLinks)" })
  if (GOOGLE_BOOKS_KEY) params.set("key", GOOGLE_BOOKS_KEY)
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
  if (res.status === 429) throw new CoverQuotaError("Google Books: cuota diaria agotada")
  if (!res.ok) return []
  const data = (await res.json()) as { items?: { volumeInfo?: { imageLinks?: { thumbnail?: string } } }[] }
  return (data.items ?? []).flatMap((i) => {
    const thumbnail = i.volumeInfo?.imageLinks?.thumbnail
    // https + sin el "doblez de página" que Google pinta en algunas portadas.
    return thumbnail ? [thumbnail.replace(/^http:/, "https:").replace("&edge=curl", "")] : []
  })
}

async function googleBooks(query: string): Promise<string | undefined> {
  return (await googleThumbnails(query))[0]
}

/**
 * Busca la obra en Open Library. Con ISBN es exacto. Sin ISBN se usa la
 * búsqueda general (`q`), que también mira los títulos de ediciones y
 * traducciones — así "The Shadow of the Wind" y "La sombra del viento" dan
 * la misma obra — filtrada por autor y ordenada por número de ediciones,
 * para quedarse con la obra principal y no con copias sueltas.
 */
async function openLibraryDoc(book: LookupInput): Promise<OpenLibraryDoc | undefined> {
  const search = async (params: Record<string, string>) => {
    // lang fijo: si no, Open Library elige la "edición que coincide" según el
    // idioma del navegador y en español devuelve otra que no es la nuestra.
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
  // Sin autor, un título suelto ("Nada", "Patria") es demasiado ambiguo.
  if (!book.title || !book.author) return undefined
  // La búsqueda general es laxa: "Harry Potter and the Chamber of Secrets"
  // devuelve primero "The Philosopher's Stone". Sólo vale una obra cuyo
  // título, o el de la edición que coincidió, sea de verdad el nuestro.
  const wanted = titleKey(book.title)
  const docs = await search({ q: cleanTitle(book.title), author: book.author })
  return docs.find(
    (doc) => titleKey(doc.title) === wanted || doc.editions?.docs?.some((e) => titleKey(e.title) === wanted)
  )
}

function openLibraryCover(doc: OpenLibraryDoc | undefined): string | undefined {
  return doc?.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined
}

export interface LookupResult {
  workKey?: string
  pages?: number
  coverUrl?: string
  /** false si no se pudo consultar Google por cuota: la portada no está "buscada del todo". */
  coverComplete: boolean
}

/**
 * Una sola pasada por libro: obra de Open Library (para duplicados) y
 * portada. La portada prueba primero Google Books (más ediciones en
 * español) y si no, la de Open Library.
 */
export async function lookupBook(
  book: LookupInput,
  options: { cover: boolean; useGoogle: boolean }
): Promise<LookupResult> {
  const doc = await openLibraryDoc(book).catch(() => undefined)
  const result: LookupResult = { workKey: doc?.key, pages: doc?.number_of_pages_median, coverComplete: true }
  if (!options.cover) return result

  if (options.useGoogle) {
    const title = book.title ? cleanTitle(book.title) : undefined
    const queries = [
      book.isbn && `isbn:${book.isbn}`,
      title && (book.author ? `intitle:${title} inauthor:${book.author}` : `intitle:${title}`),
    ].filter((q): q is string => Boolean(q))
    for (const query of queries) {
      try {
        result.coverUrl = await googleBooks(query)
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

  result.coverUrl = openLibraryCover(doc)
  if (result.coverUrl) result.coverComplete = true
  return result
}

export interface EditionMatch {
  coverUrl?: string
  isbn?: string
}

/**
 * Edición concreta de una editorial (p. ej. "Cien años de soledad" de
 * Debolsillo vs. de Cátedra): su portada y su ISBN. Open Library filtra por
 * editorial y devuelve la edición que coincide; sólo vale si el título es el
 * nuestro, para no coger otro libro de la misma editorial.
 */
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
    const isbns = edition.isbn ?? []
    return {
      coverUrl: edition.cover_i ? `https://covers.openlibrary.org/b/id/${edition.cover_i}-M.jpg` : undefined,
      isbn: isbns.find((i) => i.length === 13) ?? isbns[0],
    }
  }
  return undefined
}

interface OpenLibraryEdition {
  title?: string
  covers?: number[]
  languages?: { key: string }[]
}

/**
 * Obras de Open Library de las que sacar portadas. Con autor (o ISBN), la
 * obra exacta; sin autor, hasta dos obras cuyo título sea el nuestro (para
 * portadas sirve: sólo se enseñan, no se usan para duplicados).
 */
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
    .filter((d) => d.key && (titleKey(d.title) === wanted || d.editions?.docs?.some((e) => titleKey(e.title) === wanted)))
    .slice(0, 2)
    .map((d) => d.key!)
}

/**
 * Todas las portadas que se encuentran para un libro, para ir probando una
 * tras otra con "Buscar portada". Orden: la edición de su editorial, la de su
 * ISBN, las ediciones con su mismo título (mismo idioma), otras de Google y,
 * al final, ediciones en otros idiomas.
 */
export async function findCoverCandidates(
  book: Pick<Book, "title" | "author" | "isbn" | "publisher" | "workKey">
): Promise<string[]> {
  const first: string[] = []
  const last: string[] = []
  const olCover = (id: number) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`
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
      const covers = (e.covers ?? []).filter((id) => id > 0).map(olCover)
      if (wanted && titleKey(e.title) === wanted) sameTitle.push(...covers)
      else if (e.languages?.some((l) => l.key === "/languages/spa")) spanish.push(...covers)
      else last.push(...covers)
    }
    first.push(...sameTitle, ...spanish)
  }
  first.push(...byTitle)
  return [...new Set([...first, ...last])]
}

/** Resultado de la búsqueda mientras se escribe título/autor en el formulario. */
export interface BookSuggestion {
  id: string
  title: string
  /** Títulos con los que comparar lo escrito; sin ellos no se filtra. */
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
  if (res.status === 429) throw new CoverQuotaError("Google Books: cuota diaria agotada")
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
        coverUrl: v.imageLinks?.thumbnail?.replace(/^http:/, "https:").replace("&edge=curl", ""),
      },
    ]
  })
}

/**
 * Mientras se escribe, la última palabra suele estar a medias ("abadia de
 * northa"): con `*` Open Library la busca como prefijo. Se quitan los
 * caracteres especiales de su sintaxis de búsqueda.
 *
 * Sólo con 4 letras o más: un prefijo corto ("de*", "la*") abarca tantas
 * palabras que Open Library tarda 10 s y acaba dando error.
 */
function asPrefix(text: string): string {
  const clean = text.replace(/[:"()[\]{}^~*?\\/!+-]/g, " ").replace(/\s+/g, " ").trim()
  if (/(^|\s)\p{L}{4,}$/u.test(clean)) return `${clean}*`
  // Última palabra corta y a medias ("la sombra del vie"): buscarla entera
  // estropea el resultado, así que se deja fuera (el filtro posterior sí la usa).
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
  /** Edición que mejor coincide, preferiblemente en español (lang=es). */
  editions?: {
    docs?: { title?: string; publisher?: string[]; isbn?: string[]; publish_date?: string[]; cover_i?: number }[]
  }
}

/**
 * Búsqueda general (`q`), que también mira títulos de traducciones: "la
 * abadia de northa" encuentra "Northanger Abbey" y, con lang=es, su edición
 * en español (título, editorial, ISBN, año y portada de esa misma edición).
 */
/** Si Open Library no contesta en este tiempo, se da por fallida la búsqueda. */
const OPEN_LIBRARY_TIMEOUT_MS = 6000

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
    // Sin autor suelen ser fichas sueltas e incompletas.
    if (!d.title || !d.author_name?.length) return []
    const edition = d.editions?.docs?.[0]
    const cover = edition?.cover_i ?? d.cover_i
    const isbns = edition?.isbn ?? []
    return [
      {
        id: `ol:${d.key}`,
        title: fixInvertedArticle(edition?.title ?? d.title),
        // Si Open Library no dice qué edición coincidió (pasa con
        // traducciones), no hay con qué comprobar: no se filtra.
        matchTitles: edition?.title ? [edition.title, d.title] : undefined,
        author: d.author_name.join(", "),
        publisher: edition?.publisher?.[0],
        year: parseYear(edition?.publish_date?.[0]?.match(/\d{4}/)?.[0]) ?? d.first_publish_year,
        pages: d.number_of_pages_median,
        isbn: isbns.find((i) => i.length === 13) ?? isbns[0],
        coverUrl: cover ? `https://covers.openlibrary.org/b/id/${cover}-M.jpg` : undefined,
      },
    ]
  })
}

/** Catálogos de biblioteca: "Abadia de Northanger, La" → "La Abadia de Northanger". */
function fixInvertedArticle(title: string): string {
  const fixed = title.replace(/^(.+),\s*(el|la|los|las|lo|un|una|the|a|an)$/i, "$2 $1")
  // Y con mayúscula inicial ("abadía de Northanger" → "Abadía de Northanger").
  return fixed.charAt(0).toLocaleUpperCase("es") + fixed.slice(1)
}

/**
 * Quita resultados que no contienen lo escrito (la búsqueda general a veces
 * cuela libros sin relación). Las palabras completas deben estar en el
 * título; la última, que puede estar a medias, como principio de palabra.
 */
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

/** Google Books sin cuota hoy: no gastar una petición por cada tecla. */
let googleQuotaHit = false

const MAX_SUGGESTIONS = 6

/** Primer autor comparable: "Jane Austen, Javier Blanco" → "janeausten". */
const firstAuthorKey = (s: BookSuggestion) => authorKey(s.author?.split(",")[0])

/**
 * Google y Open Library devuelven el mismo libro varias veces (reimpresiones,
 * fichas incompletas). Se juntan los de mismo título y autor — o sin autor —
 * en uno, completando los datos que le falten con los de los repetidos.
 */
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

/** Open Library da mejores datos, pero a veces tarda mucho: se le da este margen. */
const OPEN_LIBRARY_HEAD_START_MS = 1500

const suggestionCache = new Map<string, BookSuggestion[]>()

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))])

/**
 * Sugerencias para rellenar el formulario. Se pregunta a Open Library
 * (edición en español, encuentra traducciones) y a Google Books (rápido) a la
 * vez: si Open Library contesta a tiempo se usa lo suyo; si no, lo de Google;
 * y si Google no tiene nada, se espera a Open Library.
 */
export async function searchBookSuggestions(
  input: { title: string; author: string },
  signal: AbortSignal,
  /** Resultados parciales en cuanto llega la primera respuesta. */
  onPartial?: (books: BookSuggestion[]) => void
): Promise<BookSuggestion[]> {
  const title = input.title.trim()
  const author = input.author.trim()
  const cacheKey = `${normalize(title)}|${normalize(author)}`
  const cached = suggestionCache.get(cacheKey)
  if (cached) return cached

  // Dos búsquedas a la vez: con las palabras tal cual (ordena mejor: "patria"
  // → la de Aramburu) y con la última como prefijo (encuentra "northa…"). Las
  // de palabras exactas van primero.
  const wantsPrefix = (text: string) => text !== "" && asPrefix(text) !== text
  const search = (prefix: boolean) =>
    openLibrarySuggestions(title, author, signal, prefix).catch(() => [] as BookSuggestion[])
  const withPrefix = wantsPrefix(title) || wantsPrefix(author)
  // El primero de Open Library casi siempre es bueno (aunque sea una
  // traducción que el filtro no sabe comprobar) y se queda siempre; con la
  // última palabra a medias, sólo el de la búsqueda por prefijo.
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
        .catch((error) => {
          // Sin cuota hoy: no gastar una petición por cada tecla.
          if (error instanceof CoverQuotaError) googleQuotaHit = true
          return [] as BookSuggestion[]
        })

  let result = await withTimeout(openLibrary, OPEN_LIBRARY_HEAD_START_MS)
  if (!result?.length) {
    const fromGoogle = await google
    result = fromGoogle.length > 0 ? fromGoogle : await openLibrary
  }
  if (signal.aborted) throw new DOMException("Aborted", "AbortError")
  if (result.length > 0) suggestionCache.set(cacheKey, result)
  return result
}
