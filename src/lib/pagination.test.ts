import { describe, expect, it } from "vitest"
import { clampPage, pageCount, pageItems, pageSlots } from "@/lib/pagination"

describe("pagination", () => {
  it("counts pages and keeps the page in range", () => {
    expect(pageCount(0)).toBe(1)
    expect(pageCount(24)).toBe(1)
    expect(pageCount(25)).toBe(2)
    expect(clampPage(9, 30)).toBe(2)
    expect(clampPage(Number.NaN, 30)).toBe(1)
    expect(clampPage(0, 30)).toBe(1)
  })

  it("slices the items of a page", () => {
    const items = Array.from({ length: 30 }, (_, i) => i)
    expect(pageItems(items, 2)).toEqual([24, 25, 26, 27, 28, 29])
  })

  it("shows the first, last and neighbouring pages with gaps between", () => {
    expect(pageSlots(1, 1)).toEqual([1])
    expect(pageSlots(1, 4)).toEqual([1, 2, 3, 4])
    expect(pageSlots(6, 15)).toEqual([1, "gap", 5, 6, 7, "gap", 15])
    expect(pageSlots(3, 15)).toEqual([1, 2, 3, 4, "gap", 15])
  })
})
