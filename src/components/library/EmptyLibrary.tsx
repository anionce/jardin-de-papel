import { Link } from "react-router-dom"
import { Flower } from "@/components/decor/Flower"
import { Button } from "@/components/ui/button"
import { useBookFormStore } from "@/store/useBookFormStore"

export const EmptyLibrary = () => {
  const openNew = useBookFormStore((s) => s.openNew)
  return (
    <div className="relative mx-auto max-w-xl overflow-hidden rounded-[1.75rem] bg-coral px-8 py-10 text-center text-on-color">
      <Flower className="absolute -top-4 -left-4 w-16" />
      <Flower className="absolute -right-3 -bottom-5 w-20" petal="var(--mustard)" center="var(--burgundy)" />
      <h2 className="font-serif text-3xl font-bold">La estantería está vacía</h2>
      <p className="mt-2 text-sm opacity-90">Empieza trayendo tu biblioteca de Goodreads o añade el primer libro a mano.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={openNew} className="h-10 rounded-full bg-paper px-5 text-burgundy hover:bg-paper/90">
          Añadir a mano
        </Button>
        <Button
          render={<Link to="/importar" />}
          nativeButton={false}
          className="h-10 rounded-full bg-burgundy px-5 text-on-color hover:bg-burgundy/85"
        >
          Importar de Goodreads
        </Button>
      </div>
    </div>
  )
}
