import { useMemo, useState } from "react"
import { Squiggle } from "@/components/decor/Flower"
import { SagaCard } from "@/components/library/SagaCard"
import { sagaProgress } from "@/lib/sagas"
import { cn } from "@/lib/utils"
import { useLibraryStore } from "@/store/useLibraryStore"

export const SagasPage = () => {
  const books = useLibraryStore((s) => s.books)
  const sagas = useMemo(() => sagaProgress(books), [books])
  const [onlyIncomplete, setOnlyIncomplete] = useState(true)
  const incomplete = sagas.filter((s) => !s.complete)
  const visible = onlyIncomplete ? incomplete : sagas

  return (
    <div className="pb-4">
      <section className="mb-8 rounded-[1.75rem] bg-mustard/45 px-7 py-9">
        <h1 className="font-serif text-4xl leading-tight font-bold text-burgundy">Sagas</h1>
        <Squiggle className="mt-2 text-burgundy" />
        <p className="mt-3 max-w-xl text-sm text-foreground/85">
          Las sagas de las que tienes algún libro y los que te faltan. Salen de una lista de sagas conocidas y del número
          de saga que trae Goodreads en el título («Flanagan, #7»).
        </p>
        <p className="mt-2 text-sm text-foreground/85">
          {sagas.length} sagas · {incomplete.length} sin completar
        </p>
      </section>

      <div className="mb-6 flex justify-center gap-1 rounded-full bg-secondary p-1 sm:mx-auto sm:w-fit">
        {[
          { value: true, label: "Sin completar" },
          { value: false, label: "Todas" },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={onlyIncomplete === option.value}
            onClick={() => setOnlyIncomplete(option.value)}
            className={cn(
              "cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              onlyIncomplete === option.value ? "bg-burgundy text-on-color" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-center text-muted-foreground">No hay sagas a medias. ✿</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map((saga) => (
            <SagaCard key={`${saga.name}|${saga.author}`} saga={saga} />
          ))}
        </ul>
      )}
    </div>
  )
}
