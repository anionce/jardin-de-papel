import { NavLink } from "react-router-dom"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LibrarySwitcher } from "@/components/layout/LibrarySwitcher"
import { SignOutButton } from "@/components/layout/SignOutButton"
import { cn } from "@/lib/utils"
import { useBookFormStore } from "@/store/useBookFormStore"
import { useLibraryStore } from "@/store/useLibraryStore"

const NAV_ITEMS = [
  { to: "/", label: "Inicio", end: true },
  { to: "/biblioteca", label: "Biblioteca", end: false },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
    isActive ? "text-burgundy underline decoration-2 underline-offset-6" : "text-muted-foreground hover:text-foreground"
  )

export const Header = ({ onSignOut }: { onSignOut?: () => void }) => {
  const openNew = useBookFormStore((s) => s.openNew)
  const count = useLibraryStore((s) => s.books.length)

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 pt-5 pb-4 sm:px-8">
      <NavLink to="/" className="leading-[1.1] text-[11px] font-bold tracking-[0.28em] text-burgundy uppercase">
        Jardín
        <br />
        de papel
      </NavLink>

      <nav className="order-3 flex w-full flex-wrap gap-x-5 gap-y-2 sm:order-none sm:w-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <LibrarySwitcher />
        <span className="hidden rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground tabular-nums sm:inline">
          {count} {count === 1 ? "libro" : "libros"}
        </span>
        <Button onClick={openNew} className="h-9 rounded-full bg-sage-deep px-4 text-on-color hover:bg-sage-deep/85">
          <Plus /> Añadir libro
        </Button>
        {onSignOut && <SignOutButton onSignOut={onSignOut} />}
      </div>
    </header>
  )
}
