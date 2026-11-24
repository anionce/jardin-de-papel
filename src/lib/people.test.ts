import { describe, expect, it } from "vitest"
import {
  addPerson,
  bookPerson,
  countBooksByPerson,
  FALLBACK_PERSON_NAME,
  hasSeveralPeople,
  initialSettings,
  removePerson,
  removePersonPatches,
  renamePerson,
  renamePersonPatches,
  setDefaultPerson,
} from "@/lib/people"
import type { LibrarySettings } from "@/lib/types"
import { makeBook } from "@/test/factories"

const couple: LibrarySettings = { people: ["Alex", "Sam"], defaultPerson: "Alex" }

describe("initialSettings", () => {
  it("starts with the first name of the account as the only and default person", () => {
    expect(initialSettings("Alex Smith")).toEqual({ people: ["Alex"], defaultPerson: "Alex" })
  })

  it("falls back to a generic name when the account has no name", () => {
    expect(initialSettings(null)).toEqual({ people: [FALLBACK_PERSON_NAME], defaultPerson: FALLBACK_PERSON_NAME })
    expect(initialSettings("   ")).toEqual({ people: [FALLBACK_PERSON_NAME], defaultPerson: FALLBACK_PERSON_NAME })
  })
})

describe("bookPerson", () => {
  it("returns the person stored in the book", () => {
    expect(bookPerson(makeBook({ person: "Sam" }), couple)).toBe("Sam")
  })

  it("matches names ignoring case and accents", () => {
    expect(bookPerson(makeBook({ person: "sam" }), couple)).toBe("Sam")
  })

  it("uses the default person for books without one or with a person that no longer exists", () => {
    expect(bookPerson(makeBook(), couple)).toBe("Alex")
    expect(bookPerson(makeBook({ person: "Robin" }), couple)).toBe("Alex")
  })
})

describe("hasSeveralPeople", () => {
  it("is true only when the library is shared", () => {
    expect(hasSeveralPeople(couple)).toBe(true)
    expect(hasSeveralPeople(initialSettings("Alex"))).toBe(false)
  })
})

describe("addPerson", () => {
  it("adds a trimmed new name", () => {
    expect(addPerson(couple, "  Robin ").people).toEqual(["Alex", "Sam", "Robin"])
  })

  it("ignores empty names and names that already exist", () => {
    expect(addPerson(couple, " ")).toBe(couple)
    expect(addPerson(couple, "SAM")).toBe(couple)
  })
})

describe("renamePerson", () => {
  it("renames the person and keeps them as default", () => {
    expect(renamePerson(couple, "Alex", "Alexa")).toEqual({ people: ["Alexa", "Sam"], defaultPerson: "Alexa" })
  })

  it("does not rename onto another existing person or an empty name", () => {
    expect(renamePerson(couple, "Alex", "sam")).toBe(couple)
    expect(renamePerson(couple, "Alex", "")).toBe(couple)
  })

  it("allows changing only the capitalisation", () => {
    expect(renamePerson(couple, "Sam", "SAM").people).toEqual(["Alex", "SAM"])
  })
})

describe("removePerson", () => {
  it("removes the person", () => {
    expect(removePerson(couple, "Sam")).toEqual({ people: ["Alex"], defaultPerson: "Alex" })
  })

  it("moves the default to the first remaining person", () => {
    expect(removePerson(couple, "Alex")).toEqual({ people: ["Sam"], defaultPerson: "Sam" })
  })

  it("never leaves the library without people", () => {
    const alone = initialSettings("Alex")
    expect(removePerson(alone, "Alex")).toBe(alone)
  })
})

describe("setDefaultPerson", () => {
  it("changes the default only to an existing person", () => {
    expect(setDefaultPerson(couple, "Sam").defaultPerson).toBe("Sam")
    expect(setDefaultPerson(couple, "Robin")).toBe(couple)
  })
})

describe("countBooksByPerson", () => {
  it("counts books without a person for the default one", () => {
    const books = [makeBook(), makeBook({ person: "Alex" }), makeBook({ person: "Sam" })]
    expect(Object.fromEntries(countBooksByPerson(books, couple))).toEqual({ Alex: 2, Sam: 1 })
  })
})

describe("person patches", () => {
  const alex = makeBook({ person: "Alex" })
  const sam = makeBook({ person: "Sam" })
  const nobody = makeBook()

  it("renames the person in their books only", () => {
    expect(renamePersonPatches([alex, sam, nobody], "Sam", "Samuel")).toEqual([{ id: sam.id, patch: { person: "Samuel" } }])
  })

  it("gives the books of a removed person to the new default", () => {
    const after = removePerson(couple, "Sam")
    expect(removePersonPatches([alex, sam, nobody], "Sam", after)).toEqual([{ id: sam.id, patch: { person: "Alex" } }])
  })
})

describe("settings fields other than people", () => {
  it("keeps the hidden works when renaming or removing a person", () => {
    const settings = { people: ["Alex", "Sam"], defaultPerson: "Alex", hiddenWorks: ["/works/1"] }
    expect(renamePerson(settings, "Sam", "Robin").hiddenWorks).toEqual(["/works/1"])
    expect(removePerson(settings, "Sam").hiddenWorks).toEqual(["/works/1"])
  })
})
