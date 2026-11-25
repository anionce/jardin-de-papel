import { Camera } from "lucide-react"
import { Flower, Squiggle } from "@/components/decor/Flower"

export const PhotoImportPage = () => {
  return (
    <div className="pb-4">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-coral px-7 py-12 text-on-color">
        <Flower className="absolute -right-4 -bottom-4 w-24" petal="var(--paper)" center="var(--burgundy)" />
        <Camera className="size-9" />
        <h1 className="mt-3 font-serif text-4xl leading-tight font-bold">Desde fotos</h1>
        <Squiggle className="mt-2" />
        <p className="mt-4 max-w-md text-base">
          ¿Quieres añadir los libros de tu librería a partir de fotos? Habla conmigo y lo hacemos juntos :)
        </p>
      </section>
    </div>
  )
}
