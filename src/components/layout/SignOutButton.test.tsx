import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SignOutButton } from "@/components/layout/SignOutButton"

describe("SignOutButton", () => {
  it("asks before signing out", async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<SignOutButton onSignOut={onSignOut} />)

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }))
    expect(await screen.findByText("¿Cerrar sesión?")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onSignOut).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "Cerrar sesión" }))
    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
