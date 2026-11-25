import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { LibraryPage } from "@/pages/LibraryPage"
import { ImportPage } from "@/pages/ImportPage"
import { GenresPage } from "@/pages/GenresPage"
import { DuplicatesPage } from "@/pages/DuplicatesPage"
import { PeoplePage } from "@/pages/PeoplePage"
import { PhotoImportPage } from "@/pages/PhotoImportPage"
import { AuthorPage } from "@/pages/AuthorPage"
import { SagasPage } from "@/pages/SagasPage"
import { ShelvesPage } from "@/pages/ShelvesPage"
import { PublisherPage } from "@/pages/PublisherPage"

export const App = () => {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LibraryPage />} />
        <Route path="generos" element={<GenresPage />} />
        <Route path="duplicados" element={<DuplicatesPage />} />
        <Route path="personas" element={<PeoplePage />} />
        <Route path="importar" element={<ImportPage />} />
        <Route path="fotos" element={<PhotoImportPage />} />
        <Route path="autor/:name" element={<AuthorPage />} />
        <Route path="editorial/:name" element={<PublisherPage />} />
        <Route path="sagas" element={<SagasPage />} />
        <Route path="estanterias" element={<ShelvesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
