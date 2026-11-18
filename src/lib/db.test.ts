import { describe, expect, it } from "vitest"
import { addBook, addBooks, removeBook, removeBooks, subscribeBooks, updateBook, updateBooks } from "@/lib/db"
import type { Book } from "@/lib/types"

const latestBooks = () => {
  let books: Book[] = []
  const unsubscribe = subscribeBooks(
    (next) => (books = next),
    () => undefined
  )
  return { get: () => books, unsubscribe }
}

describe("db in local mode", () => {
  it("adds books newest first and notifies subscribers", async () => {
    const shelf = latestBooks()
    await addBooks([{ title: "A", read: false }, { title: "B", read: false }])
    await addBook({ title: "C", read: true })

    expect(shelf.get().map((b) => b.title)).toEqual(["C", "A", "B"])
    expect(shelf.get().every((b) => b.id && b.createdAt)).toBe(true)
    shelf.unsubscribe()
  })

  it("updates one or several books", async () => {
    await addBooks([{ title: "A", read: false }, { title: "B", read: false }])
    const shelf = latestBooks()
    const [a, b] = shelf.get()

    await updateBook(a.id, { title: "A2" })
    await updateBooks([a.id, b.id], { read: true })

    expect(shelf.get()).toMatchObject([
      { title: "A2", read: true },
      { title: "B", read: true },
    ])
    shelf.unsubscribe()
  })

  it("removes books", async () => {
    await addBooks([{ title: "A", read: false }, { title: "B", read: false }, { title: "C", read: false }])
    const shelf = latestBooks()
    const [a, b] = shelf.get()

    await removeBook(a.id)
    await removeBooks([b.id])

    expect(shelf.get().map((x) => x.title)).toEqual(["C"])
    shelf.unsubscribe()
  })

  it("migrates the old single genre field", () => {
    localStorage.setItem("biblioteca-books", JSON.stringify([{ id: "1", genre: "Novela", read: false, createdAt: 1 }]))
    const shelf = latestBooks()
    expect(shelf.get()[0]).toMatchObject({ genres: ["Novela"] })
    shelf.unsubscribe()
  })
})
