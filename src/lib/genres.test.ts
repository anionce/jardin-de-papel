import { describe, expect, it } from "vitest"
import { addGenre, cleanGenres, genreUsage, genresPatch, hasGenre, removeGenre, renameGenre, suggestedGenres, untaggedBooks } from "@/lib/genres"
import { makeBook } from "@/test/factories"

describe("cleanGenres", () => {
  it("drops empty values and case or accent duplicates", () => {
    expect(cleanGenres([" Novela ", "novela", "", "Poesía", "poesia"])).toEqual(["Novela", "Poesía"])
  })
})

describe("genresPatch", () => {
  it("returns undefined for an empty list so the field is removed", () => {
    expect(genresPatch([" "])).toBeUndefined()
  })
})

describe("genre edits", () => {
  const book = makeBook({ genres: ["Novela", "Poesía"] })

  it("detects a genre ignoring case and accents", () => {
    expect(hasGenre(book, "poesia")).toBe(true)
    expect(hasGenre(book, "Ensayo")).toBe(false)
  })

  it("adds a genre without repeating it", () => {
    expect(addGenre(book, "Ensayo")).toEqual(["Novela", "Poesía", "Ensayo"])
    expect(addGenre(book, "novela")).toEqual(["Novela", "Poesía"])
  })

  it("removes a genre ignoring case and accents", () => {
    expect(removeGenre(book, "POESIA")).toEqual(["Novela"])
    expect(removeGenre(makeBook({ genres: ["Novela"] }), "Novela")).toBeUndefined()
  })

  it("renames a genre and merges it with an existing one", () => {
    expect(renameGenre(book, "Poesía", "Lírica")).toEqual(["Novela", "Lírica"])
    expect(renameGenre(book, "Poesía", "Novela")).toEqual(["Novela"])
  })
})

describe("genreUsage", () => {
  it("counts books per genre, most used first, and books without genre", () => {
    const a = makeBook({ genres: ["Novela"] })
    const b = makeBook({ genres: ["Novela", "Ensayo"] })
    const c = makeBook()
    expect(genreUsage([a, b, c])).toEqual({
      rows: [
        { name: "Novela", ids: [a.id, b.id] },
        { name: "Ensayo", ids: [b.id] },
      ],
      withoutGenre: 1,
    })
  })
})

describe("untaggedBooks / suggestedGenres", () => {
  const tagged = makeBook({ author: "Kate Morton", title: "El jardín olvidado", genres: ["Misterio", "Histórica"] })
  const popular = makeBook({ author: "Otro", genres: ["Novela"] })
  const popular2 = makeBook({ author: "Otra", genres: ["Novela"] })
  const pending = makeBook({ author: "Kate Morton", title: "Las horas distantes" })
  const earlier = makeBook({ author: "Amor Towles", title: "Normas de cortesía" })

  it("lists books without genre by author, leaving out the skipped ones", () => {
    const books = [tagged, pending, earlier, popular]
    expect(untaggedBooks(books, new Set())).toEqual([earlier, pending])
    expect(untaggedBooks(books, new Set([earlier.id]))).toEqual([pending])
  })

  it("suggests the author's genres first, then the most used ones", () => {
    expect(suggestedGenres(pending, [tagged, popular, popular2, pending])).toEqual(["Misterio", "Histórica", "Novela"])
    expect(suggestedGenres(earlier, [tagged, popular, popular2, earlier], 1)).toEqual(["Novela"])
  })
})
