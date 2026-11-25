import { describe, expect, it } from "vitest"
import { libraryOptions } from "@/lib/libraries"

describe("libraryOptions", () => {
  it("puts the own library first and names the rest after their people", () => {
    const docs = [
      { id: "b@example.com", data: { people: ["Sam", "Alex"] } },
      { id: "me@example.com", data: { people: ["Me"] } },
      { id: "a@example.com", data: { people: ["Kim", "Lee", "Max"] } },
      { id: "c@example.com", data: {} },
    ]
    expect(libraryOptions(docs, "me@example.com")).toEqual([
      { id: "me@example.com", label: "Mi biblioteca" },
      { id: "c@example.com", label: "Biblioteca sin nombre" },
      { id: "a@example.com", label: "Kim, Lee y Max" },
      { id: "b@example.com", label: "Sam y Alex" },
    ])
  })
})
