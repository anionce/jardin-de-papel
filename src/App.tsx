import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { LibraryPage } from "@/pages/LibraryPage"
import { ImportPage } from "@/pages/ImportPage"
import { GenresPage } from "@/pages/GenresPage"
import { DuplicatesPage } from "@/pages/DuplicatesPage"

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LibraryPage />} />
        <Route path="generos" element={<GenresPage />} />
        <Route path="duplicados" element={<DuplicatesPage />} />
        <Route path="importar" element={<ImportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
