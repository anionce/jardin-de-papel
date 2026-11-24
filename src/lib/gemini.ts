export const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"]
export const GEMINI_BUDGET_MS = 34000
export const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
export const GEMINI_API_REVISION = "2026-05-20"
const RETRYABLE_STATUSES = new Set([429, 500, 503])
const MIN_ATTEMPT_MS = 8000
const UPSTREAM_DETAIL_LIMIT = 300

export class GeminiError extends Error {
  readonly detail?: string

  constructor(message: string, detail?: string) {
    super(message)
    this.detail = detail
  }
}

export type GeminiInput = { type: "text"; text: string } | { type: "image"; data: string; mime_type: string }

export interface GeminiMessages {
  failed: string
  tooSlow: string
  incomplete: string
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

const errorForStatus = (status: number, messages: GeminiMessages) => {
  if (status === 429) return "Se ha llegado al límite gratuito de Gemini; prueba más tarde"
  if (status === 503) return "El servicio de Google está saturado; prueba en un rato"
  if (status === 400 || status === 401 || status === 403) return "La clave de Gemini no es válida"
  return messages.failed
}

const requestInteraction = (
  model: string,
  apiKey: string,
  input: GeminiInput[],
  schema: object,
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
      input,
      response_format: { type: "text", mime_type: "application/json", schema },
    }),
  })

export const askGemini = async (
  apiKey: string,
  input: GeminiInput[],
  schema: object,
  messages: GeminiMessages,
  fetchFn: typeof fetch = fetch
): Promise<string> => {
  const deadline = Date.now() + GEMINI_BUDGET_MS
  let response: Response | undefined
  for (const [index, model] of GEMINI_MODELS.entries()) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) break
    const attemptsLeft = GEMINI_MODELS.length - index
    const slice = attemptsLeft > 1 ? Math.max(remaining / 2, MIN_ATTEMPT_MS) : remaining
    try {
      response = await requestInteraction(model, apiKey, input, schema, fetchFn, AbortSignal.timeout(Math.min(slice, remaining)))
    } catch {
      response = undefined
      continue
    }
    if (!RETRYABLE_STATUSES.has(response.status)) break
  }
  if (!response) throw new GeminiError(messages.tooSlow)
  if (!response.ok) {
    const upstream = (await response.text()).slice(0, UPSTREAM_DETAIL_LIMIT)
    throw new GeminiError(errorForStatus(response.status, messages), `Gemini ${response.status}: ${upstream}`)
  }

  const interaction = (await response.json()) as InteractionResponse
  if (interaction.status === "incomplete") throw new GeminiError(messages.incomplete)
  if (interaction.status !== "completed") throw new GeminiError(messages.failed, `Gemini status ${interaction.status}`)
  return outputText(interaction)
}

export const parseGeminiJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    throw new GeminiError("La respuesta no es JSON")
  }
}
