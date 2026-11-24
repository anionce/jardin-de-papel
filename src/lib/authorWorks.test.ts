import { describe, expect, it } from "vitest"
import { booksByAuthor, bookshopSearchUrl, hideWork, isByAuthor, otherWorks, type OpenLibraryWorkDoc } from "@/lib/authorWorks"
import { makeBook } from "@/test/factories"

const doc = (overrides: Partial<OpenLibraryWorkDoc>): OpenLibraryWorkDoc => ({
  key: "/works/OL1W",
  title: "Title",
  edition_count: 5,
  author_name: ["Jane Writer"],
  ...overrides,
})

describe("isByAuthor / booksByAuthor", () => {
  it("matches the author ignoring accents, case and punctuation", () => {
    expect(isByAuthor(makeBook({ author: "J. K. Rowling" }), "J.K. Rowling")).toBe(true)
    expect(isByAuthor(makeBook({ author: "Isabel Allende" }), "isabel allende")).toBe(true)
  })

  it("finds books written together with someone else", () => {
    expect(isByAuthor(makeBook({ author: "Douglas Preston y Lincoln Child" }), "Lincoln Child")).toBe(true)
  })

  it("does not match a different author with a similar name", () => {
    const books = [makeBook({ author: "Mary Higgins Clark" }), makeBook({ author: "Carol Higgins Clark" })]
    expect(booksByAuthor(books, "Mary Higgins Clark")).toHaveLength(1)
  })
})

describe("otherWorks", () => {
  it("leaves out works already on the shelf, by work or by title", () => {
    const owned = [makeBook({ workKey: "/works/OWNED", title: "Translated title" }), makeBook({ title: "The Sea Change" })]
    const works = otherWorks(
      [doc({ key: "/works/OWNED", title: "Original title" }), doc({ key: "/works/2", title: "The sea change" }), doc({ key: "/works/3", title: "After Julius" })],
      owned,
      "Jane Writer"
    )
    expect(works.map((w) => w.title)).toEqual(["After Julius"])
  })

  it("leaves out the original work of a translated book on the shelf", () => {
    const owned = [makeBook({ title: "Los años ligeros", workKey: "/works/SPANISH" })]
    const works = otherWorks([doc({ key: "/works/ORIGINAL", title: "Light Years" })], owned, "Jane Writer", ["/works/ORIGINAL"])
    expect(works).toEqual([])
  })

  it("merges repeated works and skips rare editions, collections and anthologies", () => {
    const works = otherWorks(
      [
        doc({ key: "/works/1", title: "Marking Time" }),
        doc({ key: "/works/2", title: "Marking Time (Cazalet Chronicle, Vol. 2)" }),
        doc({ key: "/works/3", title: "Obscure", edition_count: 1 }),
        doc({ key: "/works/4", title: "Elizabeth Jane Howard Omnibus" }),
        doc({ key: "/works/5", title: "Anthology", author_name: ["A", "B", "C"] }),
      ],
      [],
      "Jane Writer"
    )
    expect(works.map((w) => w.key)).toEqual(["/works/1"])
  })

  it("adds the cover and a bookshop search link", () => {
    const [work] = otherWorks([doc({ title: "After Julius", cover_i: 42, first_publish_year: 1965 })], [], "Jane Writer")
    expect(work).toMatchObject({
      year: 1965,
      coverUrl: "https://covers.openlibrary.org/b/id/42-M.jpg",
      buyUrl: bookshopSearchUrl("After Julius", "Jane Writer"),
    })
    expect(work.buyUrl).toContain("todostuslibros.com")
  })
})

describe("hidden works", () => {
  it("leaves out works the user marked as already owned", () => {
    const works = otherWorks([doc({ key: "/works/1", title: "Light Years" }), doc({ key: "/works/2", title: "After Julius" })], [], "Jane Writer", [], ["/works/1"])
    expect(works.map((w) => w.key)).toEqual(["/works/2"])
  })

  it("also leaves out other copies of a hidden work with the same title", () => {
    const works = otherWorks(
      [doc({ key: "/works/1", title: "Light Years" }), doc({ key: "/works/2", title: "The Light Years" })],
      [],
      "Jane Writer",
      [],
      ["/works/1"]
    )
    expect(works).toEqual([])
  })

  it("adds a work to the hidden list only once", () => {
    expect(hideWork(["/works/1"], "/works/1")).toEqual(["/works/1"])
    expect(hideWork(undefined, "/works/2")).toEqual(["/works/2"])
  })
})
