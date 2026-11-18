export const normalize = (value: string): string => {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}

export const hashString = (value: string): number => {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return Math.abs(hash)
}

export const cleanTitle = (title: string): string => {
  return title.replace(/\s*\([^)]*#[^)]*\)\s*$/, "").trim()
}

const LEADING_ARTICLES = /^(el|la|los|las|un|una|the|a|an|le|les|il|lo)\s+/

export const titleKey = (title: string | undefined): string => {
  if (!title) return ""
  return normalize(cleanTitle(title).replace(/\s*\([^)]*\)\s*$/, "").split(":")[0])
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(LEADING_ARTICLES, "")
}

export const authorKey = (author: string | undefined): string => {
  return normalize(author ?? "").replace(/[^a-z]/g, "")
}
