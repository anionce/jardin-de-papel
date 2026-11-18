import { describe, expect, it } from "vitest"
import { parseGoodreadsCsv, planImport } from "@/lib/goodreads"
import { makeBook } from "@/test/factories"

const HEADER =
  "Book Id,Title,Author,Publisher,Number of Pages,Year Published,Original Publication Year,ISBN,ISBN13,Exclusive Shelf,Bookshelves"

const csvFile = (...rows: string[]) => new File([[HEADER, ...rows].join("\n")], "goodreads.csv", { type: "text/csv" })

describe("parseGoodreadsCsv", () => {
  it("maps a Goodreads row to a book draft", async () => {
    const file = csvFile(
      '1,"Dune (Dune, #1)",Frank Herbert,Ace,604,2005,1965,"=""0441013597""","=""9780441013593""",read,"science-fiction, to-read, favorites, 2023-reads"'
    )
    const { books, skipped } = await parseGoodreadsCsv(file)

    expect(skipped).toBe(0)
    expect(books).toEqual([
      {
        title: "Dune (Dune, #1)",
        author: "Frank Herbert",
        publisher: "Ace",
        genres: ["Science fiction"],
        year: 1965,
        pages: 604,
        isbn: "9780441013593",
        read: true,
        goodreadsId: "1",
      },
    ])
  })

  it("skips rows without title nor author", async () => {
    const { books, skipped } = await parseGoodreadsCsv(csvFile("2,,,,,,,,,to-read,", "3,Patria,,,,,,,,to-read,"))
    expect(skipped).toBe(1)
    expect(books).toHaveLength(1)
    expect(books[0]).toMatchObject({ title: "Patria", read: false, genres: undefined })
  })

  it("rejects files that are not a Goodreads export", async () => {
    const file = new File(["name,age\nAna,30"], "other.csv")
    await expect(parseGoodreadsCsv(file)).rejects.toThrow(/Goodreads/)
  })
})

describe("planImport", () => {
  const existing = [
    makeBook({ title: "Dune", author: "Frank Herbert", goodreadsId: "1" }),
    makeBook({ title: "Patria", author: "Fernando Aramburu" }),
  ]

  it("skips books already on the shelf by Goodreads id or title and author", () => {
    const parsed = {
      skipped: 0,
      books: [
        { title: "Dune (reprint)", goodreadsId: "1", read: true },
        { title: "patria", author: "fernando aramburu", read: false },
        { title: "Ordesa", author: "Manuel Vilas", read: true },
      ],
    }
    const plan = planImport(parsed, existing, false)
    expect(plan.fresh.map((b) => b.title)).toEqual(["Ordesa"])
    expect(plan.duplicates).toBe(2)
    expect(plan.unreadSkipped).toBe(0)
  })

  it("leaves unread books out when importing only read ones", () => {
    const parsed = { skipped: 0, books: [{ title: "A", read: true }, { title: "B", read: false }] }
    expect(planImport(parsed, [], true)).toMatchObject({ unreadSkipped: 1, fresh: [{ title: "A" }] })
  })

  it("counts new books that look like one already on the shelf", () => {
    const parsed = { skipped: 0, books: [{ title: "Dune: novela", author: "Frank Herbert", read: false }] }
    expect(planImport(parsed, existing, false)).toMatchObject({ similar: 1, fresh: [{ title: "Dune: novela" }] })
  })
})
