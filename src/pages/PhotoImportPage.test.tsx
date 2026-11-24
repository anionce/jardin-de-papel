import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { subscribeBooks } from "@/lib/db"
import type { Book } from "@/lib/types"
import { PhotoImportPage } from "@/pages/PhotoImportPage"
import { makeBook } from "@/test/factories"
import { renderWithShelf } from "@/test/render"

const requestShelfReading = vi.hoisted(() => vi.fn())

vi.mock("@/lib/shelfApi", () => ({ requestShelfReading }))
vi.mock("@/lib/image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image")>()),
  shelfPhotoToBase64: vi.fn(async () => ({ data: "aGVsbG8=", mediaType: "image/jpeg" })),
}))

const photo = (name: string) => new File(["fake"], name, { type: "image/jpeg" })

const storedBooks = (): Book[] => {
  let books: Book[] = []
  subscribeBooks(
    (next) => (books = next),
    () => undefined
  )()
  return books
}

beforeEach(() => {
  requestShelfReading.mockReset()
  URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`)
  URL.revokeObjectURL = vi.fn()
})

describe("PhotoImportPage", () => {
  it("reads several photos, merges repeated books and adds only the chosen ones", async () => {
    requestShelfReading
      .mockResolvedValueOnce([
        { title: "Nada", author: "Carmen Laforet", publisher: "Austral", uncertain: false },
        { title: "Patria", author: "Fernando Aramburu", publisher: "Tusquets", uncertain: false },
      ])
      .mockResolvedValueOnce([
        { title: "Patria", author: "Fernando Aramburu", publisher: "", uncertain: false },
        { title: "Mystic River", author: "Dennis Lehane", publisher: "RBA", uncertain: true },
      ])
    const owned = makeBook({ id: "owned", title: "Nada", author: "Carmen Laforet" })
    localStorage.setItem("biblioteca-books", JSON.stringify([owned]))
    const { user } = renderWithShelf(<PhotoImportPage />, [owned])

    await user.upload(screen.getByLabelText("Fotos de la estantería"), [photo("a.jpg"), photo("b.jpg")])
    await user.click(screen.getByRole("button", { name: /Leer las 2 fotos/ }))

    expect(await screen.findByText("He leído 3 libros")).toBeInTheDocument()
    expect(screen.getByText(/Ya lo tienes: «Nada»/)).toBeInTheDocument()
    expect(screen.getByText(/No se leía bien/)).toBeInTheDocument()

    await user.clear(screen.getByRole("textbox", { name: "Editorial del libro 3" }))
    await user.type(screen.getByRole("textbox", { name: "Editorial del libro 3" }), "RBA Serie Negra")
    expect(screen.getByText(/se le pondrá la editorial Austral/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Añadir 2 libros y completar 1 edición" }))

    await waitFor(() => expect(storedBooks()).toHaveLength(3))
    expect(storedBooks()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "owned", publisher: "Austral" }),
        expect.objectContaining({ title: "Patria", publisher: "Tusquets", read: false }),
        expect.objectContaining({ title: "Mystic River", publisher: "RBA Serie Negra" }),
      ])
    )
  })

  it("shows which photos failed and keeps the books from the others", async () => {
    requestShelfReading
      .mockRejectedValueOnce(new Error("Demasiadas fotos seguidas; espera un momento"))
      .mockResolvedValueOnce([{ title: "1984", author: "George Orwell", publisher: "Austral", uncertain: false }])
    const { user } = renderWithShelf(<PhotoImportPage />)

    await user.upload(screen.getByLabelText("Fotos de la estantería"), [photo("a.jpg"), photo("b.jpg")])
    await user.click(screen.getByRole("button", { name: /Leer las 2 fotos/ }))

    expect(await screen.findByText("Foto 1: Demasiadas fotos seguidas; espera un momento")).toBeInTheDocument()
    expect(screen.getByText("He leído 1 libro")).toBeInTheDocument()
  })

  it("removes a photo before reading", async () => {
    const { user } = renderWithShelf(<PhotoImportPage />)

    await user.upload(screen.getByLabelText("Fotos de la estantería"), [photo("a.jpg"), photo("b.jpg")])
    await user.click(screen.getByRole("button", { name: "Quitar la foto 1" }))

    expect(screen.getByRole("button", { name: /Leer la foto/ })).toBeInTheDocument()
  })
})
