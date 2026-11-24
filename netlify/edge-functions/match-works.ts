import { authorizeGeminiRequest, geminiFailure, jsonResponse } from "../../src/lib/edgeRequest.ts"
import { matchAuthorWorks, workMatchRequestSchema } from "../../src/lib/workMatching.ts"

declare const Netlify: { env: { get: (key: string) => string | undefined } }

const parseBody = async (request: Request) => {
  try {
    const parsed = workMatchRequestSchema.safeParse(await request.json())
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export default async (request: Request) => {
  const authorized = await authorizeGeminiRequest(
    request,
    { apiKey: Netlify.env.get("GEMINI_API_KEY"), projectId: Netlify.env.get("VITE_FIREBASE_PROJECT_ID") },
    "La comprobación con Gemini no está configurada"
  )
  if (authorized instanceof Response) return authorized

  const body = await parseBody(request)
  if (!body) return jsonResponse({ error: "La petición no es válida" }, 400)

  try {
    return jsonResponse({ works: await matchAuthorWorks(authorized.apiKey, body) })
  } catch (error) {
    return geminiFailure("match-works", error, "No se ha podido comprobar qué libros tienes ya")
  }
}

export const config = { path: "/api/match-works" }
