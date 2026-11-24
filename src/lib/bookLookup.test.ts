import { afterEach, describe, expect, it, vi } from "vitest"
import { lookupBook } from "@/lib/bookLookup"

const work = { key: "/works/OL1W", title: "Nada", number_of_pages_median: 300, editions: { docs: [{ title: "Nada" }] } }
const australEdition = { key: "/works/OL1W", title: "Nada", editions: { docs: [{ title: "Nada", isbn: ["8423342158", "9788423342150"], cover_i: 42 }] } }

const stubOpenLibrary = () => {
  const fetchMock = vi.fn(async (url: string) => {
    const params = new URL(url).searchParams
    const docs = params.has("publisher") ? [australEdition] : [work]
    return new Response(JSON.stringify({ docs }))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe("lookupBook", () => {
  it("takes the cover and ISBN of the publisher's edition when the book has a publisher", async () => {
    stubOpenLibrary()
    const result = await lookupBook({ title: "Nada", author: "Carmen Laforet", publisher: "Austral" }, { cover: true })
    expect(result).toMatchObject({
      workKey: "/works/OL1W",
      pages: 300,
      coverUrl: "https://covers.openlibrary.org/b/id/42-M.jpg",
      isbn: "9788423342150",
    })
  })

  it("does not look for an edition when the book already has an ISBN", async () => {
    const fetchMock = stubOpenLibrary()
    await lookupBook({ title: "Nada", author: "Carmen Laforet", publisher: "Austral", isbn: "123" }, { cover: false })
    expect(fetchMock.mock.calls.some(([url]) => new URL(url).searchParams.has("publisher"))).toBe(false)
  })
})
