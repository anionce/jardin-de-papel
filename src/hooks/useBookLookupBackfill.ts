import { useEffect, useRef, useState } from "react"
import { lookupBook, WORK_LOOKUP_VERSION } from "@/lib/bookLookup"
import { updateEachBook } from "@/lib/db"
import type { Book, BookDraft } from "@/lib/types"
import { useBookFormStore } from "@/store/useBookFormStore"
import { useLibraryStore } from "@/store/useLibraryStore"

// Pausa entre libros para no saturar las APIs (Open Library se ralentiza
// si se le pide mucho, y entonces el buscador del formulario va lento).
const DELAY_MS = 800
// Los resultados se guardan de golpe cada tantos libros: menos escrituras y
// menos repintados de la estantería.
const FLUSH_EVERY = 20

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const needsCover = (b: Book) => !b.coverUrl && !b.coverChecked
const needsWork = (b: Book) => b.workVersion !== WORK_LOOKUP_VERSION

/**
 * Recorre en segundo plano los libros a los que falta portada u obra de Open
 * Library y guarda el resultado en la base de datos: cada libro se busca una
 * sola vez y el otro usuario ya lo ve resuelto.
 */
export function useBookLookupBackfill(enabled: boolean) {
  const books = useLibraryStore((s) => s.books)
  const running = useRef(false)
  const attempted = useRef(new Set<string>())
  // Si Google Books se queda sin cuota, se sigue sólo con Open Library.
  const googleAvailable = useRef(true)
  // Al acabar una pasada se vuelve a mirar: pueden haber llegado libros
  // nuevos (una importación) mientras se recorría la anterior.
  const [round, setRound] = useState(0)

  useEffect(() => {
    if (!enabled || running.current) return
    const pending = books.filter(
      (b) => (needsCover(b) || needsWork(b)) && !attempted.current.has(b.id)
    )
    if (pending.length === 0) return

    running.current = true
    void (async () => {
      let patches: { id: string; patch: Partial<BookDraft> }[] = []
      const flush = async () => {
        const toSave = patches
        patches = []
        await updateEachBook(toSave).catch(() => toSave.forEach((p) => attempted.current.delete(p.id)))
      }
      for (const book of pending) {
        // Con el formulario abierto, Open Library queda libre para sus sugerencias.
        while (useBookFormStore.getState().open) await wait(1000)
        attempted.current.add(book.id)
        try {
          const cover = needsCover(book)
          const result = await lookupBook(book, { cover, useGoogle: googleAvailable.current })
          if (cover && !result.coverComplete) googleAvailable.current = false

          const patch: Partial<BookDraft> = { workKey: result.workKey, workChecked: true, workVersion: WORK_LOOKUP_VERSION }
          // Páginas aproximadas (mediana de sus ediciones) si no las tenía.
          if (!book.pages && result.pages) patch.pages = result.pages
          if (cover && (result.coverUrl || result.coverComplete)) {
            patch.coverUrl = result.coverUrl
            patch.coverChecked = true
          }
          patches.push({ id: book.id, patch })
          if (patches.length >= FLUSH_EVERY) await flush()
        } catch {
          // Error de red puntual: se reintenta en la próxima visita.
        }
        await wait(DELAY_MS)
      }
      await flush()
      running.current = false
      setRound((r) => r + 1)
    })()
  }, [enabled, books, round])
}
