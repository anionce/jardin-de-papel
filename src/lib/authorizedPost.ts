import type { z } from "zod"
import { auth } from "@/lib/firebase"

export const postAuthorized = async <T,>(
  endpoint: string,
  body: unknown,
  schema: z.ZodType<T>,
  genericError: string,
  fetchFn: typeof fetch = fetch
): Promise<T> => {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error("Hay que entrar con Google.")

  const response = await fetchFn(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (json as { error?: unknown } | null)?.error
    throw new Error(typeof message === "string" ? message : genericError)
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) throw new Error(genericError)
  return parsed.data
}
