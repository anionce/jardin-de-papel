import { Link, useLocation } from "react-router-dom"
import { Menu } from "@base-ui/react/menu"
import { ChevronDown } from "lucide-react"
import { SECTIONS } from "@/components/layout/sections"
import { useDuplicateGroups } from "@/hooks/useDuplicateGroups"
import { cn } from "@/lib/utils"

export const SectionsMenu = ({ className }: { className?: string }) => {
  const { pathname } = useLocation()
  const duplicates = useDuplicateGroups().length
  const items = [
    SECTIONS.genres,
    SECTIONS.sagas,
    SECTIONS.people,
    SECTIONS.shelves,
    ...(duplicates > 0 ? [SECTIONS.duplicates] : []),
    SECTIONS.import,
    SECTIONS.photos,
  ]
  const active = items.some((item) => pathname.startsWith(item.to))

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 text-sm font-medium transition-colors outline-none focus-visible:underline",
          active ? "text-burgundy underline decoration-2 underline-offset-6" : "text-muted-foreground hover:text-foreground",
          className
        )}
      >
        Secciones
        <ChevronDown className="size-4" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start" className="z-50">
          <Menu.Popup className="min-w-52 rounded-2xl bg-popover p-1.5 shadow-lg ring-1 ring-foreground/10 outline-none">
            {items.map((item) => (
              <Menu.LinkItem
                key={item.to}
                render={<Link to={item.to} />}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none data-highlighted:bg-secondary",
                  pathname.startsWith(item.to) ? "font-semibold text-burgundy" : "text-foreground"
                )}
              >
                <item.icon className="size-4 text-burgundy" aria-hidden />
                {item.title}
                {item === SECTIONS.duplicates && (
                  <span className="ml-auto rounded-full bg-coral px-1.5 py-px text-[11px] font-bold text-on-color tabular-nums">
                    {duplicates}
                  </span>
                )}
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
