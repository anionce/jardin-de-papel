import { cn } from "@/lib/utils"

const READ_OPTIONS = [
  { value: true, label: "Sí" },
  { value: false, label: "No" },
]

export const ReadToggle = ({ read, onChange }: { read: boolean; onChange: (read: boolean) => void }) => {
  return (
    <fieldset className="flex items-center gap-3 sm:col-span-2">
      <legend className="sr-only">¿Leído?</legend>
      <span className="text-[13px] font-medium">¿Leído?</span>
      {READ_OPTIONS.map((option) => (
        <button
          key={option.label}
          type="button"
          aria-pressed={read === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
            read === option.value ? "bg-sage-deep text-on-color" : "border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  )
}
