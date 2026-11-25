import { describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { subscribeBooks } from "@/lib/db"
import { saveSettings, subscribeSettings } from "@/lib/settings"
import type { Book, LibrarySettings } from "@/lib/types"
import { ShelvesPage } from "@/pages/ShelvesPage"
import { useSettingsStore } from "@/store/useSettingsStore"
import { makeBook } from "@/test/factories"
import { renderWithShelf } from "@/test/render"

const base: LibrarySettings = { people: ["Alex"], defaultPerson: "Alex", shelves: [{ name: "Salón" }] }

const seed = async (books: Book[], settings: LibrarySettings) => {
  localStorage.setItem("biblioteca-books", JSON.stringify(books))
  await saveSettings(settings)
  useSettingsStore.setState({ settings })
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

const storedSettings = (): LibrarySettings | null => {
  let settings: LibrarySettings | null = null
  subscribeSettings(
    (next) => (settings = next),
    () => undefined
  )()
  return settings
}

describe("ShelvesPage", () => {
  it("lists the shelves with their books and adds new ones", async () => {
    const books = await seed([makeBook({ shelf: "Salón" }), makeBook()], base)
    const { user } = renderWithShelf(<ShelvesPage />, books)

    expect(screen.getByText("Salón").nextSibling).toHaveTextContent("1 libro")
    await user.type(screen.getByRole("textbox", { name: "Nombre de la estantería" }), "Pasillo")
    await user.click(screen.getByRole("button", { name: /Añadir estantería/ }))

    await waitFor(() => expect(storedSettings()?.shelves).toEqual([{ name: "Salón" }, { name: "Pasillo" }]))
  })

  it("renames a shelf and moves its books along", async () => {
    const book = makeBook({ shelf: "Salón" })
    const books = await seed([book], base)
    const { user } = renderWithShelf(<ShelvesPage />, books)

    await user.click(screen.getByRole("button", { name: /Renombrar/ }))
    const input = screen.getByRole("textbox", { name: "Nuevo nombre" })
    await user.clear(input)
    await user.type(input, "Cuarto")
    await user.click(screen.getByRole("button", { name: "Guardar nombre" }))

    await waitFor(() => expect(storedSettings()?.shelves).toEqual([{ name: "Cuarto" }]))
    expect(storedBooks()[0].shelf).toBe("Cuarto")
  })

  it("removes a shelf after confirming and leaves its books without one", async () => {
    const books = await seed([makeBook({ shelf: "Salón" })], base)
    const { user } = renderWithShelf(<ShelvesPage />, books)

    await user.click(screen.getByRole("button", { name: /Quitar/ }))
    await user.click(screen.getByRole("button", { name: /¿Seguro?/ }))

    await waitFor(() => expect(storedSettings()?.shelves).toEqual([]))
    expect(storedBooks()[0].shelf).toBeUndefined()
  })
})
