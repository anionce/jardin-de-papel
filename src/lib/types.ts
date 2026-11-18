/** Todos los campos son opcionales salvo los de control (id, createdAt, read):
 * un libro puede entrar sólo con título, sólo con autor, o casi vacío. */
export interface Book {
  id: string
  title?: string
  author?: string
  publisher?: string
  /** Géneros del libro (puede tener varios). */
  genres?: string[]
  /** @deprecated Antes sólo había uno; al leer se pasa a `genres`. */
  genre?: string
  year?: number
  /** Número de páginas. */
  pages?: number
  isbn?: string
  /** URL de la portada: encontrada automáticamente (lib/covers.ts) o pegada a mano. */
  coverUrl?: string
  /** true cuando ya se buscó la portada, haya salido o no — evita repetir la búsqueda. */
  coverChecked?: boolean
  /** Obra de Open Library ("/works/OL274505W"): la misma para todas las
   * ediciones y traducciones de un libro. Sirve para detectar duplicados
   * aunque estén en idiomas distintos. */
  workKey?: string
  workChecked?: boolean
  /** Versión de la búsqueda con la que se obtuvo workKey (ver WORK_LOOKUP_VERSION). */
  workVersion?: number
  /** Ids de libros que el usuario ha dicho que NO son duplicados de este. */
  distinctFrom?: string[]
  read: boolean
  /** Id de Goodreads — evita duplicar libros al reimportar el CSV. */
  goodreadsId?: string
  addedBy?: string
  /** Correo de la cuenta dueña: cada uno ve sólo su biblioteca. */
  owner?: string
  createdAt: number
}

export type BookDraft = Omit<Book, "id" | "createdAt" | "addedBy">

export type ReadFilter = "all" | "read" | "unread"
export type SortField = "recent" | "title" | "author" | "year" | "pages"
export type SortKey = `${SortField}-${"asc" | "desc"}`
