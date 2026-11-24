export interface SagaVolume {
  number: number
  titles: string[]
}

export interface SagaDefinition {
  name: string
  author: string
  volumes: SagaVolume[]
}

const volumes = (...titles: (string | string[])[]): SagaVolume[] =>
  titles.map((title, index) => ({ number: index + 1, titles: Array.isArray(title) ? title : [title] }))

export const SAGA_CATALOG: SagaDefinition[] = [
  {
    name: "Crónicas de los Cazalet",
    author: "Elizabeth Jane Howard",
    volumes: volumes(
      ["Los años ligeros", "The Light Years"],
      ["Tiempo de espera", "Marking Time"],
      ["Confusión", "Confusion"],
      ["Un tiempo nuevo", "Casting Off"],
      ["Todo cambia", "All Change"]
    ),
  },
  {
    name: "Las hermanas Kopp",
    author: "Amy Stewart",
    volumes: volumes(
      "Girl Waits with Gun",
      "Lady Cop Makes Trouble",
      "Miss Kopp's Midnight Confessions",
      "Miss Kopp Just Won't Quit",
      "Kopp Sisters on the March",
      "Dear Miss Kopp",
      "Miss Kopp Investigates"
    ),
  },
  {
    name: "Kenzie y Gennaro",
    author: "Dennis Lehane",
    volumes: volumes(
      ["Un trago antes de la guerra", "A Drink Before the War"],
      ["Abrázame, oscuridad", "Darkness, Take My Hand"],
      ["Lo que es sagrado", "Sacred"],
      ["Desapareció una noche", "Gone, Baby, Gone"],
      ["Plegarias en la noche", "Prayers for Rain"],
      ["La última causa perdida", "Moonlight Mile"]
    ),
  },
  {
    name: "Coughlin",
    author: "Dennis Lehane",
    volumes: volumes(
      ["Cualquier otro día", "The Given Day"],
      ["Vivir de noche", "Live by Night"],
      ["Ese mundo desaparecido", "World Gone By"]
    ),
  },
  {
    name: "El poder del perro",
    author: "Don Winslow",
    volumes: volumes(["El poder del perro", "The Power of the Dog"], ["El cártel", "The Cartel"], ["La frontera", "The Border"]),
  },
  {
    name: "4MK",
    author: "J.D. Barker",
    volumes: volumes("The Fourth Monkey", "The Fifth to Die", "The Sixth Wicked Child"),
  },
  {
    name: "Aidan Waits",
    author: "Joseph Knox",
    volumes: volumes("Sirens", "The Smiling Man", "The Sleepwalker"),
  },
  {
    name: "Roxane Weary",
    author: "Kristen Lepionka",
    volumes: volumes("The Last Place You Look", "What You Want to See", "The Stories You Tell", "Once You Go This Far"),
  },
  {
    name: "Imogen Grey",
    author: "Katerina Diamond",
    volumes: volumes("The Teacher", "The Secret", "The Angel", "Truth or Die", "The Promise"),
  },
  {
    name: "Tennison",
    author: "Lynda La Plante",
    volumes: volumes(
      "Tennison",
      "Hidden Killers",
      "Good Friday",
      "Murder Mile",
      "The Dirty Dozen",
      "Blunt Force",
      "Unholy Murder",
      "Dark Rooms",
      "Taste of Blood"
    ),
  },
  {
    name: "Kim Stone",
    author: "Angela Marsons",
    volumes: volumes("Silent Scream", "Evil Games", "Lost Girls", "Play Dead", "Blood Lines", "Dead Souls", "Broken Bones", "Dying Truth"),
  },
  {
    name: "Helen Grace",
    author: "M.J. Arlidge",
    volumes: volumes("Eeny Meeny", "Pop Goes the Weasel", "The Doll's House", "Liar Liar", "Little Boy Blue", "Hide and Seek"),
  },
  {
    name: "Bill Hodges y Holly Gibney",
    author: "Stephen King",
    volumes: volumes("Mr. Mercedes", "Finders Keepers", "End of Watch", "The Outsider", "Holly", "Never Flinch"),
  },
  {
    name: "Kill the Father",
    author: "Sandrone Dazieri",
    volumes: volumes(["Kill the Father", "Mata al padre"], ["Kill the Angel", "Mata al ángel"], ["Kill the King", "Mata al rey"]),
  },
  {
    name: "Ragdoll",
    author: "Daniel Cole",
    volumes: volumes("Ragdoll", "Hangman", "Endgame"),
  },
  {
    name: "Darktown",
    author: "Thomas Mullen",
    volumes: volumes("Darktown", "Lightning Men", "Midnight Atlanta"),
  },
  {
    name: "Bellman Noir",
    author: "Niklas Natt och Dag",
    volumes: volumes("1793", "1794", "1795"),
  },
  {
    name: "Aaron Falk",
    author: "Jane Harper",
    volumes: volumes("The Dry", "Force of Nature", "Exiles"),
  },
  {
    name: "Robert Langdon",
    author: "Dan Brown",
    volumes: volumes(
      ["Ángeles y demonios", "Angels & Demons"],
      ["El código Da Vinci", "The Da Vinci Code"],
      ["El símbolo perdido", "The Lost Symbol"],
      "Inferno",
      ["Origen", "Origin"],
      ["El último secreto", "The Secret of Secrets"]
    ),
  },
  {
    name: "El psicoanalista",
    author: "John Katzenbach",
    volumes: volumes("El psicoanalista", "Jaque al psicoanalista"),
  },
  {
    name: "La Primera Ley",
    author: "Joe Abercrombie",
    volumes: volumes(
      ["La voz de las espadas", "The Blade Itself"],
      ["Antes de que los cuelguen", "Before They Are Hanged"],
      ["El último argumento de los reyes", "Last Argument of Kings"]
    ),
  },
  {
    name: "Trajano",
    author: "Santiago Posteguillo",
    volumes: volumes("Los asesinos del emperador", "Circo Máximo", "La legión perdida"),
  },
  {
    name: "Lady Astronaut",
    author: "Mary Robinette Kowal",
    volumes: volumes(["Hacia las estrellas", "The Calculating Stars"], "The Fated Sky", "The Relentless Moon", "The Martian Contingency"),
  },
  {
    name: "Los adivinos",
    author: "Libba Bray",
    volumes: volumes(["Los adivinos", "The Diviners"], "Lair of Dreams", "Before the Devil Breaks You", "The King of Crows"),
  },
  {
    name: "Los juegos del hambre",
    author: "Suzanne Collins",
    volumes: volumes(
      ["Los juegos del hambre", "The Hunger Games"],
      ["En llamas", "Catching Fire"],
      ["Sinsajo", "Mockingjay"],
      ["Balada de pájaros cantores y serpientes", "The Ballad of Songbirds and Snakes"],
      ["Amanecer en la cosecha", "Sunrise on the Reaping"]
    ),
  },
  {
    name: "Ready Player One",
    author: "Ernest Cline",
    volumes: volumes("Ready Player One", "Ready Player Two"),
  },
  {
    name: "Shopaholic",
    author: "Sophie Kinsella",
    volumes: volumes(
      "Confessions of a Shopaholic",
      "Shopaholic Takes Manhattan",
      "Shopaholic Ties the Knot",
      "Shopaholic & Sister",
      "Shopaholic & Baby",
      "Mini Shopaholic",
      "Shopaholic to the Stars",
      "Shopaholic to the Rescue",
      "Christmas Shopaholic"
    ),
  },
  {
    name: "Firekeeper's Daughter",
    author: "Angeline Boulley",
    volumes: volumes("Firekeeper's Daughter", "Warrior Girl Unearthed", "Sisters in the Wind"),
  },
  {
    name: "Ana de las Tejas Verdes",
    author: "L. M. Montgomery",
    volumes: volumes(
      ["Ana de las Tejas Verdes", "Anne of Green Gables"],
      ["Ana de Avonlea", "Anne of Avonlea"],
      ["Ana de la Isla", "Anne of the Island"],
      ["Ana de los Álamos Ventosos", "Anne of Windy Poplars"],
      ["La casa de los sueños de Ana", "Anne's House of Dreams"],
      ["Ana de Ingleside", "Anne of Ingleside"],
      ["El valle del arcoíris", "Rainbow Valley"],
      ["Rilla de Ingleside", "Rilla of Ingleside"]
    ),
  },
  {
    name: "Els Faura",
    author: "Mar Picó Seijo",
    volumes: volumes("Entre el seny i el desig", "Entre el foc i les brases", "Entre el secret i la culpa"),
  },
  {
    name: "Forrest Gump",
    author: "Winston Groom",
    volumes: volumes("Forrest Gump", "Gump & Co."),
  },
  {
    name: "La malnacida",
    author: "Beatrice Salvioni",
    volumes: volumes("La malnacida", "La Malacarne"),
  },
]
