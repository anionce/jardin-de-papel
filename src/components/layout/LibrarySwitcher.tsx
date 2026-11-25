import { useEffect, useState } from "react"
import { SelectField } from "@/components/ui/select-field"
import { fetchLibraryOptions, type LibraryOption } from "@/lib/libraries"
import { currentLibrary, isAdmin, ownLibrary, switchLibrary } from "@/lib/membership"
import { useFiltersStore } from "@/store/useFiltersStore"

const openLibrary = (library: string) => {
  useFiltersStore.getState().reset()
  switchLibrary(library)
}

export const LibrarySwitcher = () => {
  const admin = isAdmin()
  const [options, setOptions] = useState<LibraryOption[]>([])

  useEffect(() => {
    if (!admin) return
    let cancelled = false
    fetchLibraryOptions(ownLibrary())
      .then((found) => {
        if (!cancelled) setOptions(found)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [admin])

  if (!admin || options.length < 2) return null

  return (
    <SelectField
      aria-label="Biblioteca"
      value={currentLibrary()}
      onChange={(e) => openLibrary(e.target.value)}
      className="h-9 max-w-44 text-xs font-medium"
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </SelectField>
  )
}
