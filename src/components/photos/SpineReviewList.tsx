import { AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { fillsMissingPublisher, type PhotoCandidate } from "@/lib/photoImport"
import { cn } from "@/lib/utils"

type EditableField = "title" | "author" | "publisher"

const FIELDS: { name: EditableField; label: string }[] = [
  { name: "title", label: "Título" },
  { name: "author", label: "Autor" },
  { name: "publisher", label: "Editorial" },
]

interface SpineReviewListProps {
  candidates: PhotoCandidate[]
  onChange: (key: string, patch: Partial<PhotoCandidate>) => void
}

export const SpineReviewList = ({ candidates, onChange }: SpineReviewListProps) => {
  return (
    <ul className="flex flex-col gap-2">
      {candidates.map((candidate, index) => (
        <li
          key={candidate.key}
          className={cn("flex gap-3 rounded-2xl bg-card p-3", !candidate.include && "opacity-60")}
        >
          <input
            type="checkbox"
            checked={candidate.include}
            onChange={(e) => onChange(candidate.key, { include: e.target.checked })}
            aria-label={`Añadir ${candidate.title || `el libro ${index + 1}`}`}
            className="mt-2 size-5 shrink-0 accent-[var(--sage-deep)]"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1.5fr_1fr]">
              {FIELDS.map((field) => (
                <Input
                  key={field.name}
                  value={candidate[field.name]}
                  onChange={(e) => onChange(candidate.key, { [field.name]: e.target.value })}
                  placeholder={field.label}
                  aria-label={`${field.label} del libro ${index + 1}`}
                  className="h-9"
                />
              ))}
            </div>
            {candidate.existing && (
              <p className="text-xs text-muted-foreground">
                Ya lo tienes: «{candidate.existing.title ?? "Sin título"}»
                {candidate.existing.author && ` de ${candidate.existing.author}`}
                {fillsMissingPublisher(candidate) && ` · se le pondrá la editorial ${candidate.publisher.trim()} para buscar su portada`}
              </p>
            )}
            {candidate.uncertain && (
              <p className="flex items-center gap-1 text-xs font-medium text-coral">
                <AlertTriangle className="size-3.5" /> No se leía bien: revisa el título y el autor
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
