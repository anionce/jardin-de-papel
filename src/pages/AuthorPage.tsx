import { useEffect, useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ListChecks, Loader2 } from "lucide-react"
import { Squiggle } from "@/components/decor/Flower"
import { AuthorWorkCard } from "@/components/library/AuthorWorkCard"
import { BookCard } from "@/components/library/BookCard"
import { SelectionBar } from "@/components/library/SelectionBar"
import { Button } from "@/components/ui/button"
import { useAuthorWorkDocs } from "@/hooks/useAuthorWorks"
import { booksByAuthor, mainAuthor, otherWorks } from "@/lib/authorWorks"
import { useLibraryStore } from "@/store/useLibraryStore"
import { useSelectionStore } from "@/store/useSelectionStore"

const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"

const bookCount = (n: number) => `${n} ${n === 1 ? "libro" : "libros"}`

export const AuthorPage = () => {
  const author = decodeURIComponent(useParams().name ?? "")
  const books = useLibraryStore((s) => s.books)
  const owned = useMemo(() => booksByAuthor(books, author), [books, author])
  const ownedWorkKeys = useMemo(() => owned.flatMap((b) => (b.workKey ? [b.workKey] : [])), [owned])
  const { loading, failed, docs, ownedTitles } = useAuthorWorkDocs(author, ownedWorkKeys)
  const others = useMemo(() => otherWorks(docs, owned, mainAuthor(author), ownedTitles), [docs, owned, author, ownedTitles])
  const selecting = useSelectionStore((s) => s.active)
  const startSelecting = useSelectionStore((s) => s.start)
  const stopSelecting = useSelectionStore((s) => s.stop)

  useEffect(() => stopSelecting, [stopSelecting])

  return (
    <div className="pb-4">
      <section className="mb-8 rounded-[1.75rem] bg-sage px-7 py-9">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-on-color/85 hover:text-on-color">
          <ArrowLeft className="size-4" /> Biblioteca
        </Link>
        <h1 className="mt-3 font-serif text-4xl leading-tight font-bold break-words text-burgundy">{author}</h1>
        <Squiggle className="mt-2 text-burgundy" />
        <p className="mt-3 text-sm text-on-color">{bookCount(owned.length)} en tu estantería</p>
      </section>

      {owned.length > 0 && (
        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-bold text-burgundy">Los que tienes</h2>
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

      <section className="mt-14">
        <h2 className="font-serif text-2xl font-bold text-burgundy">Otros libros suyos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Según Open Library; los títulos pueden salir en su idioma original.</p>
        {loading && (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Buscando sus libros…
          </p>
        )}
        {failed && <p className="mt-6 text-sm text-destructive">No se han podido buscar ahora mismo. Prueba más tarde.</p>}
        {!loading && !failed && others.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">No he encontrado más libros suyos que no tengas.</p>
        )}
        {others.length > 0 && (
          <div className={`mt-6 ${GRID}`}>
            {others.map((work) => (
              <AuthorWorkCard key={work.key} work={work} author={mainAuthor(author)} />
            ))}
          </div>
        )}
      </section>

      {selecting && <SelectionBar visibleBooks={owned} />}
      {selecting && <div className="h-40" />}
    </div>
  )
}
