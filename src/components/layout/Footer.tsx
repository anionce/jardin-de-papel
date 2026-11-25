import { Squiggle } from "@/components/decor/Flower"

export const Footer = () => {
  return (
    <footer
      className="scallop-top mt-14 rounded-b-[2rem] bg-burgundy px-6 pt-9 pb-8 text-center text-on-color [--scallop:var(--burgundy)]"
    >
      <Squiggle className="mx-auto mb-3 opacity-70" />
      <p className="text-[11px] font-bold tracking-[0.3em] uppercase">Jardín de Papel</p>
      <p className="mt-1.5 text-xs opacity-80">Donde crecen tus libros.</p>
    </footer>
  )
}
