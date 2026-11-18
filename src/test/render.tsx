import type { ReactElement } from "react"
import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import type { Book } from "@/lib/types"
import { useLibraryStore } from "@/store/useLibraryStore"

export function renderWithShelf(ui: ReactElement, books: Book[] = []) {
  useLibraryStore.setState({ books, loaded: true, error: null })
  return { user: userEvent.setup(), ...render(<MemoryRouter>{ui}</MemoryRouter>) }
}
