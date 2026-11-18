import { afterEach, describe, expect, it } from "vitest"
import { screen, within } from "@testing-library/react"
import { LibraryPage } from "@/pages/LibraryPage"
import { useFiltersStore } from "@/store/useFiltersStore"
import { makeBook } from "@/test/factories"
import { renderWithShelf } from "@/test/render"

const books = [
  makeBook({ title: "El hobbit", author: "J.R.R. Tolkien", read: true, genres: ["Fantasía"] }),
  makeBook({ title: "Patria", author: "Fernando Aramburu" }),
]

describe("LibraryPage", () => {
  afterEach(() => useFiltersStore.setState({ text: "", read: "all", genres: [] }))

  it("shows every book on the shelf", () => {
    renderWithShelf(<LibraryPage />, books)
    expect(screen.getByText("2 de 2 libros en la estantería")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "El hobbit" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Patria" })).toBeInTheDocument()
  })

  it("filters by search text", async () => {
    const { user } = renderWithShelf(<LibraryPage />, books)
    await user.type(screen.getByRole("searchbox", { name: "Buscar libros" }), "aramburu")

    expect(await screen.findByText("1 de 2 libros en la estantería")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "El hobbit" })).not.toBeInTheDocument()
  })

  it("filters by read state and lets the user clear the filters", async () => {
    const { user } = renderWithShelf(<LibraryPage />, books)
    await user.click(screen.getByRole("button", { name: "Leídos" }))
    await user.type(screen.getByRole("searchbox", { name: "Buscar libros" }), "patria")

    expect(await screen.findByText("Ningún libro coincide con la búsqueda.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Quitar filtros" }))
    expect(screen.getByText("2 de 2 libros en la estantería")).toBeInTheDocument()
  })

  it("invites to add or import books when the shelf is empty", () => {
    renderWithShelf(<LibraryPage />, [])
    expect(screen.getByRole("heading", { name: "La estantería está vacía" })).toBeInTheDocument()
    expect(screen.getByText("Importar de Goodreads").closest("a")).toHaveAttribute("href", "/importar")
  })

  it("selects several books at once", async () => {
    const { user } = renderWithShelf(<LibraryPage />, books)
    await user.click(screen.getByRole("button", { name: "Seleccionar varios" }))
    await user.click(screen.getByRole("button", { name: "Seleccionar Patria" }))

    expect(screen.getByText("1 seleccionado")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Todos los visibles/ }))
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument()
    expect(within(screen.getByText("2 seleccionados").parentElement!).getByRole("button", { name: "Ninguno" })).toBeInTheDocument()
  })
})
