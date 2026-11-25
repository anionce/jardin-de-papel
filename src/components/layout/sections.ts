import type { LucideIcon } from "lucide-react"
import { Camera, Copy, Layers, Library, MapPin, Tags, Upload, Users } from "lucide-react"

export interface Section {
  to: string
  title: string
  icon: LucideIcon
}

export const SECTIONS = {
  library: { to: "/biblioteca", title: "Biblioteca", icon: Library },
  genres: { to: "/generos", title: "Géneros", icon: Tags },
  sagas: { to: "/sagas", title: "Sagas", icon: Layers },
  people: { to: "/personas", title: "Personas", icon: Users },
  shelves: { to: "/estanterias", title: "Estanterías", icon: MapPin },
  duplicates: { to: "/duplicados", title: "Duplicados", icon: Copy },
  import: { to: "/importar", title: "Importar", icon: Upload },
  photos: { to: "/fotos", title: "Desde fotos", icon: Camera },
} satisfies Record<string, Section>
