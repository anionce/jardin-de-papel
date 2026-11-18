import { describe, expect, it } from "vitest"
import { TRUSTED_WORK_VERSION } from "@/lib/bookLookup"
import {
  duplicateReason,
  findDuplicateGroups,
  markDistinctPatches,
  mergeMissingFields,
  similarBooksFinder,
} from "@/lib/duplicates"
import { makeBook } from "@/test/factories"

describe("duplicateReason", () => {
  it("matches the same author and title written differently", () => {
    expect(
      duplicateReason({ title: "La sombra del viento", author: "Carlos Ruiz Zafón" }, { title: "Sombra del viento: novela", author: "carlos ruiz zafon" })
    ).toBe("título")
  })

  it("does not match different books of a series", () => {
    expect(
      duplicateReason({ title: "Harry Potter y la piedra filosofal", author: "J.K. Rowling" }, { title: "Harry Potter y la cámara secreta", author: "J.K. Rowling" })
    ).toBeNull()
  })

  it("matches translations through a trusted Open Library work", () => {
    const work = { workKey: "/works/OL1W", workVersion: TRUSTED_WORK_VERSION }
    expect(duplicateReason({ title: "The Shadow of the Wind", ...work }, { title: "La sombra del viento", ...work })).toBe("obra")
  })

  it("ignores works found with an old lookup version", () => {
    const work = { workKey: "/works/OL1W", workVersion: TRUSTED_WORK_VERSION - 1 }
    expect(duplicateReason({ title: "A", ...work }, { title: "B", ...work })).toBeNull()
  })
})

describe("findDuplicateGroups", () => {
  it("groups transitive duplicates and keeps the strongest reason", () => {
    const work = { workKey: "/works/OL1W", workVersion: TRUSTED_WORK_VERSION }
    const a = makeBook({ title: "Dune", author: "Frank Herbert" })
    const b = makeBook({ title: "Dune", author: "Frank Herbert", ...work })
    const c = makeBook({ title: "Duna", author: "F. Herbert", ...work })
    const other = makeBook({ title: "Hijos de Dune", author: "Frank Herbert" })

    expect(findDuplicateGroups([a, b, c, other])).toEqual([{ books: [a, b, c], reason: "obra" }])
  })

  it("skips pairs marked as not duplicates", () => {
    const a = makeBook({ title: "Dune", author: "Frank Herbert" })
    const b = makeBook({ title: "Dune", author: "Frank Herbert", distinctFrom: [a.id] })
    expect(findDuplicateGroups([a, b])).toEqual([])
  })
})

describe("similarBooksFinder", () => {
  it("finds existing books that look like a new draft", () => {
    const dune = makeBook({ title: "Dune", author: "Frank Herbert" })
    const find = similarBooksFinder([dune, makeBook({ title: "Patria", author: "Aramburu" })])
    expect(find({ title: "dune", author: "frank herbert" })).toEqual([dune])
    expect(find({ title: "Dune", author: "Otro" })).toEqual([])
  })
})

describe("mergeMissingFields", () => {
  it("copies missing data, joins genres and keeps read", () => {
    const keep = makeBook({ title: "Dune", genres: ["Novela"] })
    const other = makeBook({ title: "Duna", year: 1965, genres: ["Ciencia ficción"], read: true })
    expect(mergeMissingFields(keep, [other])).toEqual({
      year: 1965,
      genres: ["Novela", "Ciencia ficción"],
      read: true,
    })
  })

  it("returns an empty patch when nothing is missing", () => {
    expect(mergeMissingFields(makeBook({ title: "A" }), [makeBook({ title: "B" })])).toEqual({})
  })
})

describe("markDistinctPatches", () => {
  it("makes every chosen book remember the rest, and the rest remember the chosen", () => {
    const a = makeBook({ distinctFrom: ["old"] })
    const b = makeBook()
    const c = makeBook()
    expect(markDistinctPatches([a, b, c], [a])).toEqual([
      { id: a.id, patch: { distinctFrom: ["old", b.id, c.id] } },
      { id: b.id, patch: { distinctFrom: [a.id] } },
      { id: c.id, patch: { distinctFrom: [a.id] } },
    ])
  })
})
