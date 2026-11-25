import { useEffect, useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ListChecks } from "lucide-react"
import { Squiggle } from "@/components/decor/Flower"
import { BookCard } from "@/components/library/BookCard"
import { SelectionBar } from "@/components/library/SelectionBar"
import { Button } from "@/components/ui/button"
import { booksByPublisher } from "@/lib/search"
import { useLibraryStore } from "@/store/useLibraryStore"
import { useSelectionStore } from "@/store/useSelectionStore"

const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"

const bookCount = (n: number) => `${n} ${n === 1 ? "libro" : "libros"}`

export const PublisherPage = () => {
  const publisher = decodeURIComponent(useParams().name ?? "")
  const books = useLibraryStore((s) => s.books)
  const owned = useMemo(() => booksByPublisher(books, publisher), [books, publisher])
  const selecting = useSelectionStore((s) => s.active)
  const startSelecting = useSelectionStore((s) => s.start)
  const stopSelecting = useSelectionStore((s) => s.stop)

  useEffect(() => stopSelecting, [stopSelecting])

  return (
    <div className="pb-4">
      <section className="mb-8 rounded-[1.75rem] bg-blush/70 px-7 py-9">
        <Link to="/biblioteca" className="inline-flex items-center gap-1 text-sm text-foreground/75 hover:text-foreground">
          <ArrowLeft className="size-4" /> Biblioteca
        </Link>
        <h1 className="mt-3 font-serif text-4xl leading-tight font-bold break-words text-burgundy">{publisher}</h1>
        <Squiggle className="mt-2 text-burgundy" />
        <p className="mt-3 text-sm text-foreground/85">{bookCount(owned.length)} de esta editorial en tu estantería</p>
      </section>

      {owned.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No tienes libros de esta editorial.</p>
      ) : (
        <section>
          <div className="mb-6 flex justify-end">
            <Button
              variant={selecting ? "default" : "outline"}
              onClick={selecting ? stopSelecting : startSelecting}
              className="h-9 rounded-full px-4"
            >
              <ListChecks /> {selecting ? "Terminar selección" : "Seleccionar varios"}
            </Button>
          </div>
          <div className={GRID}>
            {owned.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {selecting && <SelectionBar visibleBooks={owned} />}
      {selecting && <div className="h-40" />}
    </div>
  )
}
