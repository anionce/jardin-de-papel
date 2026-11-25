import { describe, expect, it } from "vitest"
import { applySuggestion, coverSearchKey, identityChanged, toDraft, toValues } from "@/lib/bookForm"
import { makeBook } from "@/test/factories"

describe("toValues / toDraft", () => {
  it("round-trips a book through the form", () => {
    const book = makeBook({ title: "Dune", author: "Frank Herbert", year: 1965, pages: 604, isbn: "123", genres: ["Novela"], read: true, coverUrl: "https://x/c.jpg" })
    expect(toDraft(toValues(book))).toEqual({
      title: "Dune",
      author: "Frank Herbert",
      publisher: undefined,
      genres: ["Novela"],
      year: 1965,
      pages: 604,
      isbn: "123",
      coverUrl: "https://x/c.jpg",
      coverChecked: true,
      read: true,
      person: undefined,
    })
  })

  it("turns empty or invalid fields into undefined", () => {
    const draft = toDraft({ ...toValues(null), title: "  ", year: "abc", pages: "0", isbn: "978-84-9759-220-8" })
    expect(draft).toMatchObject({ title: undefined, year: undefined, pages: undefined, isbn: "9788497592208" })
  })

  it("marks the cover as checked only when it was removed on purpose or set", () => {
    expect(toDraft(toValues(null)).coverChecked).toBeUndefined()
    expect(toDraft({ ...toValues(null), coverRemoved: true }).coverChecked).toBe(true)
  })

  it("remembers a removed cover when editing", () => {
    expect(toValues(makeBook({ coverChecked: true })).coverRemoved).toBe(true)
  })
})

describe("applySuggestion", () => {
  it("fills the form keeping what the suggestion does not bring", () => {
    const values = { ...toValues(null), author: "Typed author", pages: "300", coverRemoved: true }
    expect(applySuggestion(values, { id: "g:1", title: "Dune", year: 1965, coverUrl: "https://x/c.jpg" })).toMatchObject({
      title: "Dune",
      author: "Typed author",
      year: "1965",
      pages: "300",
      coverUrl: "https://x/c.jpg",
      coverRemoved: false,
    })
  })
})

describe("identityChanged", () => {
  const editing = makeBook({ title: "Dune", author: "Frank Herbert" })

  it("is always true for a new book", () => {
    expect(identityChanged(null, { read: false })).toBe(true)
  })

  it("only changes with title, author or ISBN", () => {
    expect(identityChanged(editing, { title: "Dune", author: "Frank Herbert", year: 2000, read: true })).toBe(false)
    expect(identityChanged(editing, { title: "Duna", author: "Frank Herbert", read: false })).toBe(true)
  })
})

describe("coverSearchKey", () => {
  it("ignores case and accents", () => {
    expect(coverSearchKey({ title: "Canción", read: false })).toBe(coverSearchKey({ title: "cancion", read: true }))
  })
})

describe("person in the form", () => {
  const settings = { people: ["Alex", "Sam"], defaultPerson: "Sam" }

  it("starts new books with the default person", () => {
    expect(toValues(null, settings).person).toBe("Sam")
  })

  it("shows the stored person, or the default one for unassigned books", () => {
    expect(toValues(makeBook({ person: "Alex" }), settings).person).toBe("Alex")
    expect(toValues(makeBook(), settings).person).toBe("Sam")
  })

  it("saves the chosen person", () => {
    expect(toDraft({ ...toValues(null, settings), person: "Alex" }).person).toBe("Alex")
  })
})

describe("location in the form", () => {
  it("keeps the shelf and the location note, and drops them when empty", () => {
    const values = toValues(makeBook({ shelf: "Salón", location: "balda de arriba" }))
    expect(values).toMatchObject({ shelf: "Salón", location: "balda de arriba" })
    expect(toDraft({ ...values, location: " detrás " })).toMatchObject({ shelf: "Salón", location: "detrás" })
    const cleared = toDraft({ ...values, shelf: "", location: " " })
    expect(cleared.shelf).toBeUndefined()
    expect(cleared.location).toBeUndefined()
  })
})
