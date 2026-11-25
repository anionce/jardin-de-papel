import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { pageSlots } from "@/lib/pagination"
import { cn } from "@/lib/utils"

interface PaginationProps {
  page: number
  count: number
  onChange: (page: number) => void
}

export const Pagination = ({ page, count, onChange }: PaginationProps) => {
  if (count < 2) return null

  return (
    <nav aria-label="Páginas" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Página anterior"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="rounded-full"
      >
        <ChevronLeft />
      </Button>
      {pageSlots(page, count).map((slot, i) =>
        slot === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={slot}
            type="button"
            aria-label={`Página ${slot}`}
            aria-current={slot === page ? "page" : undefined}
            onClick={() => onChange(slot)}
            className={cn(
              "size-9 cursor-pointer rounded-full text-sm font-medium tabular-nums transition-colors",
              slot === page ? "bg-burgundy text-on-color" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {slot}
          </button>
        )
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Página siguiente"
        disabled={page === count}
        onClick={() => onChange(page + 1)}
        className="rounded-full"
      >
        <ChevronRight />
      </Button>
    </nav>
  )
}
