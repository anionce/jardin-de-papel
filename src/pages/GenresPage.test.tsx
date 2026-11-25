import { describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { subscribeBooks } from "@/lib/db"
import type { Book } from "@/lib/types"
import { GenresPage } from "@/pages/GenresPage"
import { makeBook } from "@/test/factories"
import { renderWithShelf } from "@/test/render"

const seedShelf = (books: Book[]): Book[] => {
  localStorage.setItem("biblioteca-books", JSON.stringify(books))
  return books
}

const storedBooks = (): Book[] => {
  let books: Book[] = []
  subscribeBooks(
    (next) => (books = next),
    () => undefined
  )()
  return books
}

describe("GenresPage", () => {
  it("lists genres with how many books have them", () => {
    renderWithShelf(<GenresPage />, [makeBook({ genres: ["Novela"] }), makeBook({ genres: ["Novela", "Poesía"] }), makeBook()])
    expect(screen.getByText("2 géneros · 1 libro sin género")).toBeInTheDocument()
    expect(screen.getByText("Novela").nextSibling).toHaveTextContent("2")
  })

  it("merges a genre into an existing one when renamed to its name", async () => {
    const books = seedShelf([makeBook({ id: "a", genres: ["novela"] }), makeBook({ id: "b", genres: ["Novela"] })])
    const { user } = renderWithShelf(<GenresPage />, books)

    const [firstRename] = screen.getAllByRole("button", { name: /Renombrar/ })
    await user.click(firstRename)
    const input = screen.getByRole("textbox")
    await user.clear(input)
    await user.type(input, "NOVELA")

    expect(screen.getByText(/Se unirá con/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Guardar nombre" }))
    await waitFor(() => expect(storedBooks().map((b) => b.genres)).toEqual([["Novela"], ["Novela"]]))
  })

  it("removes a genre from all its books after confirming", async () => {
    const books = seedShelf([makeBook({ id: "a", genres: ["Poesía", "Novela"] })])
    const { user } = renderWithShelf(<GenresPage />, books)

    const [deletePoetry] = screen.getAllByRole("button", { name: /Borrar/ })
    await user.click(deletePoetry)
    await user.click(screen.getByRole("button", { name: /¿Seguro\?/ }))

    await waitFor(() => expect(storedBooks()[0].genres).toHaveLength(1))
  })

  it("goes through the books without genre and saves the chosen ones", async () => {
    const tagged = makeBook({ title: "Uno", author: "Ana Autora", genres: ["Misterio"] })
    const first = makeBook({ title: "Dos", author: "Ana Autora" })
    const second = makeBook({ title: "Tres", author: "Zoe Autora" })
    const { user } = renderWithShelf(<GenresPage />, seedShelf([tagged, first, second]))

    expect(screen.getByText(/no tienen género/)).toHaveTextContent("2 libros no tienen género")
    await user.click(screen.getByRole("button", { name: /Ponerles género/ }))
    expect(screen.getByRole("heading", { name: "Dos" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Misterio" }))
    await user.click(screen.getByRole("button", { name: /Guardar y siguiente/ }))
    await waitFor(() => expect(storedBooks().find((b) => b.id === first.id)?.genres).toEqual(["Misterio"]))

    await user.click(screen.getByRole("button", { name: /Saltar/ }))
    expect(await screen.findByText("Solo quedan los que has saltado")).toBeInTheDocument()
  })
})

