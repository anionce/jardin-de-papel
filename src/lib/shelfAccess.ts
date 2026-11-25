export type AccessResult = "allowed" | "denied" | "unauthenticated"

const FIRESTORE_API = "https://firestore.googleapis.com/v1"

export const emailFromIdToken = (token: string): string | null => {
  const payload = token.split(".")[1]
  if (!payload) return null
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof json.email === "string" ? json.email : null
  } catch {
    return null
  }
}

export const bearerToken = (header: string | null): string | null => {
  const match = header?.match(/^Bearer\s+(.+)$/)
  return match ? match[1] : null
}

export const checkLibraryAccess = async (
  token: string,
  projectId: string,
  fetchFn: typeof fetch = fetch
): Promise<AccessResult> => {
  const email = emailFromIdToken(token)
  if (!email) return "unauthenticated"
  const url = `${FIRESTORE_API}/projects/${projectId}/databases/(default)/documents/allowedUsers/${encodeURIComponent(email)}`
  const response = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` } })
  if (response.status === 401) return "unauthenticated"
  if (response.status === 403) return "denied"
  return response.ok || response.status === 404 ? "allowed" : "denied"
}
