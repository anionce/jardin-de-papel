import { z } from "zod"
import { askGemini, GeminiError, parseGeminiJson } from "./gemini.ts"

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
  const parsed = shelfReadingSchema.safeParse(parseGeminiJson(text))
  if (!parsed.success) throw new GeminiError("La respuesta no tiene el formato esperado")
  return parsed.data.books.map(cleanReading).filter((book) => book.title || book.author)
}

const SHELF_MESSAGES = {
  failed: "No se ha podido leer la foto ahora mismo",
  tooSlow: "Google tarda demasiado ahora mismo; prueba en un rato o con una foto con menos libros",
  incomplete: "Demasiados libros en una foto",
}

export const readShelfPhoto = async (
  apiKey: string,
  image: { data: string; mediaType: ShelfMediaType },
  fetchFn: typeof fetch = fetch
): Promise<SpineReading[]> => {
  const input = [
    { type: "text" as const, text: SHELF_PROMPT },
    { type: "image" as const, data: image.data, mime_type: image.mediaType },
  ]
  return parseShelfReading(await askGemini(apiKey, input, SHELF_JSON_SCHEMA, SHELF_MESSAGES, fetchFn))
}
