/** Minúsculas y sin tildes: "García Márquez" encuentra "garcia marquez". */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}

/** Hash estable para repartir colores/estilos de forma determinista. */
export function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return Math.abs(hash)
}

/** Goodreads añade la saga al título: "Dune (Dune, #1)" → "Dune". */
export function cleanTitle(title: string): string {
  return title.replace(/\s*\([^)]*#[^)]*\)\s*$/, "").trim()
}

const LEADING_ARTICLES = /^(el|la|los|las|un|una|the|a|an|le|les|il|lo)\s+/

/** Título comparable: "La sombra del viento: novela (Cementerio, #1)" → "sombra del viento". */
export function titleKey(title: string | undefined): string {
  if (!title) return ""
  return normalize(cleanTitle(title).replace(/\s*\([^)]*\)\s*$/, "").split(":")[0])
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(LEADING_ARTICLES, "")
}

/** "J.D. Salinger" y "J. D. Salinger" → "jdsalinger". */
export function authorKey(author: string | undefined): string {
  return normalize(author ?? "").replace(/[^a-z]/g, "")
}
