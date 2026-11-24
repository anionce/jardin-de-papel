import { describe, expect, it, vi } from "vitest"
import { GeminiError } from "@/lib/gemini"
import { matchAuthorWorks, parseWorkMatching, workMatchingPrompt, workMatchRequestSchema } from "@/lib/workMatching"

const request = {
  author: "Kate Morton",
  owned: ["La casa de Riverton"],
  candidates: [
    { key: "/works/1", title: "The House at Riverton", year: 2006 },
    { key: "/works/2", title: "The Distant Hours" },
  ],
}

const interaction = (works: object[]) => ({
  status: "completed",
  steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({ works }) }] }],
})

describe("workMatchingPrompt", () => {
  it("lists the owned books and every candidate with its key", () => {
    const prompt = workMatchingPrompt(request)
    expect(prompt).toContain("Author: Kate Morton")
    expect(prompt).toContain("- La casa de Riverton")
    expect(prompt).toContain("- /works/1 | The House at Riverton | 2006")
    expect(prompt).toContain("- /works/2 | The Distant Hours | ?")
  })
})

describe("workMatchRequestSchema", () => {
  it("rejects requests without candidates or author", () => {
    expect(workMatchRequestSchema.safeParse({ ...request, candidates: [] }).success).toBe(false)
    expect(workMatchRequestSchema.safeParse({ ...request, author: " " }).success).toBe(false)
    expect(workMatchRequestSchema.safeParse(request).success).toBe(true)
  })
})

describe("parseWorkMatching", () => {
  it("keeps only known candidates and trims the Spanish title", () => {
    const text = JSON.stringify({
      works: [
        { key: "/works/2", ownedTitle: "", show: true, spanishTitle: " Las horas distantes " },
        { key: "/works/99", ownedTitle: "", show: true, spanishTitle: "" },
      ],
    })
    expect(parseWorkMatching(text, ["/works/1", "/works/2"])).toEqual([
      { key: "/works/2", ownedTitle: "", show: true, spanishTitle: "Las horas distantes" },
    ])
  })

  it("rejects answers with another shape", () => {
    expect(() => parseWorkMatching("nope", [])).toThrow(GeminiError)
    expect(() => parseWorkMatching(JSON.stringify({ books: [] }), [])).toThrow(GeminiError)
  })
})

describe("matchAuthorWorks", () => {
  it("asks Gemini with the prompt and returns its decisions", async () => {
    const works = [
      { key: "/works/1", ownedTitle: "", show: false, spanishTitle: "La casa de Riverton" },
      { key: "/works/2", ownedTitle: "", show: true, spanishTitle: "Las horas distantes" },
    ]
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(interaction(works))))

    expect(await matchAuthorWorks("key", request, fetchFn)).toEqual(works)
    const body = JSON.parse(String(fetchFn.mock.calls[0][1]?.body))
    expect(body.input[0].text).toBe(workMatchingPrompt(request))
    expect(body.store).toBe(false)
  })
})
