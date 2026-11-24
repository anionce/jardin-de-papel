import type { ComponentProps } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export const SelectField = ({ className, children, ...props }: ComponentProps<"select">) => {
  return (
    <span className="relative inline-flex">
      <select
        className={cn(
          "h-9 cursor-pointer appearance-none rounded-full border border-border bg-background pr-9 pl-3.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-60" />
    </span>
  )
}
