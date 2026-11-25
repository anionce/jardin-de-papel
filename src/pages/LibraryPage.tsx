import { useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { ListChecks } from "lucide-react"
import { Flower, Squiggle, Stem } from "@/components/decor/Flower"
import { BookCard } from "@/components/library/BookCard"
import { EmptyLibrary } from "@/components/library/EmptyLibrary"
import { LibraryFilters } from "@/components/library/LibraryFilters"
import { LibraryHero } from "@/components/library/LibraryHero"
import { Pagination } from "@/components/library/Pagination"
import { SelectionBar } from "@/components/library/SelectionBar"
import { StatsBand } from "@/components/library/StatsBand"
import { Button } from "@/components/ui/button"
import { useFilteredBooks } from "@/hooks/useFilteredBooks"
import { clampPage, pageCount, pageItems } from "@/lib/pagination"
import { uniqueGenres } from "@/lib/search"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useLibraryStore } from "@/store/useLibraryStore"
import { useSelectionStore } from "@/store/useSelectionStore"

const PAGE_PARAM = "pagina"

export const LibraryPage = () => {
  const { books, loaded, error } = useLibraryStore()
  const filtered = useFilteredBooks()
  const genres = useMemo(() => uniqueGenres(books), [books])
  const resetFilters = useFiltersStore((s) => s.reset)
  const selecting = useSelectionStore((s) => s.active)
  const startSelecting = useSelectionStore((s) => s.start)
  const stopSelecting = useSelectionStore((s) => s.stop)

  useEffect(() => stopSelecting, [stopSelecting])

  const [params, setParams] = useSearchParams()
  const page = clampPage(Number(params.get(PAGE_PARAM) ?? 1), filtered.length)
  const visible = pageItems(filtered, page)
  const gridRef = useRef<HTMLDivElement>(null)
  const filterKey = useFiltersStore((s) => JSON.stringify([s.text, s.read, s.genres, s.sort, s.person, s.shelf]))
  const lastFilterKey = useRef(filterKey)

  useEffect(() => {
    if (lastFilterKey.current === filterKey) return
    lastFilterKey.current = filterKey
    setParams(
      (current) => {
        current.delete(PAGE_PARAM)
        return current
      },
      { replace: true }
    )
  }, [filterKey, setParams])

  const goToPage = (next: number) => {
    setParams((current) => {
      if (next === 1) current.delete(PAGE_PARAM)
      else current.set(PAGE_PARAM, String(next))
      return current
    })
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <LibraryHero />

      <section className="relative px-2">
        <Stem className="absolute top-0 left-0 hidden h-36 -rotate-12 lg:block" />
        <Flower className="absolute top-2 left-14 hidden w-10 lg:block" petal="var(--coral)" />
        <Flower className="absolute top-6 right-6 hidden w-10 lg:block" petal="var(--mustard)" center="var(--coral)" />

        <div className="mb-6 flex flex-col items-center text-center">
          <h2 className="font-serif text-3xl leading-tight font-bold text-burgundy sm:text-4xl">
            Leídos despacio,
            <br />
            guardados con cariño
          </h2>
          <Squiggle className="mt-2 text-sage-deep" />
          <p className="mt-2 text-sm text-muted-foreground">
            {loaded ? `${filtered.length} de ${books.length} libros en la estantería` : "Cargando la estantería…"}
          </p>
        </div>

        {error && <p className="mx-auto mb-6 max-w-lg rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">{error}</p>}

        {loaded && books.length === 0 && !error && <EmptyLibrary />}

        {books.length > 0 && (
          <>
            <div className="flex flex-col items-center gap-3">
              <LibraryFilters genres={genres} />
              <Button
                variant={selecting ? "default" : "outline"}
                onClick={selecting ? stopSelecting : startSelecting}
                className="h-9 rounded-full px-4"
              >
                <ListChecks /> {selecting ? "Terminar selección" : "Seleccionar varios"}
              </Button>
            </div>
            {filtered.length > 0 ? (
              <>
                <div ref={gridRef} className="mt-8 grid scroll-mt-6 grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {visible.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
                <Pagination page={page} count={pageCount(filtered.length)} onChange={goToPage} />
              </>
            ) : (
              <div className="mt-10 flex flex-col items-center gap-3 text-center">
                <p className="font-serif text-xl text-burgundy">Ningún libro coincide con la búsqueda.</p>
                <Button variant="outline" onClick={resetFilters} className="rounded-full">
                  Quitar filtros
                </Button>
              </div>
            )}
            <StatsBand books={books} />
            {selecting && <SelectionBar visibleBooks={filtered} />}

            {selecting && <div className="h-40" />}
          </>
        )}
      </section>
    </>
  )
}
