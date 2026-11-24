import { describe, expect, it, vi } from "vitest"
import { GEMINI_INTERACTIONS_URL, parseShelfReading, readShelfPhoto, SHELF_MODEL, SHELF_MODELS, ShelfReadingError } from "@/lib/shelfReading"

const interaction = (text: string, status = "completed") => ({
  status,
  steps: [{ type: "model_output", content: [{ type: "text", text }] }],
})

const respond = (body: object, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }))

const image = { data: "aGVsbG8=", mediaType: "image/jpeg" as const }

describe("parseShelfReading", () => {
  it("returns the books with trimmed fields", () => {
    const text = JSON.stringify({ books: [{ title: " Patria ", author: "Fernando Aramburu ", publisher: "Tusquets", uncertain: false }] })
    expect(parseShelfReading(text)).toEqual([{ title: "Patria", author: "Fernando Aramburu", publisher: "Tusquets", uncertain: false }])
  })

  it("drops entries without title or author", () => {
    const text = JSON.stringify({ books: [{ title: " ", author: "", publisher: "RBA", uncertain: true }] })
    expect(parseShelfReading(text)).toEqual([])
  })

  it("rejects answers that are not JSON or have another shape", () => {
    expect(() => parseShelfReading("not json")).toThrow(ShelfReadingError)
    expect(() => parseShelfReading(JSON.stringify({ titles: [] }))).toThrow(ShelfReadingError)
  })
})

describe("readShelfPhoto", () => {
  it("sends the photo to Gemini asking for JSON and without storing it", async () => {
    const fetchFn = respond(interaction(JSON.stringify({ books: [] })))
    await readShelfPhoto("key-123", image, fetchFn)

    const [url, init] = fetchFn.mock.calls[0]
    const body = JSON.parse(String(init?.body))
    expect(url).toBe(GEMINI_INTERACTIONS_URL)
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "key-123" })
    expect(body).toMatchObject({ model: SHELF_MODEL, store: false, stream: false })
    expect(body.response_format).toMatchObject({ type: "text", mime_type: "application/json" })
    expect(body.input[1]).toEqual({ type: "image", data: "aGVsbG8=", mime_type: "image/jpeg" })
  })

  it("returns the books read from the photo", async () => {
    const book = { title: "Nada", author: "Carmen Laforet", publisher: "Austral", uncertain: false }
    expect(await readShelfPhoto("key", image, respond(interaction(JSON.stringify({ books: [book] }))))).toEqual([book])
  })

  it("explains when the free limit is reached or the key is wrong", async () => {
    await expect(readShelfPhoto("key", image, respond({}, 429))).rejects.toThrow("límite gratuito")
    await expect(readShelfPhoto("key", image, respond({}, 503))).rejects.toThrow("saturado")
    await expect(readShelfPhoto("key", image, respond({}, 403))).rejects.toThrow("clave de Gemini")
  })

  it("fails clearly on truncated or failed answers", async () => {
    await expect(readShelfPhoto("key", image, respond(interaction("{", "incomplete")))).rejects.toThrow(ShelfReadingError)
    await expect(readShelfPhoto("key", image, respond(interaction("", "failed")))).rejects.toThrow(ShelfReadingError)
  })
})

describe("readShelfPhoto fallbacks", () => {
  it("tries the next free model when one is overloaded", async () => {
    const book = { title: "Nada", author: "Carmen Laforet", publisher: "", uncertain: false }
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(interaction(JSON.stringify({ books: [book] })))))
    expect(await readShelfPhoto("key", image, fetchFn)).toEqual([book])
    const models = fetchFn.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).model)
    expect(models).toEqual(SHELF_MODELS.slice(0, 2))
  })

  it("does not retry other models for errors that would repeat", async () => {
    const fetchFn = respond({}, 403)
    await expect(readShelfPhoto("key", image, fetchFn)).rejects.toThrow(ShelfReadingError)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
