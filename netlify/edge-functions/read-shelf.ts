import { authorizeGeminiRequest, geminiFailure, jsonResponse } from "../../src/lib/edgeRequest.ts"
import { isSupportedMediaType, readShelfPhoto } from "../../src/lib/shelfReading.ts"

declare const Netlify: { env: { get: (key: string) => string | undefined } }

const MAX_IMAGE_BASE64_LENGTH = 8_000_000

const parseBody = async (request: Request) => {
  try {
    const body = (await request.json()) as { image?: unknown; mediaType?: unknown }
    const { image, mediaType } = body
    if (typeof image !== "string" || typeof mediaType !== "string" || !isSupportedMediaType(mediaType)) return null
    if (image.length > MAX_IMAGE_BASE64_LENGTH) return null
    return { data: image, mediaType }
  } catch {
    return null
  }
}

export default async (request: Request) => {
  const authorized = await authorizeGeminiRequest(
    request,
    { apiKey: Netlify.env.get("GEMINI_API_KEY"), projectId: Netlify.env.get("VITE_FIREBASE_PROJECT_ID") },
    "La lectura de fotos no está configurada"
  )
  if (authorized instanceof Response) return authorized

  const image = await parseBody(request)
  if (!image) return jsonResponse({ error: "La foto no es válida" }, 400)

  try {
    return jsonResponse({ books: await readShelfPhoto(authorized.apiKey, image) })
  } catch (error) {
    return geminiFailure("read-shelf", error, "No se ha podido leer la foto ahora mismo")
  }
}

export const config = { path: "/api/read-shelf" }
