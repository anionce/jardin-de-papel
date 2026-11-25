import { describe, expect, it } from "vitest"
import { bookKey, DEFAULT_SORT, filterBooks, uniqueGenres, uniquePublishers, type LibraryQuery } from "@/lib/search"
import { makeBook } from "@/test/factories"

const query = (overrides: Partial<LibraryQuery> = {}): LibraryQuery => ({
  text: "",
  read: "all",
  genres: [],
  sort: DEFAULT_SORT,
  ...overrides,
})

describe("filterBooks", () => {
  const hobbit = makeBook({ title: "El hobbit", author: "Tolkien", year: 1937, read: true, genres: ["Fantasía"] })
  const dune = makeBook({ title: "Dune", author: "Frank Herbert", year: 1965, genres: ["Ciencia ficción"] })
  const patria = makeBook({ title: "Patria", author: "Fernando Aramburu", publisher: "Tusquets" })
  const books = [hobbit, dune, patria]

  it("requires every search word to appear in some field", () => {
    expect(filterBooks(books, query({ text: "tolkien 1937" }))).toEqual([hobbit])
    expect(filterBooks(books, query({ text: "tolkien 1965" }))).toEqual([])
  })

  it("ignores accents and case", () => {
    expect(filterBooks(books, query({ text: "FANTASIA" }))).toEqual([hobbit])
  })

  it("filters by read state", () => {
    expect(filterBooks(books, query({ read: "read" }))).toEqual([hobbit])
    expect(filterBooks(books, query({ read: "unread" }))).toEqual(expect.arrayContaining([dune, patria]))
  })

  it("keeps books with any of the chosen genres", () => {
    const result = filterBooks(books, query({ genres: ["Fantasía", "Ciencia ficción"] }))
    expect(result).toHaveLength(2)
    expect(result).not.toContain(patria)
  })

  it("sorts by year and leaves books without year at the end in both directions", () => {
    expect(filterBooks(books, query({ sort: "year-asc" }))).toEqual([hobbit, dune, patria])
    expect(filterBooks(books, query({ sort: "year-desc" }))).toEqual([dune, hobbit, patria])
  })

  it("sorts titles alphabetically", () => {
    expect(filterBooks(books, query({ sort: "title-asc" })).map((b) => b.title)).toEqual(["Dune", "El hobbit", "Patria"])
  })
})

describe("uniqueGenres", () => {
  it("returns each genre once, sorted", () => {
    const books = [makeBook({ genres: ["Novela", "Ensayo"] }), makeBook({ genres: ["Novela"] })]
    expect(uniqueGenres(books)).toEqual(["Ensayo", "Novela"])
  })
})

describe("uniquePublishers", () => {
  it("merges spellings and offers the most common one", () => {
    const books = [
      makeBook({ publisher: "Tusquets" }),
      makeBook({ publisher: "Tusquets" }),
      makeBook({ publisher: "TUSQUETS" }),
      makeBook({ publisher: "Anagrama " }),
    ]
    expect(uniquePublishers(books)).toEqual(["Anagrama", "Tusquets"])
  })
})

describe("bookKey", () => {
  it("prefers the Goodreads id", () => {
    expect(bookKey({ title: "Dune", goodreadsId: "42" })).toBe("gr:42")
  })

  it("falls back to normalized title and author", () => {
    expect(bookKey({ title: "Canción", author: "Ánne" })).toBe(bookKey({ title: "cancion", author: "anne" }))
  })
})

describe("filterBooks by person", () => {
  const settings = { people: ["Alex", "Sam"], defaultPerson: "Alex" }
  const mine = makeBook({ title: "Mine", person: "Alex" })
  const unassigned = makeBook({ title: "Unassigned" })
  const theirs = makeBook({ title: "Theirs", person: "Sam" })
  const books = [mine, unassigned, theirs]

  it("keeps the books of the chosen person, counting unassigned books for the default one", () => {
    expect(filterBooks(books, query({ person: "Alex", settings }))).toEqual(expect.arrayContaining([mine, unassigned]))
    expect(filterBooks(books, query({ person: "Sam", settings }))).toEqual([theirs])
  })

  it("keeps every book when no person is chosen", () => {
    expect(filterBooks(books, query({ person: null, settings }))).toHaveLength(3)
  })
})

describe("filterBooks by place", () => {
  const settings = { people: ["Alex"], defaultPerson: "Alex", shelves: [{ name: "Salón" }] }
  const onShelf = makeBook({ title: "Nada", shelf: "Salón" })
  const withNote = makeBook({ title: "Patria", location: "caja del trastero" })

  it("filters by shelf and finds books by their location note", () => {
    expect(filterBooks([onShelf, withNote], query({ shelf: "Salón", settings }))).toEqual([onShelf])
    expect(filterBooks([onShelf, withNote], query({ text: "trastero", settings }))).toEqual([withNote])
  })
})
