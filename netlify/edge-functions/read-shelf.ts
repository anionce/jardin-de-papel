import { bearerToken, checkLibraryAccess } from "../../src/lib/shelfAccess.ts"
import { isSupportedMediaType, readShelfPhoto, ShelfReadingError } from "../../src/lib/shelfReading.ts"

declare const Netlify: { env: { get: (key: string) => string | undefined } }

const MAX_IMAGE_BASE64_LENGTH = 8_000_000

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

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
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405)

  const apiKey = Netlify.env.get("GEMINI_API_KEY")
  const projectId = Netlify.env.get("VITE_FIREBASE_PROJECT_ID")
  if (!apiKey || !projectId) return json({ error: "La lectura de fotos no está configurada" }, 503)

  const token = bearerToken(request.headers.get("authorization"))
  if (!token) return json({ error: "Hay que entrar con Google" }, 401)
  const access = await checkLibraryAccess(token, projectId)
  if (access === "unauthenticated") return json({ error: "La sesión ha caducado; vuelve a entrar" }, 401)
  if (access === "denied") return json({ error: "Esta cuenta no tiene acceso" }, 403)

  const image = await parseBody(request)
  if (!image) return json({ error: "La foto no es válida" }, 400)

  try {
    return json({ books: await readShelfPhoto(apiKey, image) })
  } catch (error) {
    if (error instanceof ShelfReadingError) {
      console.error("read-shelf", error.detail ?? error.message)
      return json({ error: error.message, detail: error.detail }, 502)
    }
    console.error("read-shelf", error)
    return json({ error: "No se ha podido leer la foto ahora mismo", detail: String(error) }, 502)
  }
}

export const config = { path: "/api/read-shelf" }
