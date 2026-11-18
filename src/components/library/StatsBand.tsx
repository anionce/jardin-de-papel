import { Squiggle } from "@/components/decor/Flower"
import type { Book } from "@/lib/types"

export function StatsBand({ books }: { books: Book[] }) {
  const read = books.filter((b) => b.read).length
  const authors = new Set(books.map((b) => b.author?.trim().toLowerCase()).filter(Boolean)).size
  const pagesRead = books.reduce((sum, b) => sum + (b.read && b.pages ? b.pages : 0), 0)
  const stats = [
    { label: "Libros", value: books.length, tone: "bg-paper" },
    { label: "Leídos", value: read, tone: "bg-blush/60" },
    { label: "Por leer", value: books.length - read, tone: "bg-mustard/40" },
    { label: "Autores", value: authors, tone: "bg-paper" },
    { label: "Páginas leídas", value: pagesRead.toLocaleString("es"), tone: "bg-blush/60" },
  ]

  return (
    <section className="mt-14 grid gap-6 rounded-[1.75rem] bg-sage px-6 py-8 sm:px-10 md:grid-cols-[auto_1fr] md:items-center">
      <div>
        <h2 className="font-serif text-3xl leading-tight font-bold text-burgundy">
          Tu
          <br />
          estantería
        </h2>
        <Squiggle className="mt-2 text-burgundy" />
        <p className="mt-2 max-w-[14rem] text-sm text-on-color">Tus libros, contados con cariño.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-2xl px-4 py-5 text-center ${stat.tone}`}>
            <p className="font-serif text-3xl font-bold text-burgundy tabular-nums">{stat.value}</p>
            <p className="mt-1 text-xs font-medium text-foreground/75">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
