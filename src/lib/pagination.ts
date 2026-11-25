export const PAGE_SIZE = 24

export type PageSlot = number | "gap"

export const pageCount = (total: number, size = PAGE_SIZE) => Math.max(1, Math.ceil(total / size))

export const clampPage = (page: number, total: number, size = PAGE_SIZE) =>
  Math.min(Math.max(1, Math.floor(page) || 1), pageCount(total, size))

export const pageItems = <T>(items: T[], page: number, size = PAGE_SIZE): T[] =>
  items.slice((page - 1) * size, page * size)

export const pageSlots = (current: number, count: number): PageSlot[] => {
  const wanted = [...new Set([1, current - 1, current, current + 1, count])]
    .filter((page) => page >= 1 && page <= count)
    .sort((a, b) => a - b)

  return wanted.flatMap((page, i): PageSlot[] => {
    const previous = wanted[i - 1]
    if (previous === undefined || page - previous === 1) return [page]
    if (page - previous === 2) return [previous + 1, page]
    return ["gap", page]
  })
}
