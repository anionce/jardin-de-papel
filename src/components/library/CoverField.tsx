import { useRef, type ChangeEvent, type Dispatch, type SetStateAction } from "react"
import { Camera, ImageOff, Loader2, Search } from "lucide-react"
import { BookCover } from "@/components/library/BookCover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { useCoverSearch } from "@/hooks/useCoverSearch"
import type { FormValues } from "@/lib/bookForm"
import { isUploadedImage } from "@/lib/image"
import type { Book } from "@/lib/types"

interface CoverFieldProps {
  values: FormValues
  setValues: Dispatch<SetStateAction<FormValues>>
  cover: ReturnType<typeof useCoverSearch>
  preview: Book
}

export const CoverField = ({ values, setValues, cover, preview }: CoverFieldProps) => {
  const fileInput = useRef<HTMLInputElement>(null)
  const isUpload = isUploadedImage(values.coverUrl)

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) void cover.uploadCover(file)
  }

  return (
    <div className="flex gap-3 rounded-2xl bg-card p-3 sm:col-span-2 sm:gap-4">
      <BookCover key={values.coverUrl} book={preview} className="w-16 shrink-0 sm:w-20" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">
          Portada (URL de la imagen)
          <Input
            value={isUpload ? "" : values.coverUrl}
            onChange={(e) => setValues((v) => ({ ...v, coverUrl: e.target.value, coverRemoved: false }))}
            placeholder={isUpload ? "Foto subida ✓" : "https://…"}
            inputMode="url"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cover.findNextCover}
            disabled={cover.searching || (!values.title.trim() && !values.isbn.trim())}
            className="rounded-full"
          >
            {cover.searching ? <Loader2 className="animate-spin" /> : <Search />}{" "}
            {cover.hasCandidates && values.coverUrl ? "Otra portada" : "Buscar portada"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
            disabled={cover.searching}
            className="rounded-full"
          >
            <Camera /> Subir foto
          </Button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          {values.coverUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setValues((v) => ({ ...v, coverUrl: "", coverRemoved: true }))}
              className="rounded-full text-muted-foreground"
            >
              <ImageOff /> Quitar
            </Button>
          )}
        </div>
        {cover.message && <p className="text-xs text-muted-foreground">{cover.message}</p>}
      </div>
    </div>
  )
}
