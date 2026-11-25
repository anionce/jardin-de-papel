import { describe, expect, it } from "vitest"
import {
  addShelf,
  bookShelf,
  countBooksByShelf,
  matchesShelf,
  NO_SHELF,
  removeShelf,
  removeShelfPatches,
  renameShelf,
  renameShelfPatches,
  setShelfPhoto,
} from "@/lib/shelves"
import type { LibrarySettings } from "@/lib/types"
import { makeBook } from "@/test/factories"

const settings: LibrarySettings = {
  people: ["Alex"],
  defaultPerson: "Alex",
  hiddenWorks: ["/works/1"],
  shelves: [{ name: "Salón" }, { name: "Dormitorio", photo: "data:image/jpeg;base64,abc" }],
}

describe("adding, renaming and removing shelves", () => {
  it("adds a new shelf and ignores repeated or empty names", () => {
    expect(addShelf(settings, " Pasillo ").shelves?.map((s) => s.name)).toEqual(["Salón", "Dormitorio", "Pasillo"])
    expect(addShelf(settings, "salon")).toBe(settings)
    expect(addShelf(settings, " ")).toBe(settings)
    expect(addShelf({ people: ["Alex"], defaultPerson: "Alex" }, "Salón").shelves).toEqual([{ name: "Salón" }])
  })

  it("renames a shelf keeping its photo and the rest of the settings", () => {
    const renamed = renameShelf(settings, "Dormitorio", "Cuarto")
    expect(renamed.shelves).toEqual([{ name: "Salón" }, { name: "Cuarto", photo: "data:image/jpeg;base64,abc" }])
    expect(renamed.hiddenWorks).toEqual(["/works/1"])
    expect(renameShelf(settings, "Dormitorio", "salón")).toBe(settings)
  })

  it("removes a shelf and sets or clears its photo", () => {
    expect(removeShelf(settings, "Salón").shelves).toEqual([{ name: "Dormitorio", photo: "data:image/jpeg;base64,abc" }])
    expect(setShelfPhoto(settings, "Salón", "data:x").shelves?.[0]).toEqual({ name: "Salón", photo: "data:x" })
    expect(setShelfPhoto(settings, "Dormitorio", undefined).shelves?.[1]).toEqual({ name: "Dormitorio" })
  })
})

describe("books on shelves", () => {
  const onSalon = makeBook({ shelf: "salón" })
  const onGone = makeBook({ shelf: "Garaje" })
  const nowhere = makeBook()
  const books = [onSalon, onGone, nowhere]

  it("only counts shelves that still exist", () => {
    expect(bookShelf(onSalon, settings)).toBe("Salón")
    expect(bookShelf(onGone, settings)).toBeUndefined()
    expect(countBooksByShelf(books, settings)).toEqual(new Map([["Salón", 1]]))
  })

  it("filters by shelf or by books without one", () => {
    expect(books.filter((b) => matchesShelf(b, "Salón", settings))).toEqual([onSalon])
    expect(books.filter((b) => matchesShelf(b, NO_SHELF, settings))).toEqual([onGone, nowhere])
    expect(books.filter((b) => matchesShelf(b, null, settings))).toEqual(books)
  })

  it("moves or frees the books when their shelf is renamed or removed", () => {
    expect(renameShelfPatches(books, "Salón", "Cuarto")).toEqual([{ id: onSalon.id, patch: { shelf: "Cuarto" } }])
    expect(removeShelfPatches(books, "Salón")).toEqual([{ id: onSalon.id, patch: { shelf: undefined } }])
  })
})
