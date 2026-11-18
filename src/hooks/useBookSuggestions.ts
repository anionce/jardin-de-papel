import { useEffect, useState } from "react"
import { searchBookSuggestions, type BookSuggestion } from "@/lib/bookLookup"

const MIN_CHARS = 3
const DEBOUNCE_MS = 450

/**
 * Busca libros mientras se escribe título/autor (con pausa, y cancelando la
 * búsqueda anterior). `loading` se deduce: hay consulta y aún no su resultado.
 */
export function useBookSuggestions(title: string, author: string, enabled: boolean) {
  const [result, setResult] = useState<{ query: string; books: BookSuggestion[]; partial?: boolean }>({
    query: "",
    books: [],
  })

  const t = title.trim()
  const a = author.trim()
  const query = enabled && (t.length >= MIN_CHARS || a.length >= MIN_CHARS) ? JSON.stringify([t, a]) : ""

  useEffect(() => {
    if (!query) return
    const [title, author] = JSON.parse(query) as [string, string]
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const books = await searchBookSuggestions({ title, author }, controller.signal, (partial) =>
          setResult({ query, books: partial, partial: true })
        )
        setResult({ query, books })
      } catch {
        if (!controller.signal.aborted) setResult({ query, books: [] })
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const current = query !== "" && result.query === query
  return {
    active: query !== "",
    // Con resultados parciales ya se muestran, pero sigue "buscando".
    loading: query !== "" && (!current || Boolean(result.partial)),
    suggestions: current ? result.books : [],
  }
}
