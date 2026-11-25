import { afterEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import type { Book } from "@/lib/types"
import { PublisherPage } from "@/pages/PublisherPage"
import { useLibraryStore } from "@/store/useLibraryStore"
import { useSelectionStore } from "@/store/useSelectionStore"
import { makeBook } from "@/test/factories"

const renderPublisher = (books: Book[], name: string) => {
  useLibraryStore.setState({ books, loaded: true, error: null })
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={[`/editorial/${encodeURIComponent(name)}`]}>
        <Routes>
          <Route path="/editorial/:name" element={<PublisherPage />} />
        </Routes>
      </MemoryRouter>
    ),
  }
}

afterEach(() => useSelectionStore.getState().stop())

describe("PublisherPage", () => {
  const mine = makeBook({ title: "Patria", author: "Fernando Aramburu", publisher: "Tusquets" })
  const sameDifferentSpelling = makeBook({ title: "Nada", author: "Carmen Laforet", publisher: "tusquets " })
  const other = makeBook({ title: "1984", publisher: "Debolsillo" })

  it("shows only the owned books from that publisher, whatever the spelling", () => {
    renderPublisher([mine, sameDifferentSpelling, other], "Tusquets")

    expect(screen.getByRole("heading", { level: 1, name: "Tusquets" })).toBeInTheDocument()
    expect(screen.getByText("2 libros de esta editorial en tu estantería")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Patria" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Nada" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "1984" })).not.toBeInTheDocument()
  })

  it("selects all its books at once", async () => {
    const { user } = renderPublisher([mine, sameDifferentSpelling, other], "Tusquets")

    await user.click(screen.getByRole("button", { name: /Seleccionar varios/ }))
    await user.click(screen.getByRole("button", { name: "Todos los visibles (2)" }))

    expect(screen.getByText("2 seleccionados")).toBeInTheDocument()
  })

  it("links each book's publisher to its page", () => {
    renderPublisher([mine], "Tusquets")
    expect(screen.getByRole("link", { name: "Tusquets" })).toHaveAttribute("href", "/editorial/Tusquets")
  })
})
