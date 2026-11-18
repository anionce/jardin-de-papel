import { describe, expect, it, vi } from "vitest"
import { isUploadedImage, nextLoadableCover } from "@/lib/image"

describe("nextLoadableCover", () => {
  const urls = ["a", "b", "c"]

  it("returns the next cover that loads, skipping broken ones", async () => {
    const failed = new Set<string>()
    const load = vi.fn(async (url: string) => url !== "b")

    expect(await nextLoadableCover(urls, 0, failed, load)).toBe(2)
    expect(failed).toEqual(new Set(["b"]))
  })

  it("wraps around to the start", async () => {
    expect(await nextLoadableCover(urls, 2, new Set(), async () => true)).toBe(0)
  })

  it("starts from the first one when there is no current cover", async () => {
    expect(await nextLoadableCover(urls, -1, new Set(), async () => true)).toBe(0)
  })

  it("does not retry covers that already failed", async () => {
    const load = vi.fn(async () => true)
    expect(await nextLoadableCover(urls, 0, new Set(["b"]), load)).toBe(2)
    expect(load).toHaveBeenCalledWith("c")
    expect(load).not.toHaveBeenCalledWith("b")
  })

  it("returns -1 when no other cover loads", async () => {
    expect(await nextLoadableCover(urls, 0, new Set(), async () => false)).toBe(-1)
  })
})

describe("isUploadedImage", () => {
  it("detects data URLs", () => {
    expect(isUploadedImage("data:image/jpeg;base64,xx")).toBe(true)
    expect(isUploadedImage("https://x/c.jpg")).toBe(false)
  })
})
