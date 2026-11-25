import { describe, expect, it } from "vitest"
import { buildCandidates, candidatesToDrafts, mergePatches, publisherPatches, shelfPatches } from "@/lib/photoImport"
import type { SpineReading } from "@/lib/shelfReading"
import { makeBook } from "@/test/factories"

const spine = (overrides: Partial<SpineReading>): SpineReading => ({
  title: "",
  author: "",
  publisher: "",
  uncertain: false,
  ...overrides,
})

describe("buildCandidates", () => {
  it("keeps every book read, in order, ready to be added", () => {
    const candidates = buildCandidates(
      [[spine({ title: "Nada", author: "Carmen Laforet", publisher: "Austral" }), spine({ title: "1984", author: "George Orwell" })]],
      []
    )
    expect(candidates.map((c) => [c.title, c.include])).toEqual([
      ["Nada", true],
      ["1984", true],
    ])
  })

  it("merges a book seen in two overlapping photos and keeps the data from both", () => {
    const candidates = buildCandidates(
      [
        [spine({ title: "Mystic River", author: "Lehane", uncertain: true })],
        [spine({ title: "mystic river", author: "Dennis Lehane", publisher: "RBA" })],
      ],
      []
    )
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({ title: "Mystic River", author: "Lehane", publisher: "RBA", uncertain: false })
  })

  it("keeps books with the same title by different authors apart", () => {
    const candidates = buildCandidates(
      [[spine({ title: "Patria", author: "Fernando Aramburu" }), spine({ title: "Patria", author: "R. A. Salvatore" })]],
      []
    )
    expect(candidates).toHaveLength(2)
  })

  it("marks books already in the library and leaves them out by default", () => {
    const owned = makeBook({ title: "Nada", author: "Carmen Laforet" })
    const [candidate] = buildCandidates([[spine({ title: "Nada", author: "Carmen Laforet" })]], [owned])
    expect(candidate.existing).toBe(owned)
    expect(candidate.include).toBe(false)
  })
})

describe("candidatesToDrafts", () => {
  it("turns the chosen candidates into unread books with their publisher", () => {
    const candidates = buildCandidates([[spine({ title: " Nada ", author: "Carmen Laforet", publisher: "Austral" })]], [])
    expect(candidatesToDrafts(candidates)).toEqual([{ title: "Nada", author: "Carmen Laforet", publisher: "Austral", read: false }])
  })

  it("skips unchosen and empty candidates", () => {
    const candidates = buildCandidates([[spine({ title: "Nada", author: "Carmen Laforet" })]], []).map((c) => ({ ...c, include: false }))
    expect(candidatesToDrafts(candidates)).toEqual([])
    expect(candidatesToDrafts([{ ...candidates[0], include: true, title: " ", author: "" }])).toEqual([])
  })
})

describe("publisherPatches", () => {
  it("gives the publisher read in the photo to owned books without one, so their edition cover is looked up again", () => {
    const owned = makeBook({ title: "Nada", author: "Carmen Laforet", coverUrl: "https://x/generic.jpg", coverChecked: true })
    const candidates = buildCandidates([[spine({ title: "Nada", author: "Carmen Laforet", publisher: "Austral" })]], [owned])
    expect(publisherPatches(candidates)).toEqual([
      { id: owned.id, patch: { publisher: "Austral", coverUrl: undefined, coverChecked: undefined } },
    ])
  })

  it("keeps a photo the user uploaded as cover", () => {
    const owned = makeBook({ title: "Nada", author: "Carmen Laforet", coverUrl: "data:image/jpeg;base64,abc" })
    const candidates = buildCandidates([[spine({ title: "Nada", author: "Carmen Laforet", publisher: "Austral" })]], [owned])
    expect(publisherPatches(candidates)).toEqual([{ id: owned.id, patch: { publisher: "Austral" } }])
  })

  it("never overwrites a publisher the book already has, nor touches new books", () => {
    const owned = makeBook({ title: "Nada", author: "Carmen Laforet", publisher: "Destino" })
    const candidates = buildCandidates(
      [[spine({ title: "Nada", author: "Carmen Laforet", publisher: "Austral" }), spine({ title: "1984", author: "George Orwell", publisher: "Debolsillo" })]],
      [owned]
    )
    expect(publisherPatches(candidates)).toEqual([])
  })
})

describe("placing books from a photo on a shelf", () => {
  const owned = makeBook({ title: "Nada", author: "Carmen Laforet" })
  const placed = makeBook({ title: "1984", author: "George Orwell", shelf: "Salón" })
  const candidates = buildCandidates(
    [[spine({ title: "Nada", author: "Carmen Laforet" }), spine({ title: "1984", author: "George Orwell" }), spine({ title: "Patria", author: "Fernando Aramburu" })]],
    [owned, placed]
  )

  it("puts new books on the chosen shelf", () => {
    expect(candidatesToDrafts(candidates, "Salón")).toEqual([{ title: "Patria", author: "Fernando Aramburu", publisher: undefined, read: false, shelf: "Salón" }])
  })

  it("moves the owned books seen in the photo to that shelf, unless they are already there", () => {
    expect(shelfPatches(candidates, "Salón")).toEqual([{ id: owned.id, patch: { shelf: "Salón" } }])
    expect(shelfPatches(candidates, undefined)).toEqual([])
  })

  it("merges several changes to the same book", () => {
    expect(mergePatches([{ id: "a", patch: { publisher: "Austral" } }], [{ id: "a", patch: { shelf: "Salón" } }, { id: "b", patch: { shelf: "Salón" } }])).toEqual([
      { id: "a", patch: { publisher: "Austral", shelf: "Salón" } },
      { id: "b", patch: { shelf: "Salón" } },
    ])
  })
})
