import { useEffect, useRef, useState } from "react"
import { lookupBook, WORK_LOOKUP_VERSION } from "@/lib/bookLookup"
import { updateEachBook } from "@/lib/db"
import type { Book, BookDraft } from "@/lib/types"
import { useBookFormStore } from "@/store/useBookFormStore"
import { useLibraryStore } from "@/store/useLibraryStore"

const DELAY_MS = 800

const FLUSH_EVERY = 20

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const needsCover = (b: Book) => !b.coverUrl && !b.coverChecked
const needsWork = (b: Book) => b.workVersion !== WORK_LOOKUP_VERSION

export const useBookLookupBackfill = (enabled: boolean) => {
  const books = useLibraryStore((s) => s.books)
  const running = useRef(false)
  const attempted = useRef(new Set<string>())

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
        while (useBookFormStore.getState().open) await wait(1000)
        attempted.current.add(book.id)
        try {
          const cover = needsCover(book)

          const result = await lookupBook(book, { cover })

          const patch: Partial<BookDraft> = { workKey: result.workKey, workChecked: true, workVersion: WORK_LOOKUP_VERSION }

          if (!book.pages && result.pages) patch.pages = result.pages
          if (cover && (result.coverUrl || result.coverComplete)) {
            patch.coverUrl = result.coverUrl
            patch.coverChecked = true
          }
          patches.push({ id: book.id, patch })
          if (patches.length >= FLUSH_EVERY) await flush()
        } catch {
        }
        await wait(DELAY_MS)
      }
      await flush()
      running.current = false
      setRound((r) => r + 1)
    })()
  }, [enabled, books, round])
}
