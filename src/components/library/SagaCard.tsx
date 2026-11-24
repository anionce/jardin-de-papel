import { Link } from "react-router-dom"
import { Check, ExternalLink } from "lucide-react"
import type { SagaProgress } from "@/lib/sagas"
import { cn } from "@/lib/utils"

export const SagaCard = ({ saga }: { saga: SagaProgress }) => {
  return (
    <li className="rounded-[1.5rem] bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl font-bold text-burgundy">{saga.name}</h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
            saga.complete ? "bg-sage-deep text-on-color" : "bg-mustard/40 text-foreground"
          )}
        >
          {saga.complete ? (saga.totalKnown ? "Completa" : `Sin huecos hasta el ${saga.total}`) : `${saga.owned} de ${saga.totalKnown ? "" : "al menos "}${saga.total}`}
        </span>
      </div>
      <Link to={`/autor/${encodeURIComponent(saga.author)}`} className="text-sm text-muted-foreground hover:text-burgundy hover:underline">
        {saga.author}
      </Link>
      <ol className="mt-3 flex flex-col gap-1.5">
        {saga.entries.map((entry) => (
          <li key={entry.number} className="flex items-center gap-2 text-sm">
            <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{entry.number}</span>
            {entry.book ? (
              <>
                <Check className="size-4 shrink-0 text-sage-deep" />
                <span className="line-clamp-1">{entry.book.title}</span>
              </>
            ) : (
              <>
                <span className="size-4 shrink-0 rounded-full border border-dashed border-muted-foreground/60" />
                <span className="line-clamp-1 text-muted-foreground">{entry.title ?? `Número ${entry.number}`}</span>
                {entry.buyUrl && (
                  <a
                    href={entry.buyUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Buscar ${entry.title ?? `el número ${entry.number}`} en librerías`}
                    className="ml-auto shrink-0 rounded-full p-1 text-muted-foreground hover:text-sage-deep"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </li>
  )
}
