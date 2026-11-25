import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { DashboardPage } from "@/pages/DashboardPage"
import { makeBook } from "@/test/factories"
import { renderWithShelf } from "@/test/render"

describe("DashboardPage", () => {
  it("links to every section with a summary of each", () => {
    renderWithShelf(<DashboardPage />, [
      makeBook({ title: "El hobbit", author: "J.R.R. Tolkien", genres: ["Fantasía"], read: true }),
      makeBook({ title: "Patria", author: "Fernando Aramburu" }),
    ])

    expect(screen.getByRole("link", { name: /Biblioteca\s*2 libros/ })).toHaveAttribute("href", "/biblioteca")
    expect(screen.getByRole("link", { name: /Géneros\s*1 libro sin género/ })).toHaveAttribute("href", "/generos")
    expect(screen.getByRole("link", { name: /Estanterías\s*Aún no hay ninguna/ })).toHaveAttribute("href", "/estanterias")
    expect(screen.queryByRole("link", { name: /Duplicados/ })).not.toBeInTheDocument()
    expect(screen.getByText("Páginas leídas")).toBeInTheDocument()
  })
})
