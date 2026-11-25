import { describe, expect, it } from "vitest"
import { libraryFor, membershipFrom } from "@/lib/membership"

describe("membershipFrom", () => {
  it("uses the account's own library when the entry names no other", () => {
    expect(membershipFrom("reader@example.com", { access: "granted" })).toEqual({ library: "reader@example.com" })
    expect(membershipFrom("reader@example.com", undefined)).toEqual({ library: "reader@example.com" })
  })

  it("joins the shared library and keeps the member's person", () => {
    expect(membershipFrom("reader@example.com", { library: " Owner@Example.com ", person: " Sam " })).toEqual({
      library: "owner@example.com",
      person: "Sam",
    })
  })

  it("ignores empty or invalid fields", () => {
    expect(membershipFrom("reader@example.com", { library: "", person: 3 })).toEqual({ library: "reader@example.com" })
  })
})

describe("admin membership", () => {
  it("marks only an explicit admin flag", () => {
    expect(membershipFrom("reader@example.com", { admin: true })).toEqual({ library: "reader@example.com", admin: true })
    expect(membershipFrom("reader@example.com", { admin: "yes" })).toEqual({ library: "reader@example.com" })
  })

  it("lets only admins open the chosen library", () => {
    const admin = { library: "reader@example.com", admin: true }
    const member = { library: "owner@example.com" }
    expect(libraryFor(admin, "reader@example.com", "other@example.com")).toBe("other@example.com")
    expect(libraryFor(admin, "reader@example.com", null)).toBe("reader@example.com")
    expect(libraryFor(member, "reader@example.com", "other@example.com")).toBe("owner@example.com")
    expect(libraryFor(null, "reader@example.com", "other@example.com")).toBe("reader@example.com")
  })
})
