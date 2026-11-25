import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { SectionsMenu } from "@/components/layout/SectionsMenu"
import { renderWithShelf } from "@/test/render"

describe("SectionsMenu", () => {
  it("lists every section from any page", async () => {
    const { user } = renderWithShelf(<SectionsMenu />)
    await user.click(screen.getByRole("button", { name: "Secciones" }))

    expect(await screen.findByRole("menuitem", { name: "Géneros" })).toHaveAttribute("href", "/generos")
    expect(screen.getByRole("menuitem", { name: "Estanterías" })).toHaveAttribute("href", "/estanterias")
    expect(screen.getByRole("menuitem", { name: "Desde fotos" })).toHaveAttribute("href", "/fotos")
    expect(screen.queryByRole("menuitem", { name: /Duplicados/ })).not.toBeInTheDocument()
  })
})
