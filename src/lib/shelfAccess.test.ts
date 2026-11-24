import { describe, expect, it, vi } from "vitest"
import { bearerToken, checkLibraryAccess, emailFromIdToken } from "@/lib/shelfAccess"

const tokenFor = (payload: object) => `header.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.signature`

const respondWith = (status: number) => vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }))

describe("emailFromIdToken", () => {
  it("reads the email from the token payload", () => {
    expect(emailFromIdToken(tokenFor({ email: "reader@example.com" }))).toBe("reader@example.com")
  })

  it("returns null for broken tokens or tokens without email", () => {
    expect(emailFromIdToken("not-a-token")).toBeNull()
    expect(emailFromIdToken(tokenFor({ sub: "123" }))).toBeNull()
  })
})

describe("bearerToken", () => {
  it("extracts the token from an Authorization header", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def")
    expect(bearerToken("Basic abc")).toBeNull()
    expect(bearerToken(null)).toBeNull()
  })
})

describe("checkLibraryAccess", () => {
  const token = tokenFor({ email: "reader@example.com" })

  it("asks Firestore for the account's library with the user's token", async () => {
    const fetchFn = respondWith(200)
    await checkLibraryAccess(token, "demo-project", fetchFn)
    expect(fetchFn).toHaveBeenCalledWith(
      "https://firestore.googleapis.com/v1/projects/demo-project/databases/(default)/documents/libraries/reader%40example.com",
      { headers: { Authorization: `Bearer ${token}` } }
    )
  })

  it("allows accounts the rules let read their library, even before it exists", async () => {
    expect(await checkLibraryAccess(token, "demo-project", respondWith(200))).toBe("allowed")
    expect(await checkLibraryAccess(token, "demo-project", respondWith(404))).toBe("allowed")
  })

  it("denies accounts the rules reject", async () => {
    expect(await checkLibraryAccess(token, "demo-project", respondWith(403))).toBe("denied")
  })

  it("treats invalid tokens as not signed in", async () => {
    expect(await checkLibraryAccess(token, "demo-project", respondWith(401))).toBe("unauthenticated")
    expect(await checkLibraryAccess("garbage", "demo-project", respondWith(200))).toBe("unauthenticated")
  })
})
