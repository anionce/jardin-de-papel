import { describe, expect, it } from "vitest"
import {
  applyWorkMatches,
  booksByAuthor,
  bookshopSearchUrl,
  hideWork,
  isByAuthor,
  otherWorks,
  workMatchRequest,
  type AuthorWork,
  type OpenLibraryWorkDoc,
} from "@/lib/authorWorks"
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

describe("workMatchRequest / applyWorkMatches", () => {
  const work = (key: string, title: string): AuthorWork => ({ key, title, buyUrl: bookshopSearchUrl(title, "Kate Morton") })
  const works = [work("/works/1", "The House at Riverton"), work("/works/2", "The Distant Hours"), work("/works/3", "Homecoming")]

  it("sends each owned title once and the candidate works", () => {
    const owned = [makeBook({ title: "La casa de Riverton" }), makeBook({ title: "La casa de Riverton" }), makeBook({ title: "" })]
    expect(workMatchRequest("Kate Morton", owned, works.slice(0, 1))).toEqual({
      author: "Kate Morton",
      owned: ["La casa de Riverton"],
      candidates: [{ key: "/works/1", title: "The House at Riverton" }],
    })
  })

  it("hides works marked as owned and adds the Spanish title to the bookshop link", () => {
    const result = applyWorkMatches(
      works,
      [
        { key: "/works/1", ownedTitle: "", show: false, spanishTitle: "La casa de Riverton" },
        { key: "/works/2", ownedTitle: "", show: true, spanishTitle: "Las horas distantes" },
      ],
      [],
      "Kate Morton"
    )
    expect(result.map((w) => w.title)).toEqual(["The Distant Hours", "Homecoming"])
    expect(result[0].spanishTitle).toBe("Las horas distantes")
    expect(result[0].buyUrl).toBe(bookshopSearchUrl("Las horas distantes", "Kate Morton"))
    expect(result[1].spanishTitle).toBeUndefined()
  })
})

describe("applyWorkMatches safety net", () => {
  const works: AuthorWork[] = [
    { key: "/works/1", title: "The Secret Keeper", buyUrl: "" },
    { key: "/works/2", title: "The Lake House", buyUrl: "" },
  ]

  it("hides works whose Spanish title or matched owned title is already on the shelf, even if marked to show", () => {
    const owned = [makeBook({ title: "El cumpleaños secreto" }), makeBook({ title: "El último adiós" })]
    const result = applyWorkMatches(
      works,
      [
        { key: "/works/1", ownedTitle: "", show: true, spanishTitle: "El cumpleaños secreto" },
        { key: "/works/2", ownedTitle: "El último adiós", show: true, spanishTitle: "" },
      ],
      owned,
      "Kate Morton"
    )
    expect(result).toEqual([])
  })
})
