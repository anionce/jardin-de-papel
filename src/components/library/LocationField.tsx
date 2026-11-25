import { Link } from "react-router-dom"
import { MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { SelectField } from "@/components/ui/select-field"
import type { Shelf } from "@/lib/types"

interface LocationFieldProps {
  shelves: Shelf[]
  shelf: string
  location: string
  onShelfChange: (shelf: string) => void
  onLocationChange: (location: string) => void
}

export const LocationField = ({ shelves, shelf, location, onShelfChange, onLocationChange }: LocationFieldProps) => {
  const knownShelf = shelves.some((s) => s.name === shelf)
  const photo = shelves.find((s) => s.name === shelf)?.photo

  return (
    <fieldset className="flex flex-col gap-2 rounded-2xl bg-card p-3 sm:col-span-2">
      <legend className="sr-only">Localización</legend>
      <span className="flex items-center gap-1.5 text-[13px] font-medium">
        <MapPin className="size-4 text-sage-deep" /> Localización
      </span>
      <div className="flex gap-3">
        {photo && <img src={photo} alt={`Estantería ${shelf}`} className="h-16 w-20 shrink-0 rounded-lg object-cover" />}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {shelves.length > 0 ? (
            <SelectField value={knownShelf ? shelf : ""} onChange={(e) => onShelfChange(e.target.value)} aria-label="Estantería">
              <option value="">Sin estantería</option>
              {shelves.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </SelectField>
          ) : (
            <p className="text-xs text-muted-foreground">
              Crea tus estanterías (con foto) en{" "}
              <Link to="/estanterias" className="font-semibold text-sage-deep underline-offset-2 hover:underline">
                Estanterías
              </Link>{" "}
              para elegirlas aquí.
            </p>
          )}
          <Input
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Nota: segunda balda, detrás…"
            aria-label="Nota de localización"
            autoComplete="off"
          />
        </div>
      </div>
    </fieldset>
  )
}
