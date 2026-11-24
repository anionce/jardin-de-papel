import type { Book } from "@/lib/types"

const MAX_SIMILAR_SHOWN = 3

export const SimilarBooksWarning = ({ books }: { books: Book[] }) => {
  return (
    <div className="rounded-2xl bg-mustard/30 px-4 py-3 text-sm sm:col-span-2" role="alert">
      <p className="font-semibold">Parece que ya lo tienes:</p>
      <ul className="mt-1 list-disc pl-5">
        {books.slice(0, MAX_SIMILAR_SHOWN).map((b) => (
          <li key={b.id}>
            «{b.title ?? "Sin título"}»{b.author && ` de ${b.author}`}
            {b.year && ` (${b.year})`}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-foreground/75">Si es otra edición y quieres las dos, pulsa guardar otra vez.</p>
    </div>
  )
}
