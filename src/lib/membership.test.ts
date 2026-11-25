import { describe, expect, it } from "vitest"
import { membershipFrom } from "@/lib/membership"

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
