import { GeminiError } from "./gemini.ts"
import { bearerToken, checkLibraryAccess } from "./shelfAccess.ts"

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

export const authorizeGeminiRequest = async (
  request: Request,
  env: { apiKey?: string; projectId?: string },
  notConfigured: string
): Promise<{ apiKey: string } | Response> => {
  if (request.method !== "POST") return jsonResponse({ error: "Método no permitido" }, 405)
  const { apiKey, projectId } = env
  if (!apiKey || !projectId) return jsonResponse({ error: notConfigured }, 503)

  const token = bearerToken(request.headers.get("authorization"))
  if (!token) return jsonResponse({ error: "Hay que entrar con Google" }, 401)
  const access = await checkLibraryAccess(token, projectId)
  if (access === "unauthenticated") return jsonResponse({ error: "La sesión ha caducado; vuelve a entrar" }, 401)
  if (access === "denied") return jsonResponse({ error: "Esta cuenta no tiene acceso" }, 403)
  return { apiKey }
}

export const geminiFailure = (tag: string, error: unknown, fallback: string) => {
  if (error instanceof GeminiError) {
    console.error(tag, error.detail ?? error.message)
    return jsonResponse({ error: error.message, detail: error.detail }, 502)
  }
  console.error(tag, error)
  return jsonResponse({ error: fallback, detail: String(error) }, 502)
}
