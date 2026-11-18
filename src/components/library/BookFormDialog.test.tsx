import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { BookFormDialog } from "@/components/library/BookFormDialog"
import { subscribeBooks } from "@/lib/db"
import type { Book } from "@/lib/types"
import { useBookFormStore } from "@/store/useBookFormStore"
import { makeBook } from "@/test/factories"
import { renderWithShelf } from "@/test/render"

const storedBooks = (): Book[] => {
  let books: Book[] = []
  subscribeBooks(
    (next) => (books = next),
    () => undefined
  )()
  return books
}

describe("BookFormDialog", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    useBookFormStore.setState({ open: false, editing: null })
  })

  it("adds a new book with only the fields that were filled", async () => {
    const { user } = renderWithShelf(<BookFormDialog />)
    useBookFormStore.getState().openNew()

    await user.type(await screen.findByRole("textbox", { name: "Título" }), "Ordesa")
    await user.type(screen.getByRole("textbox", { name: "Año" }), "2018")
    await user.click(screen.getByRole("button", { name: "Sí" }))
    await user.click(screen.getByRole("button", { name: "Añadir a la estantería" }))

    await waitFor(() => expect(useBookFormStore.getState().open).toBe(false))
    expect(storedBooks()).toMatchObject([{ title: "Ordesa", year: 2018, read: true }])
  })

  it("warns once when the book looks like one already on the shelf", async () => {
    const existing = makeBook({ title: "Patria", author: "Fernando Aramburu" })
    const { user } = renderWithShelf(<BookFormDialog />, [existing])
    useBookFormStore.getState().openNew()

    await user.type(await screen.findByRole("textbox", { name: "Título" }), "Patria")
    await user.type(screen.getByRole("textbox", { name: "Autor" }), "Fernando Aramburu")
    await user.click(screen.getByRole("button", { name: "Añadir a la estantería" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Parece que ya lo tienes")
    await user.click(screen.getByRole("button", { name: "Guardar igualmente" }))
    await waitFor(() => expect(storedBooks()).toHaveLength(1))
  })

  it("asks for confirmation before deleting a book", async () => {
    localStorage.setItem("biblioteca-books", JSON.stringify([makeBook({ id: "1", title: "Dune" })]))
    const [book] = storedBooks()
    const { user } = renderWithShelf(<BookFormDialog />, [book])
    useBookFormStore.getState().openEdit(book)

    await user.click(await screen.findByRole("button", { name: /Eliminar/ }))
    expect(storedBooks()).toHaveLength(1)
    await user.click(screen.getByRole("button", { name: /¿Seguro\? Pulsa otra vez/ }))
    await waitFor(() => expect(storedBooks()).toHaveLength(0))
  })
})
