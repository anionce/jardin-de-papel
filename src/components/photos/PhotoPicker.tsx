import { useRef, type ChangeEvent } from "react"
import { Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useObjectUrls } from "@/hooks/useObjectUrls"

interface PhotoPickerProps {
  photos: File[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  disabled: boolean
}

export const PhotoPicker = ({ photos, onAdd, onRemove, disabled }: PhotoPickerProps) => {
  const input = useRef<HTMLInputElement>(null)
  const urls = useObjectUrls(photos)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ""
    if (files.length > 0) onAdd(files)
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => input.current?.click()}
        disabled={disabled}
        className="h-12 self-start rounded-full px-5"
      >
        <Camera /> {photos.length > 0 ? "Añadir más fotos" : "Elegir o hacer fotos"}
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Fotos de la estantería"
        onChange={handleChange}
      />
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {urls.map((url, index) => (
            <li key={url} className="relative">
              <img src={url} alt={`Foto ${index + 1}`} className="aspect-square w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled}
                aria-label={`Quitar la foto ${index + 1}`}
                className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
