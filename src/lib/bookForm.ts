import type { BookSuggestion } from "@/lib/bookLookup"
import { genresPatch } from "@/lib/genres"
import { bookPerson } from "@/lib/people"
import { normalize } from "@/lib/text"
import type { Book, BookDraft, LibrarySettings } from "@/lib/types"

export interface FormValues {
  title: string
  author: string
  publisher: string
  genres: string[]
  year: string
  pages: string
  isbn: string
  coverUrl: string
  coverRemoved: boolean
  read: boolean
  person: string
}

export const toValues = (book: Book | null, settings?: LibrarySettings): FormValues => {
  return {
    title: book?.title ?? "",
    author: book?.author ?? "",
    publisher: book?.publisher ?? "",
    genres: book?.genres ?? [],
    year: book?.year ? String(book.year) : "",
    pages: book?.pages ? String(book.pages) : "",
    isbn: book?.isbn ?? "",
    coverUrl: book?.coverUrl ?? "",
    coverRemoved: Boolean(book?.coverChecked && !book.coverUrl),
    read: book?.read ?? false,
    person: settings ? bookPerson(book ?? {}, settings) : (book?.person ?? ""),
  }
}

export const toDraft = (values: FormValues): BookDraft => {
  const text = (v: string) => v.trim() || undefined
  const year = parseInt(values.year, 10)
  const pages = parseInt(values.pages, 10)
  return {
    title: text(values.title),
    author: text(values.author),
    publisher: text(values.publisher),
    genres: genresPatch(values.genres),
    year: Number.isFinite(year) ? year : undefined,
    pages: Number.isFinite(pages) && pages > 0 ? pages : undefined,
    isbn: text(values.isbn.replace(/[^0-9Xx]/g, "")),
    coverUrl: text(values.coverUrl),
    coverChecked: values.coverUrl.trim() || values.coverRemoved ? true : undefined,
    read: values.read,
    person: text(values.person),
  }
}

export const applySuggestion = (values: FormValues, s: BookSuggestion): FormValues => {
  return {
    ...values,
    title: s.title,
    author: s.author ?? values.author,
    publisher: s.publisher ?? values.publisher,
    year: s.year ? String(s.year) : values.year,
    pages: s.pages ? String(s.pages) : values.pages,
    isbn: s.isbn ?? values.isbn,
    coverUrl: s.coverUrl ?? values.coverUrl,
    coverRemoved: s.coverUrl ? false : values.coverRemoved,
  }
}

export const identityChanged = (editing: Book | null, draft: BookDraft): boolean => {
  if (!editing) return true
  return draft.title !== editing.title || draft.author !== editing.author || draft.isbn !== editing.isbn
}

export const coverSearchKey = (draft: BookDraft): string => {
  return [draft.title, draft.author, draft.publisher, draft.isbn].map((v) => normalize(v ?? "")).join("|")
}
