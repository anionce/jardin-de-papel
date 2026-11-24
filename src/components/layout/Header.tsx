import { NavLink } from "react-router-dom"
import { LogOut, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDuplicateGroups } from "@/hooks/useDuplicateGroups"
import { useBookFormStore } from "@/store/useBookFormStore"
import { useLibraryStore } from "@/store/useLibraryStore"

const NAV_ITEMS = [
  { to: "/", label: "Biblioteca", end: true },
  { to: "/generos", label: "Géneros", end: false },
  { to: "/sagas", label: "Sagas", end: false },
  { to: "/personas", label: "Personas", end: false },
  { to: "/fotos", label: "Desde fotos", end: false },
  { to: "/importar", label: "Importar", end: false },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
    isActive ? "text-burgundy underline decoration-2 underline-offset-6" : "text-muted-foreground hover:text-foreground"
  )

export const Header = ({ onSignOut }: { onSignOut?: () => void }) => {
  const openNew = useBookFormStore((s) => s.openNew)
  const count = useLibraryStore((s) => s.books.length)
  const duplicateCount = useDuplicateGroups().length

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
        {duplicateCount > 0 && (
          <NavLink to="/duplicados" className={navLinkClass}>
            Duplicados
            <span className="rounded-full bg-coral px-1.5 py-px text-[11px] font-bold text-on-color tabular-nums">
              {duplicateCount}
            </span>
          </NavLink>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground tabular-nums sm:inline">
          {count} {count === 1 ? "libro" : "libros"}
        </span>
        <Button onClick={openNew} className="h-9 rounded-full bg-sage-deep px-4 text-on-color hover:bg-sage-deep/85">
          <Plus /> Añadir libro
        </Button>
        {onSignOut && (
          <Button variant="ghost" size="icon-sm" aria-label="Cerrar sesión" onClick={onSignOut} className="text-muted-foreground">
            <LogOut />
          </Button>
        )}
      </div>
    </header>
  )
}
