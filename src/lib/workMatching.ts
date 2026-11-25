import { z } from "zod"
import { askGemini, GeminiError, parseGeminiJson } from "./gemini.ts"

export const MAX_MATCH_OWNED = 100
export const MAX_MATCH_CANDIDATES = 60
const MAX_TITLE_LENGTH = 300

export const workMatchRequestSchema = z.object({
  author: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  owned: z.array(z.string().max(MAX_TITLE_LENGTH)).max(MAX_MATCH_OWNED),
  candidates: z
    .array(z.object({ key: z.string().max(100), title: z.string().max(MAX_TITLE_LENGTH), year: z.number().optional() }))
    .min(1)
    .max(MAX_MATCH_CANDIDATES),
})

export type WorkMatchRequest = z.infer<typeof workMatchRequestSchema>

export const workMatchSchema = z.object({ key: z.string(), ownedTitle: z.string(), show: z.boolean(), spanishTitle: z.string() })

export const workMatchingSchema = z.object({ works: z.array(workMatchSchema) })

export type WorkMatch = z.infer<typeof workMatchSchema>

const WORK_MATCHING_JSON_SCHEMA = {
  type: "object",
  properties: {
    works: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          ownedTitle: { type: "string" },
          show: { type: "boolean" },
          spanishTitle: { type: "string" },
        },
        required: ["key", "ownedTitle", "show", "spanishTitle"],
        additionalProperties: false,
      },
    },
  },
  required: ["works"],
  additionalProperties: false,
}

const MATCHING_MESSAGES = {
  failed: "No se ha podido comprobar qué libros tienes ya",
  tooSlow: "Google tarda demasiado ahora mismo",
  incomplete: "Demasiados libros para comprobar de una vez",
}

const listLines = (lines: string[]) => (lines.length > 0 ? lines.map((line) => `- ${line}`).join("\n") : "- (none)")

export const workMatchingPrompt = ({ author, owned, candidates }: WorkMatchRequest) => `Someone keeps a home library and wants to see which books by an author they do not own yet.

Author: ${author}

Books by this author they already own, with the titles printed on their copies (often Spanish or Catalan translations):
${listLines(owned)}

Candidate works from Open Library, as "key | title | first publication year":
${listLines(candidates.map((c) => `${c.key} | ${c.title} | ${c.year ?? "?"}`))}

Translated titles often have nothing in common with the original: "Gone Girl" was published in Spain as "Perdida". Think about which original work each owned book is a translation of before deciding.

For every candidate return:
- key: the candidate key, unchanged.
- ownedTitle: the owned title, copied exactly, when the candidate is the same work as that owned book (a translation, the original, or an alternative or earlier title); otherwise an empty string.
- show: false when any of these is true, otherwise true:
  - ownedTitle is not empty.
  - it was written by a different person with the same name, or it is not a book written by this author (textbooks, study guides, anthologies by others).
  - it is not a single work: a collection, box set, omnibus or sample.
  - it is the same work as another candidate that you show; show only one candidate per work, preferring a Spanish title, then an English one.
- spanishTitle: the title of the published Spanish translation when you are sure it exists, or the title itself when it is already in Spanish; otherwise an empty string. Never invent a title.

Return each candidate exactly once.`

export const parseWorkMatching = (text: string, candidateKeys: string[]): WorkMatch[] => {
  const parsed = workMatchingSchema.safeParse(parseGeminiJson(text))
  if (!parsed.success) throw new GeminiError("La respuesta no tiene el formato esperado")
  const known = new Set(candidateKeys)
  return parsed.data.works
    .filter((work) => known.has(work.key))
    .map((work) => ({ ...work, ownedTitle: work.ownedTitle.trim(), spanishTitle: work.spanishTitle.trim() }))
}

export const matchAuthorWorks = async (
  apiKey: string,
  request: WorkMatchRequest,
  fetchFn: typeof fetch = fetch
): Promise<WorkMatch[]> => {
  const text = await askGemini(
    apiKey,
    [{ type: "text", text: workMatchingPrompt(request) }],
    WORK_MATCHING_JSON_SCHEMA,
    MATCHING_MESSAGES,
    fetchFn
  )
  return parseWorkMatching(
    text,
    request.candidates.map((c) => c.key)
  )
}
