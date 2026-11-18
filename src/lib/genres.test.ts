import { describe, expect, it } from "vitest"
import { addGenre, cleanGenres, genreUsage, genresPatch, hasGenre, removeGenre, renameGenre } from "@/lib/genres"
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
