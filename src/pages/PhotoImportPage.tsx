import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, ScanText } from "lucide-react"
import { Flower, Squiggle } from "@/components/decor/Flower"
import { PhotoPicker } from "@/components/photos/PhotoPicker"
import { SpineReviewList } from "@/components/photos/SpineReviewList"
import { Button } from "@/components/ui/button"
import { useShelfPhotoReading } from "@/hooks/useShelfPhotoReading"
import { addBooks, updateEachBook } from "@/lib/db"
import { candidatesToDrafts, publisherPatches } from "@/lib/photoImport"
import { DEFAULT_SORT } from "@/lib/search"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useLibraryStore } from "@/store/useLibraryStore"

const TIPS = [
  "Haz fotos de los lomos de frente y con buena luz.",
  "Mejor una balda (o media) por foto que toda la estantería.",
  "Puedes subir varias fotos a la vez; si se solapan, no se repiten libros.",
  "Antes de guardar podrás corregir títulos, autores y editoriales.",
]

const bookCount = (n: number) => `${n} ${n === 1 ? "libro" : "libros"}`

export const PhotoImportPage = () => {
  const navigate = useNavigate()
  const library = useLibraryStore((s) => s.books)
  const resetFilters = useFiltersStore((s) => s.reset)
  const setSort = useFiltersStore((s) => s.setSort)
  const [photos, setPhotos] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { progress, errors, candidates, readPhotos, updateCandidate, reset } = useShelfPhotoReading()

  const reading = progress !== null
  const drafts = candidates ? candidatesToDrafts(candidates) : []
  const editionFixes = candidates ? publisherPatches(candidates) : []
  const saveLabel = [drafts.length > 0 && `Añadir ${bookCount(drafts.length)}`, editionFixes.length > 0 && `completar ${editionFixes.length} ${editionFixes.length === 1 ? "edición" : "ediciones"}`]
    .filter(Boolean)
    .join(" y ")

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await updateEachBook(editionFixes)
      await addBooks(drafts)
      resetFilters()
      setSort(DEFAULT_SORT)
      navigate("/")
    } catch {
      setSaveError("Algo ha fallado al guardar los libros. Inténtalo de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 pb-4 lg:grid-cols-[1fr_1.6fr]">
      <section className="relative self-start overflow-hidden rounded-[1.75rem] bg-coral px-7 py-9 text-on-color">
        <Flower className="absolute -right-4 -bottom-4 w-24" petal="var(--paper)" center="var(--burgundy)" />
        <h1 className="font-serif text-4xl leading-tight font-bold">
          Desde
          <br />
          fotos
        </h1>
        <Squiggle className="mt-2" />
        <ul className="mt-5 flex list-disc flex-col gap-2 pl-5 text-sm">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <PhotoPicker
          photos={photos}
          onAdd={(files) => {
            setPhotos((current) => [...current, ...files])
            reset()
          }}
          onRemove={(index) => setPhotos((current) => current.filter((_, i) => i !== index))}
          disabled={reading || saving}
        />

        {photos.length > 0 && !candidates && (
          <Button
            onClick={() => void readPhotos(photos, library)}
            disabled={reading}
            className="h-11 self-start rounded-full px-6 text-[14px] font-semibold"
          >
            {reading ? <Loader2 className="animate-spin" /> : <ScanText />}
            {reading
              ? `Leyendo foto ${Math.min(progress.done + 1, progress.total)} de ${progress.total}…`
              : `Leer ${photos.length === 1 ? "la foto" : `las ${photos.length} fotos`}`}
          </Button>
        )}

        {errors.length > 0 && (
          <ul className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        {candidates && (
          <div className="flex flex-col gap-3">
            <p className="font-serif text-2xl font-bold text-burgundy">
              {candidates.length === 0 ? "No he encontrado libros en las fotos" : `He leído ${bookCount(candidates.length)}`}
            </p>
            {candidates.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Marca los que quieras añadir y corrige lo que esté mal. Los que ya tienes salen desmarcados.
              </p>
            )}
            <SpineReviewList candidates={candidates} onChange={updateCandidate} />
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <Button
              onClick={handleSave}
              disabled={saving || !saveLabel}
              className="h-11 self-start rounded-full px-6 text-[14px] font-semibold"
            >
              {saving && <Loader2 className="animate-spin" />}
              {saveLabel ? saveLabel.charAt(0).toUpperCase() + saveLabel.slice(1) : "Nada que añadir"}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
