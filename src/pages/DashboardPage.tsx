import { useMemo } from "react"
import { Link } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { Camera, Copy, Layers, Library, MapPin, Tags, Upload, Users } from "lucide-react"
import { BookStack } from "@/components/decor/BookStack"
import { Flower } from "@/components/decor/Flower"
import { StatsBand } from "@/components/library/StatsBand"
import { useDuplicateGroups } from "@/hooks/useDuplicateGroups"
import { genreUsage } from "@/lib/genres"
import { sagaProgress } from "@/lib/sagas"
import { shelvesOf } from "@/lib/shelves"
import { cn } from "@/lib/utils"
import { useLibraryStore } from "@/store/useLibraryStore"
import { useSettingsStore } from "@/store/useSettingsStore"

interface PanelCard {
  to: string
  title: string
  detail: string
  icon: LucideIcon
  tone: string
}

const plural = (count: number, one: string, many: string) => `${count.toLocaleString("es")} ${count === 1 ? one : many}`

const peopleList = (people: string[]) =>
  people.length > 1 ? `${people.slice(0, -1).join(", ")} y ${people[people.length - 1]}` : (people[0] ?? "")

export const DashboardPage = () => {
  const { books, loaded } = useLibraryStore()
  const settings = useSettingsStore((s) => s.settings)
  const duplicates = useDuplicateGroups().length
  const withoutGenre = useMemo(() => genreUsage(books).withoutGenre, [books])
  const incompleteSagas = useMemo(() => sagaProgress(books).filter((s) => !s.complete).length, [books])
  const shelves = shelvesOf(settings).length

  const cards: PanelCard[] = [
    { to: "/biblioteca", title: "Biblioteca", detail: plural(books.length, "libro", "libros"), icon: Library, tone: "bg-blush/70" },
    {
      to: "/generos",
      title: "Géneros",
      detail: withoutGenre > 0 ? plural(withoutGenre, "libro sin género", "libros sin género") : "Todos tienen género",
      icon: Tags,
      tone: "bg-mustard/45",
    },
    {
      to: "/sagas",
      title: "Sagas",
      detail: incompleteSagas > 0 ? plural(incompleteSagas, "saga sin completar", "sagas sin completar") : "Todas completas",
      icon: Layers,
      tone: "bg-sage/70",
    },
    { to: "/personas", title: "Personas", detail: peopleList(settings.people), icon: Users, tone: "bg-coral/60" },
    {
      to: "/estanterias",
      title: "Estanterías",
      detail: shelves > 0 ? plural(shelves, "estantería", "estanterías") : "Aún no hay ninguna",
      icon: MapPin,
      tone: "bg-mustard/80",
    },
    ...(duplicates > 0
      ? [{ to: "/duplicados", title: "Duplicados", detail: plural(duplicates, "posible repetido", "posibles repetidos"), icon: Copy, tone: "bg-burgundy/15" }]
      : []),
    { to: "/importar", title: "Importar", detail: "Desde Goodreads", icon: Upload, tone: "bg-sage-deep/40" },
    { to: "/fotos", title: "Desde fotos", detail: "Tu librería en fotos", icon: Camera, tone: "bg-burgundy/30" },
  ]

  return (
    <div className="pb-4">
      <section className="relative mb-10 overflow-hidden rounded-[1.75rem] bg-burgundy px-6 py-10 sm:px-12">
        <Flower className="absolute top-5 left-[46%] hidden w-9 sm:block" />
        <Flower className="absolute top-8 right-6 w-8 sm:right-10" petal="var(--blush)" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col items-start gap-3">
            <h1 className="font-serif text-4xl leading-[1.05] font-bold text-on-color sm:text-5xl">
              Tu jardín
              <br />
              de papel
            </h1>
            <p className="text-[15px] text-on-color/85">Todo lo que crece en tus estanterías.</p>
          </div>
          <BookStack className="mx-auto hidden w-48 md:block lg:w-56" />
        </div>
      </section>

      <nav aria-label="Secciones" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={cn(
              "group flex flex-col gap-3 rounded-2xl px-5 py-5 transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
              card.tone
            )}
          >
            <card.icon className="size-6 text-burgundy" aria-hidden />
            <span>
              <span className="block font-serif text-xl font-bold text-burgundy">{card.title}</span>
              <span className="mt-0.5 block text-sm text-foreground/75">{loaded ? card.detail : "…"}</span>
            </span>
          </Link>
        ))}
      </nav>

      {books.length > 0 && <StatsBand books={books} />}
    </div>
  )
}
