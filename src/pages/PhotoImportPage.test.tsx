import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { PhotoImportPage } from "@/pages/PhotoImportPage"
import { renderWithShelf } from "@/test/render"

describe("PhotoImportPage", () => {
  it("asks people to get in touch to add books from photos", () => {
    renderWithShelf(<PhotoImportPage />, [])
    expect(screen.getByRole("heading", { name: "Desde fotos" })).toBeInTheDocument()
    expect(screen.getByText(/Habla conmigo y lo hacemos juntos/)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
