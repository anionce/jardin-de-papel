import { useEffect, useState } from "react"
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth"
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  // Empieza en true para que la pantalla de login no parpadee mientras
  // Firebase restaura una sesión ya abierta.
  const [loading, setLoading] = useState(isFirebaseConfigured)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return {
    user,
    loading,
    /** En modo local no hay login: siempre se entra. */
    isLocalMode: !isFirebaseConfigured,
    signIn: () => (auth ? signInWithPopup(auth, googleProvider) : Promise.resolve()),
    signOut: () => (auth ? signOut(auth) : Promise.resolve()),
  }
}
