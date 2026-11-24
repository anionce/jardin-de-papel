import { describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { subscribeBooks } from "@/lib/db"
import { saveSettings, subscribeSettings } from "@/lib/settings"
import type { Book, LibrarySettings } from "@/lib/types"
import { PeoplePage } from "@/pages/PeoplePage"
import { useSettingsStore } from "@/store/useSettingsStore"
import { makeBook } from "@/test/factories"
import { renderWithShelf } from "@/test/render"

const couple: LibrarySettings = { people: ["Alex", "Sam"], defaultPerson: "Alex" }

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

describe("PeoplePage", () => {
  it("shows each person with their books, counting unassigned ones for the default person", async () => {
    const books = await seed([makeBook(), makeBook({ person: "Alex" }), makeBook({ person: "Sam" })], couple)
    renderWithShelf(<PeoplePage />, books)

    expect(screen.getByText("Alex").nextSibling).toHaveTextContent("2 libros")
    expect(screen.getByText("Sam").nextSibling).toHaveTextContent("1 libro")
    expect(screen.getByRole("button", { name: "Alex es la persona por defecto" })).toBeDisabled()
  })

  it("adds a person", async () => {
    const books = await seed([], couple)
    const { user } = renderWithShelf(<PeoplePage />, books)

    await user.type(screen.getByRole("textbox", { name: "Nombre de otra persona" }), "Robin")
    await user.click(screen.getByRole("button", { name: /Añadir persona/ }))

    await waitFor(() => expect(storedSettings()?.people).toEqual(["Alex", "Sam", "Robin"]))
  })

  it("does not allow adding a name that already exists", async () => {
    const books = await seed([], couple)
    const { user } = renderWithShelf(<PeoplePage />, books)

    await user.type(screen.getByRole("textbox", { name: "Nombre de otra persona" }), "sam")

    expect(screen.getByText("Esa persona ya está en la lista.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Añadir persona/ })).toBeDisabled()
  })

  it("changes the default person", async () => {
    const books = await seed([], couple)
    const { user } = renderWithShelf(<PeoplePage />, books)

    await user.click(screen.getByRole("button", { name: "Hacer a Sam la persona por defecto" }))

    await waitFor(() => expect(storedSettings()?.defaultPerson).toBe("Sam"))
  })

  it("renames a person in the settings and in their books", async () => {
    const books = await seed([makeBook({ id: "a", person: "Sam" })], couple)
    const { user } = renderWithShelf(<PeoplePage />, books)

    const [, renameSam] = screen.getAllByRole("button", { name: /Renombrar/ })
    await user.click(renameSam)
    const input = screen.getByRole("textbox", { name: "Nuevo nombre" })
    await user.clear(input)
    await user.type(input, "Samuel")
    await user.click(screen.getByRole("button", { name: "Guardar nombre" }))

    await waitFor(() => expect(storedSettings()?.people).toEqual(["Alex", "Samuel"]))
    expect(storedBooks()[0].person).toBe("Samuel")
  })

  it("removes a person after confirming and gives their books to the default person", async () => {
    const books = await seed([makeBook({ id: "a", person: "Sam" })], couple)
    const { user } = renderWithShelf(<PeoplePage />, books)

    const [, removeSam] = screen.getAllByRole("button", { name: /Quitar/ })
    await user.click(removeSam)
    await user.click(screen.getByRole("button", { name: /¿Seguro\?/ }))

    await waitFor(() => expect(storedSettings()?.people).toEqual(["Alex"]))
    expect(storedBooks()[0].person).toBe("Alex")
  })

  it("never offers removing the only person", async () => {
    const books = await seed([], { people: ["Alex"], defaultPerson: "Alex" })
    renderWithShelf(<PeoplePage />, books)

    expect(screen.queryByRole("button", { name: /Quitar/ })).not.toBeInTheDocument()
  })
})
