import { z } from "zod"

export const SHELF_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"]
export const READING_BUDGET_MS = 34000
export const SHELF_MODEL = SHELF_MODELS[0]
const RETRYABLE_STATUSES = new Set([429, 500, 503])
export const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
export const GEMINI_API_REVISION = "2026-05-20"
export const SHELF_IMAGE_MAX_SIDE = 1568
export const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

type ShelfMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number]


export const spineSchema = z.object({
  title: z.string(),
  author: z.string(),
  publisher: z.string(),
  uncertain: z.boolean(),
})

export const shelfReadingSchema = z.object({ books: z.array(spineSchema) })

export type SpineReading = z.infer<typeof spineSchema>

const SHELF_JSON_SCHEMA = {
  type: "object",
  properties: {
    books: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          author: { type: "string" },
          publisher: { type: "string" },
          uncertain: { type: "boolean" },
        },
        required: ["title", "author", "publisher", "uncertain"],
        additionalProperties: false,
      },
    },
  },
  required: ["books"],
  additionalProperties: false,
}

export const SHELF_PROMPT = `This photo shows books on a home shelf, usually seen by their spines.
List every book you can see, from left to right, including books lying flat.

For each book:
- title: the title exactly as printed on the book, in its original language. Do not translate it.
- author: the author's full name as printed. If only the surname is printed and you are sure who it is, give the full name. Empty string if it cannot be read.
- publisher: the publisher or imprint, read from its name or logo on the spine (for example Debolsillo, Booket, Plaza & Janés, RBA, Siruela, Anagrama, Austral, Alianza, Salamandra, Tusquets, Penguin, Faber). Empty string if it cannot be identified.
- uncertain: true when part of the title or author is hidden, blurred or guessed.

Ignore anything that is not a book, such as boxes, medicine, picture frames or ornaments.
If no books are visible, return an empty list.`

export class ShelfReadingError extends Error {
  readonly detail?: string

  constructor(message: string, detail?: string) {
    super(message)
    this.detail = detail
  }
}

const UPSTREAM_DETAIL_LIMIT = 300

export const isSupportedMediaType = (value: string): value is ShelfMediaType => {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(value)
}

const cleanReading = (book: SpineReading): SpineReading => ({
  title: book.title.trim(),
  author: book.author.trim(),
  publisher: book.publisher.trim(),
  uncertain: book.uncertain,
})

export const parseShelfReading = (text: string): SpineReading[] => {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new ShelfReadingError("La respuesta no es JSON")
  }
  const parsed = shelfReadingSchema.safeParse(json)
  if (!parsed.success) throw new ShelfReadingError("La respuesta no tiene el formato esperado")
  return parsed.data.books.map(cleanReading).filter((book) => book.title || book.author)
}

interface InteractionResponse {
  status?: string
  steps?: { type?: string; content?: { type?: string; text?: string }[] }[]
}

const outputText = (interaction: InteractionResponse) =>
  (interaction.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("")

const errorForStatus = (status: number) => {
  if (status === 429) return "Se ha llegado al límite gratuito de lecturas; prueba más tarde"
  if (status === 503) return "El servicio de Google está saturado; prueba en un rato"
  if (status === 400 || status === 401 || status === 403) return "La clave de Gemini no es válida"
  return "No se ha podido leer la foto ahora mismo"
}

const requestReading = (
  model: string,
  apiKey: string,
  image: { data: string; mediaType: ShelfMediaType },
  fetchFn: typeof fetch,
  signal: AbortSignal
) =>
  fetchFn(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    signal,
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json", "Api-Revision": GEMINI_API_REVISION },
    body: JSON.stringify({
      model,
      store: false,
      stream: false,
      input: [
        { type: "text", text: SHELF_PROMPT },
        { type: "image", data: image.data, mime_type: image.mediaType },
      ],
      response_format: { type: "text", mime_type: "application/json", schema: SHELF_JSON_SCHEMA },
    }),
  })

export const readShelfPhoto = async (
  apiKey: string,
  image: { data: string; mediaType: ShelfMediaType },
  fetchFn: typeof fetch = fetch
): Promise<SpineReading[]> => {
  const deadline = Date.now() + READING_BUDGET_MS
  let response: Response | undefined
  for (const [index, model] of SHELF_MODELS.entries()) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) break
    const attemptsLeft = SHELF_MODELS.length - index
    const slice = attemptsLeft > 1 ? Math.max(remaining / 2, 8000) : remaining
    try {
      response = await requestReading(model, apiKey, image, fetchFn, AbortSignal.timeout(Math.min(slice, remaining)))
    } catch {
      response = undefined
      continue
    }
    if (!RETRYABLE_STATUSES.has(response.status)) break
  }
  if (!response) throw new ShelfReadingError("Google tarda demasiado ahora mismo; prueba en un rato o con una foto con menos libros")
  if (!response.ok) {
    const upstream = (await response.text()).slice(0, UPSTREAM_DETAIL_LIMIT)
    throw new ShelfReadingError(errorForStatus(response.status), `Gemini ${response.status}: ${upstream}`)
  }

  const interaction = (await response.json()) as InteractionResponse
  if (interaction.status === "incomplete") throw new ShelfReadingError("Demasiados libros en una foto")
  if (interaction.status !== "completed") {
    throw new ShelfReadingError("No se ha podido leer la foto ahora mismo", `Gemini status ${interaction.status}`)
  }
  return parseShelfReading(outputText(interaction))
}
