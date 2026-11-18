import type { Book } from "@/lib/types"

let nextId = 0

export const makeBook = (overrides: Partial<Book> = {}): Book => {
  nextId++
  return { id: `book-${nextId}`, read: false, createdAt: nextId, ...overrides }
}
