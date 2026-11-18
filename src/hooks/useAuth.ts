import { useEffect, useState } from "react"
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth"
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)

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
    isLocalMode: !isFirebaseConfigured,
    signIn: () => (auth ? signInWithPopup(auth, googleProvider) : Promise.resolve()),
    signOut: () => (auth ? signOut(auth) : Promise.resolve()),
  }
}
