export interface Book {
  id: string
  title?: string
  author?: string
  publisher?: string
  genres?: string[]
  genre?: string
  year?: number
  pages?: number
  isbn?: string
  coverUrl?: string
  coverChecked?: boolean
  workKey?: string
  workChecked?: boolean
  workVersion?: number
  distinctFrom?: string[]
  read: boolean
  goodreadsId?: string
  addedBy?: string
  owner?: string
  person?: string
  createdAt: number
}

export type BookDraft = Omit<Book, "id" | "createdAt" | "addedBy">

export interface LibrarySettings {
  people: string[]
  defaultPerson: string
}

export type ReadFilter = "all" | "read" | "unread"
export type SortField = "recent" | "title" | "author" | "year" | "pages"
export type SortKey = `${SortField}-${"asc" | "desc"}`
