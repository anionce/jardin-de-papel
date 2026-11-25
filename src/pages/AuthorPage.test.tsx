import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import type { Book } from "@/lib/types"
import { AuthorPage } from "@/pages/AuthorPage"
import { useLibraryStore } from "@/store/useLibraryStore"
import { useSelectionStore } from "@/store/useSelectionStore"
import { makeBook } from "@/test/factories"

const requestWorkMatching = vi.hoisted(() => vi.fn())
vi.mock("@/lib/shelfApi", () => ({ requestWorkMatching }))

const openLibrary = (works: object[]) =>
  vi.fn(async (url: string) =>
    new Response(
      JSON.stringify(
        url.includes("/search/authors.json")
          ? { docs: [{ key: "OL1A", name: "Jane Writer", work_count: 10 }] }
          : { docs: works }
      )
    )
  )

const renderAuthor = (books: Book[], name = "Jane Writer") => {
  useLibraryStore.setState({ books, loaded: true, error: null })
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={[`/autor/${encodeURIComponent(name)}`]}>
        <Routes>
          <Route path="/autor/:name" element={<AuthorPage />} />
        </Routes>
      </MemoryRouter>
    ),
  }
}

afterEach(() => {
  requestWorkMatching.mockReset()
  localStorage.clear()
  vi.unstubAllGlobals()
  useSelectionStore.getState().stop()
})

describe("AuthorPage", () => {
  beforeEach(() => {
    requestWorkMatching.mockRejectedValue(new Error("sin Gemini"))
  })

  const mine = makeBook({ title: "First Novel", author: "Jane Writer", workKey: "/works/MINE" })
  const other = makeBook({ title: "Not Hers", author: "Someone Else" })

  it("shows only the author's books from the shelf", () => {
    vi.stubGlobal("fetch", openLibrary([]))
    renderAuthor([mine, other])

    expect(screen.getByRole("heading", { level: 1, name: "Jane Writer" })).toBeInTheDocument()
    expect(screen.getByText("1 libro en tu estantería")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "First Novel" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Not Hers" })).not.toBeInTheDocument()
  })

  it("lists the author's other works that are not on the shelf, with a bookshop link", async () => {
    vi.stubGlobal(
      "fetch",
      openLibrary([
        { key: "/works/MINE", title: "First Novel in English", edition_count: 9, author_name: ["Jane Writer"] },
        { key: "/works/2", title: "Second Novel", edition_count: 4, author_name: ["Jane Writer"], first_publish_year: 2001 },
      ])
    )
    renderAuthor([mine])

    expect(await screen.findByRole("heading", { name: "Second Novel" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "First Novel in English" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Buscar en librerías/ })).toHaveAttribute(
      "href",
      expect.stringContaining("todostuslibros.com")
    )
  })

  it("says so when the search fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })))
    renderAuthor([mine])

    expect(await screen.findByText(/No se han podido buscar/)).toBeInTheDocument()
  })

  it("selects all the author's books at once", async () => {
    vi.stubGlobal("fetch", openLibrary([]))
    const second = makeBook({ title: "Third Novel", author: "Jane Writer" })
    const { user } = renderAuthor([mine, second, other])

    await user.click(screen.getByRole("button", { name: /Seleccionar varios/ }))
    await user.click(screen.getByRole("button", { name: "Todos los visibles (2)" }))

    expect(screen.getByText("2 seleccionados")).toBeInTheDocument()
  })

  it("hides works already owned in another language and shows the Spanish title of the rest", async () => {
    requestWorkMatching.mockResolvedValue([
      { key: "/works/2", ownedTitle: "", show: false, spanishTitle: "" },
      { key: "/works/3", ownedTitle: "", show: true, spanishTitle: "Las horas distantes" },
    ])
    vi.stubGlobal(
      "fetch",
      openLibrary([
        { key: "/works/2", title: "The First Novel", edition_count: 4, author_name: ["Jane Writer"] },
        { key: "/works/3", title: "The Distant Hours", edition_count: 4, author_name: ["Jane Writer"] },
      ])
    )
    renderAuthor([mine])

    expect(await screen.findByRole("heading", { name: "Las horas distantes" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "The First Novel" })).not.toBeInTheDocument()
    expect(screen.getByText("Original: «The Distant Hours»")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Buscar en librerías/ })).toHaveAttribute(
      "href",
      expect.stringContaining("Las%20horas%20distantes")
    )
    expect(requestWorkMatching).toHaveBeenCalledWith(
      expect.objectContaining({ author: "Jane Writer", owned: ["First Novel"] })
    )
  })
})
