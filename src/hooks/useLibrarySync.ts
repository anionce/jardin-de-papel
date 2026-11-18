import { useEffect } from "react"
import { claimUnownedBooks, subscribeBooks } from "@/lib/db"
import { useLibraryStore } from "@/store/useLibraryStore"

/** Mantiene useLibraryStore sincronizado en tiempo real con los libros de
 * la cuenta (también entre dispositivos). */
export function useLibrarySync(enabled: boolean) {
  const setBooks = useLibraryStore((s) => s.setBooks)
  const setError = useLibraryStore((s) => s.setError)

  useEffect(() => {
    if (!enabled) return
    // Libros de antes de separar bibliotecas: cada uno recoge los suyos.
    // La suscripción los recibe en cuanto se les pone dueño.
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
