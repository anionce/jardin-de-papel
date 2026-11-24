import { auth } from "@/lib/firebase"
import { shelfReadingSchema, type SpineReading } from "@/lib/shelfReading"

export const READ_SHELF_ENDPOINT = "/api/read-shelf"

const GENERIC_ERROR = "No se ha podido leer la foto. Prueba otra vez."

export const requestShelfReading = async (
  image: { data: string; mediaType: string },
  fetchFn: typeof fetch = fetch
): Promise<SpineReading[]> => {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error("Hay que entrar con Google para leer fotos.")

  const response = await fetchFn(READ_SHELF_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ image: image.data, mediaType: image.mediaType }),
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (body as { error?: unknown } | null)?.error
    throw new Error(typeof message === "string" ? message : GENERIC_ERROR)
  }
  const parsed = shelfReadingSchema.safeParse(body)
  if (!parsed.success) throw new Error(GENERIC_ERROR)
  return parsed.data.books
}
