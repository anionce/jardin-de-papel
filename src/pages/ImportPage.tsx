import { useMemo, useState, type ChangeEvent, type DragEvent } from "react"
import { useNavigate } from "react-router-dom"
import { FileUp, Loader2 } from "lucide-react"
import { Flower, Squiggle } from "@/components/decor/Flower"
import { Button } from "@/components/ui/button"
import { addBooks } from "@/lib/db"
import { parseGoodreadsCsv, planImport, type GoodreadsImport, type ImportPlan } from "@/lib/goodreads"
import { cn } from "@/lib/utils"
import { useLibraryStore } from "@/store/useLibraryStore"

const STEPS = [
  "Entra en goodreads.com desde el ordenador.",
  "Ve a My Books → Import and export (en la columna izquierda, abajo).",
  "Pulsa «Export Library» y descarga el archivo .csv cuando esté listo.",
  "Arrástralo aquí abajo.",
]

const EMPTY_PLAN: ImportPlan = { fresh: [], duplicates: 0, unreadSkipped: 0, similar: 0 }

const PREVIEW_LIMIT = 200

export const ImportPage = () => {
  const navigate = useNavigate()
  const books = useLibraryStore((s) => s.books)
  const [parsed, setParsed] = useState<GoodreadsImport | null>(null)
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [onlyRead, setOnlyRead] = useState(false)

  const { fresh, duplicates, unreadSkipped, similar } = useMemo(
    () => (parsed ? planImport(parsed, books, onlyRead) : EMPTY_PLAN),
    [parsed, books, onlyRead]
  )

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setParsed(null)
    setFileName(file.name)
    try {
      setParsed(await parseGoodreadsCsv(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido leer el archivo.")
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      await addBooks(fresh)
      navigate("/")
    } catch {
      setError("Algo ha fallado al guardar los libros. Inténtalo de nuevo.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="grid gap-6 pb-4 lg:grid-cols-[1fr_1.2fr]">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-coral px-7 py-9 text-on-color">
        <Flower className="absolute -right-4 -bottom-4 w-24" petal="var(--paper)" center="var(--burgundy)" />
        <h1 className="font-serif text-4xl leading-tight font-bold">
          Trae tu
          <br />
          Goodreads
        </h1>
        <Squiggle className="mt-2" />
        <ol className="mt-5 flex flex-col gap-3 text-sm">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-paper font-bold text-coral">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs opacity-85">
          Se importan título, autor, editorial, año, páginas, ISBN, si está leído y los estantes que parezcan géneros (un libro puede tener varios).
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-sage-deep bg-sage/25" : "border-border bg-card hover:border-sage-deep"
          )}
        >
          <FileUp className="size-9 text-sage-deep" />
          <span className="font-serif text-xl font-bold text-burgundy">{fileName || "Suelta aquí el .csv"}</span>
          <span className="text-sm text-muted-foreground">o pulsa para elegirlo</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])}
          />
        </label>

        {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

        {parsed && (
          <div className="rounded-[1.75rem] bg-sage/40 p-6">
            <p className="font-serif text-2xl font-bold text-burgundy">
              {fresh.length} {fresh.length === 1 ? "libro nuevo" : "libros nuevos"}
            </p>
            <p className="mt-1 text-sm text-foreground/80">
              {duplicates > 0 && `${duplicates} ya estaban en la estantería. `}
              {unreadSkipped > 0 && `${unreadSkipped} sin leer se quedan fuera. `}
              {parsed.skipped > 0 && `${parsed.skipped} filas vacías ignoradas.`}
            </p>
            {similar > 0 && (
              <p className="mt-2 rounded-xl bg-mustard/35 px-3 py-2 text-sm">
                {similar} {similar === 1 ? "se parece" : "se parecen"} a libros que ya tienes (otra edición o título casi
                igual). Se importarán y podrás revisarlos en «Duplicados».
              </p>
            )}
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={onlyRead}
                onChange={(e) => setOnlyRead(e.target.checked)}
                className="size-4 accent-[var(--sage-deep)]"
              />
              Importar solo los leídos
            </label>
            {fresh.length > 0 && (
              <ul className="mt-4 max-h-64 overflow-y-auto rounded-2xl bg-paper px-4 py-2 text-sm">
                {fresh.slice(0, PREVIEW_LIMIT).map((b, i) => (
                  <li key={i} className="flex justify-between gap-3 border-b border-border/60 py-2 last:border-0">
                    <span className="line-clamp-1 font-medium">{b.title ?? "Sin título"}</span>
                    <span className="line-clamp-1 shrink-0 text-muted-foreground">{b.author}</span>
                  </li>
                ))}
                {fresh.length > PREVIEW_LIMIT && (
                  <li className="py-2 text-muted-foreground">…y {fresh.length - PREVIEW_LIMIT} más</li>
                )}
              </ul>
            )}
            <Button
              onClick={handleImport}
              disabled={importing || fresh.length === 0}
              className="mt-5 h-11 rounded-full px-6 text-[14px] font-semibold"
            >
              {importing && <Loader2 className="animate-spin" />}
              Importar {fresh.length} {fresh.length === 1 ? "libro" : "libros"}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
