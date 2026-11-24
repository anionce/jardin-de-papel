import { cn } from "@/lib/utils"

interface PersonPickerProps {
  label: string
  people: string[]
  value?: string
  onPick: (person: string) => void
  disabled?: boolean
  onDark?: boolean
}

export const PersonPicker = ({ label, people, value, onPick, disabled, onDark }: PersonPickerProps) => {
  const optionClass = (selected: boolean) => {
    if (onDark) return selected ? "bg-paper text-burgundy" : "bg-paper/15 text-on-color hover:bg-paper/25"
    return selected ? "bg-sage-deep text-on-color" : "border border-border text-muted-foreground hover:text-foreground"
  }

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{label}</legend>
      <span className="text-[13px] font-medium">{label}</span>
      {people.map((person) => (
        <button
          key={person}
          type="button"
          disabled={disabled}
          aria-pressed={value === person}
          onClick={() => onPick(person)}
          className={cn(
            "cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-60",
            optionClass(value === person)
          )}
        >
          {person}
        </button>
      ))}
    </fieldset>
  )
}
