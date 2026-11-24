import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { SagasPage } from "@/pages/SagasPage"
import { makeBook } from "@/test/factories"
import { renderWithShelf } from "@/test/render"

const shelf = [
  makeBook({ title: "Forrest Gump", author: "Winston Groom" }),
  makeBook({ title: "Gump & Co.", author: "Winston Groom" }),
  makeBook({ title: "Ragdoll", author: "Daniel Cole" }),
]

describe("SagasPage", () => {
  it("shows only unfinished sagas by default, with what is missing", () => {
    renderWithShelf(<SagasPage />, shelf)

    expect(screen.getByRole("heading", { name: "Ragdoll" })).toBeInTheDocument()
    expect(screen.getByText("1 de 3")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Buscar Hangman en librerías" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Forrest Gump" })).not.toBeInTheDocument()
  })

  it("shows complete sagas too when asked", async () => {
    const { user } = renderWithShelf(<SagasPage />, shelf)

    await user.click(screen.getByRole("button", { name: "Todas" }))

    expect(screen.getByRole("heading", { name: "Forrest Gump" })).toBeInTheDocument()
    expect(screen.getByText("Completa")).toBeInTheDocument()
  })
})
