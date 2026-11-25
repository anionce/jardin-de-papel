import { collection, getDocs } from "firebase/firestore"
import { firestore } from "@/lib/firebase"

export interface LibraryOption {
  id: string
  label: string
}

const OWN_LABEL = "Mi biblioteca"
const FALLBACK_LABEL = "Biblioteca sin nombre"

const peopleLabel = (data: unknown) => {
  const people = (data as { people?: unknown } | undefined)?.people
  const names = Array.isArray(people) ? people.filter((p): p is string => typeof p === "string" && p.trim() !== "") : []
  if (names.length === 0) return FALLBACK_LABEL
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`
}

export const libraryOptions = (docs: { id: string; data: unknown }[], own: string | null): LibraryOption[] => {
  const options = docs.map(({ id, data }) => ({ id, label: id === own ? OWN_LABEL : peopleLabel(data) }))
  return options.sort((a, b) => {
    if (a.id === own) return -1
    if (b.id === own) return 1
    return a.label.localeCompare(b.label, "es")
  })
}

export const fetchLibraryOptions = async (own: string | null) => {
  if (!firestore) return []
  const snapshot = await getDocs(collection(firestore, "libraries"))
  return libraryOptions(
    snapshot.docs.map((d) => ({ id: d.id, data: d.data() })),
    own
  )
}
