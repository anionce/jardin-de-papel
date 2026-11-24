import { describe, expect, it } from "vitest"
import { sagaProgress, seriesFromTitle } from "@/lib/sagas"
import { makeBook } from "@/test/factories"

const find = (name: string, books = shelf) => sagaProgress(books).find((s) => s.name === name)

const shelf = [
  makeBook({ title: "Los años ligeros (Crónicas de los Cazalet, #1)", author: "Elizabeth Jane Howard" }),
  makeBook({ title: "Tiempo de espera", author: "Elizabeth Jane Howard" }),
  makeBook({ title: "Confusion", author: "Elizabeth Jane Howard" }),
  makeBook({ title: "Forrest Gump", author: "Winston Groom" }),
  makeBook({ title: "Gump & Co.", author: "Winston Groom" }),
  makeBook({ title: "Flanagan 007 (Flanagan, #7)", author: "Andreu Martín" }),
  makeBook({ title: "No te laves las manos, Flanagan (Flanagan, #3)", author: "Andreu Martín" }),
  makeBook({ title: "Some Standalone", author: "Elizabeth Jane Howard" }),
]

describe("seriesFromTitle", () => {
  it("reads the Goodreads series suffix", () => {
    expect(seriesFromTitle("Flanagan 007 (Flanagan, #7)")).toEqual({ name: "Flanagan", number: 7 })
    expect(seriesFromTitle("Tennison (Tennison #1)")).toEqual({ name: "Tennison", number: 1 })
    expect(seriesFromTitle("Nada")).toBeUndefined()
  })
})

describe("sagaProgress", () => {
  it("matches catalogue sagas in any of their languages and lists what is missing", () => {
    const cazalet = find("Crónicas de los Cazalet")
    expect(cazalet).toMatchObject({ owned: 3, total: 5, complete: false })
    expect(cazalet?.entries.filter((e) => !e.book).map((e) => e.title)).toEqual(["Un tiempo nuevo", "Todo cambia"])
    expect(cazalet?.entries[3].buyUrl).toContain("todostuslibros.com")
  })

  it("marks complete sagas and lists incomplete ones first", () => {
    const sagas = sagaProgress(shelf)
    expect(find("Forrest Gump")?.complete).toBe(true)
    expect(sagas.at(-1)?.name).toBe("Forrest Gump")
  })

  it("detects other sagas from the series suffix, with the missing numbers", () => {
    const flanagan = find("Flanagan")
    expect(flanagan).toMatchObject({ author: "Andreu Martín", owned: 2, total: 7 })
    expect(flanagan?.entries.filter((e) => !e.book).map((e) => e.number)).toEqual([1, 2, 4, 5, 6])
  })

  it("does not claim a detected saga is complete, since its total is unknown", () => {
    const flanagan = find("Flanagan")
    expect(flanagan?.totalKnown).toBe(false)
    const lone = sagaProgress([makeBook({ title: "First (Lonely Series, #1)", author: "Someone" })])
    expect(lone).toEqual([])
  })

  it("leaves out sagas without any book on the shelf", () => {
    expect(find("Ragdoll")).toBeUndefined()
  })

  it("does not match a book with the same title by another author", () => {
    expect(find("Ragdoll", [makeBook({ title: "Hangman", author: "Someone Else" })])).toBeUndefined()
  })
})
