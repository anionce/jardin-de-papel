import { useEffect } from "react"
import { claimUnownedBooks, subscribeBooks } from "@/lib/db"
import { useLibraryStore } from "@/store/useLibraryStore"

export const useLibrarySync = (enabled: boolean) => {
  const setBooks = useLibraryStore((s) => s.setBooks)
  const setError = useLibraryStore((s) => s.setError)

  useEffect(() => {
    if (!enabled) return

    claimUnownedBooks().catch(() => undefined)
    return subscribeBooks(setBooks, (error) => {
      const denied = "code" in error && error.code === "permission-denied"
      setError(
        denied
          ? "Esta cuenta de Google no tiene acceso a la biblioteca. Pide que la añadan a las reglas de Firestore."
          : "No se ha podido cargar la biblioteca. Revisa la conexión."
      )
    })
  }, [enabled, setBooks, setError])
}
