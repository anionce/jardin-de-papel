import { describe, expect, it } from "vitest"
import { authorKey, cleanTitle, hashString, normalize, titleKey } from "@/lib/text"

describe("normalize", () => {
  it("lowercases, strips accents and trims", () => {
    expect(normalize("  García Márquez ")).toBe("garcia marquez")
  })
})

describe("cleanTitle", () => {
  it("removes the Goodreads series suffix", () => {
    expect(cleanTitle("Dune (Dune, #1)")).toBe("Dune")
  })

  it("keeps parentheses that are not a series", () => {
    expect(cleanTitle("Kafka (biografía)")).toBe("Kafka (biografía)")
  })
})

describe("titleKey", () => {
  it("drops leading article, subtitle, series and punctuation", () => {
    expect(titleKey("La sombra del viento: novela (Cementerio, #1)")).toBe("sombra del viento")
  })

  it("matches the same title written differently", () => {
    expect(titleKey("The Hobbit")).toBe(titleKey("Hobbit!"))
  })

  it("returns an empty key without title", () => {
    expect(titleKey(undefined)).toBe("")
  })
})

describe("authorKey", () => {
  it("ignores spaces, dots and accents", () => {
    expect(authorKey("J.D. Salinger")).toBe(authorKey("J. D. Salinger"))
    expect(authorKey("Pérez")).toBe("perez")
  })
})

describe("hashString", () => {
  it("is stable and non negative", () => {
    expect(hashString("abc")).toBe(hashString("abc"))
    expect(hashString("a very long string to overflow the hash")).toBeGreaterThanOrEqual(0)
  })
})
