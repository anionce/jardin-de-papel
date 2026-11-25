import { BookStack } from "@/components/decor/BookStack"
import { Flower } from "@/components/decor/Flower"
import { SearchBar } from "@/components/library/SearchBar"

export const LibraryHero = () => {
  return (
    <section className="scallop-bottom relative mb-12 rounded-t-[1.75rem] bg-burgundy px-6 pt-10 pb-12 [--scallop:var(--burgundy)] sm:px-12">
      <Flower className="absolute top-5 left-[46%] hidden w-9 sm:block" />
      <Flower className="absolute top-8 right-6 w-8 sm:right-10" petal="var(--blush)" />
      <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col items-start gap-4">
          <h1 className="font-serif text-4xl leading-[1.05] font-bold text-on-color sm:text-5xl">
            Tu
            <br />
            biblioteca
          </h1>
          <p className="text-[15px] text-on-color/85">Busca, filtra y encuentra cualquier libro.</p>
          <SearchBar />
        </div>
        <BookStack className="mx-auto hidden w-56 md:block lg:w-64" />
      </div>
    </section>
  )
}
