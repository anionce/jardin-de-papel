import { cn } from "@/lib/utils"

/** Ilustración del hero: pila de libros con un jarrón de flores encima. */
export function BookStack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 230" aria-hidden="true" className={cn("pointer-events-none", className)}>
      {/* libros */}
      <rect x="18" y="186" width="200" height="30" rx="6" fill="var(--mustard)" />
      <rect x="30" y="193" width="176" height="3" rx="1.5" fill="#fff" opacity=".45" />
      <rect x="30" y="204" width="176" height="3" rx="1.5" fill="#fff" opacity=".45" />
      <rect x="34" y="154" width="182" height="32" rx="6" fill="var(--blush)" />
      <circle cx="60" cy="170" r="5" fill="var(--burgundy)" opacity=".7" />
      <circle cx="78" cy="170" r="5" fill="var(--burgundy)" opacity=".7" />
      <circle cx="96" cy="170" r="5" fill="var(--burgundy)" opacity=".7" />
      <rect x="24" y="126" width="172" height="28" rx="6" fill="var(--sage)" />
      <rect x="140" y="126" width="14" height="28" fill="var(--paper)" opacity=".6" />
      {/* jarrón */}
      <path
        d="M98 126 C 84 112, 84 92, 96 80 C 100 76, 100 70, 98 64 L 130 64 C 128 70, 128 76, 132 80 C 144 92, 144 112, 130 126 Z"
        fill="var(--paper)"
      />
      <circle cx="104" cy="100" r="4.5" fill="var(--sage-deep)" />
      <circle cx="122" cy="94" r="4.5" fill="var(--sage-deep)" />
      <circle cx="116" cy="112" r="4.5" fill="var(--sage-deep)" />
      {/* tallos y flores */}
      <path d="M108 64 C 104 46, 92 34, 86 22" stroke="var(--sage-deep)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M116 64 C 118 40, 120 26, 122 10" stroke="var(--sage-deep)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M122 64 C 134 50, 146 42, 156 36" stroke="var(--sage-deep)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M118 44 C 132 40, 140 30, 140 22 C 128 24, 118 34, 118 44 Z" fill="var(--sage-deep)" />
      <g transform="translate(70 6) scale(.32)">
        <Petals color="var(--coral)" />
      </g>
      <g transform="translate(106 -8) scale(.32)">
        <Petals color="var(--paper)" />
      </g>
      <g transform="translate(140 20) scale(.3)">
        <Petals color="var(--mustard)" center="var(--coral)" />
      </g>
    </svg>
  )
}

function Petals({ color, center = "var(--mustard)" }: { color: string; center?: string }) {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="50" cy="27" rx="16" ry="22" fill={color} transform={`rotate(${72 * i} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="13" fill={center} />
    </>
  )
}
