import { Outlet } from "react-router-dom"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { LoginScreen } from "@/components/layout/LoginScreen"
import { BookFormDialog } from "@/components/library/BookFormDialog"
import { useAuth } from "@/hooks/useAuth"
import { useBookLookupBackfill } from "@/hooks/useBookLookupBackfill"
import { useLibrarySync } from "@/hooks/useLibrarySync"

export function AppShell() {
  const { user, loading, isLocalMode, signIn, signOut } = useAuth()
  const signedIn = isLocalMode || Boolean(user)
  useLibrarySync(signedIn)
  useBookLookupBackfill(signedIn)

  if (loading) return null
  if (!signedIn) return <LoginScreen onSignIn={signIn} />

  return (
    <div className="px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-paper shadow-xl shadow-black/10">
        <Header onSignOut={isLocalMode ? undefined : signOut} />
        {isLocalMode && (
          <p className="mx-5 mb-3 rounded-xl bg-mustard/25 px-4 py-2 text-xs text-foreground/80 sm:mx-8">
            Modo local: los libros se guardan sólo en este navegador. Configura Firebase (.env) para guardarlos en tu cuenta.
          </p>
        )}
        <main className="px-3 sm:px-5">
          <Outlet />
        </main>
        <Footer />
      </div>
      <BookFormDialog />
    </div>
  )
}
