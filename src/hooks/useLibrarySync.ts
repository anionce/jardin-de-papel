import { useEffect } from "react"
import { subscribeBooks } from "@/lib/db"
import { useLibraryStore } from "@/store/useLibraryStore"

export const useLibrarySync = (enabled: boolean) => {
  const setBooks = useLibraryStore((s) => s.setBooks)
  const setError = useLibraryStore((s) => s.setError)

  useEffect(() => {
    if (!enabled) return

    return subscribeBooks(setBooks, (error) => {
      const denied = "code" in error && error.code === "permission-denied"
      setError(
        denied
          ? "Esta cuenta de Google no tiene acceso a esta biblioteca."
          : "No se ha podido cargar la biblioteca. Revisa la conexión."
      )
    })
  }, [enabled, setBooks, setError])
}
