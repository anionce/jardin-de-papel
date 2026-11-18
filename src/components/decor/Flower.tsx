import { cn } from "@/lib/utils"

interface FlowerProps {
  petal?: string
  center?: string
  petals?: number
  className?: string
}

export function Flower({ petal = "var(--paper)", center = "var(--mustard)", petals = 5, className }: FlowerProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn("pointer-events-none", className)}>
      {Array.from({ length: petals }, (_, i) => (
        <ellipse
          key={i}
          cx="50"
          cy="27"
          rx="16"
          ry="22"
          fill={petal}
          transform={`rotate(${(360 / petals) * i} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="13" fill={center} />
    </svg>
  )
}

export function Stem({ className, color = "var(--sage-deep)" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 80 200" aria-hidden="true" className={cn("pointer-events-none", className)}>
      <path d="M40 200 C 38 140, 44 90, 40 20" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M41 120 C 10 110, 2 80, 6 64 C 26 70, 40 92, 41 120 Z" fill={color} />
      <path d="M40 90 C 66 84, 78 60, 74 44 C 54 50, 40 70, 40 90 Z" fill={color} />
    </svg>
  )
}

export function Squiggle({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 60 10" aria-hidden="true" className={cn("h-2.5 w-14", className)}>
      <path
        d="M2 5 Q 9.5 0, 17 5 T 32 5 T 47 5 T 58 5"
        stroke={color}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
