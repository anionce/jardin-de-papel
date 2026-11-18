import { Flower, Stem } from "@/components/decor/Flower"
import { BookStack } from "@/components/decor/BookStack"
import { Button } from "@/components/ui/button"

export function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-5">
      <Stem className="absolute -bottom-6 left-[6%] h-64 opacity-90" />
      <Flower className="absolute top-[12%] left-[10%] w-14" />
      <Flower className="absolute right-[8%] bottom-[14%] w-20" petal="var(--coral)" />
      <div className="relative w-full max-w-sm rounded-[2rem] bg-paper p-8 text-center shadow-xl shadow-black/10">
        <BookStack className="mx-auto mb-4 w-40" />
        <h1 className="font-serif text-3xl font-bold text-burgundy">Jardín de Papel</h1>
        <p className="mt-2 text-sm text-muted-foreground">Nuestros libros, en un solo sitio y a mano siempre.</p>
        <Button onClick={onSignIn} className="mt-6 h-11 rounded-full px-6 text-[14px] font-semibold">
          Entrar con Google
        </Button>
      </div>
    </div>
  )
}
