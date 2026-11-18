import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { findCoverCandidates, findEdition, TRUSTED_WORK_VERSION } from "@/lib/bookLookup"
import { coverSearchKey, toDraft, type FormValues } from "@/lib/bookForm"
import { imageFileToDataUrl, nextLoadableCover, preloadImage } from "@/lib/image"
import { normalize } from "@/lib/text"
import type { Book } from "@/lib/types"

interface CoverCandidates {
  key: string
  urls: string[]
}

export function useCoverSearch(
  values: FormValues,
  setValues: Dispatch<SetStateAction<FormValues>>,
  editing: Book | null
) {
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<CoverCandidates | null>(null)
  const [editionPublisher, setEditionPublisher] = useState(values.publisher)
  const failedCovers = useRef(new Set<string>())

  const setCover = (coverUrl: string) => setValues((v) => ({ ...v, coverUrl, coverRemoved: false }))

  async function loadCandidates(): Promise<string[] | null> {
    const draft = toDraft(values)
    const key = coverSearchKey(draft)
    if (candidates?.key === key) return candidates.urls

    const isSameWork =
      editing !== null &&
      (editing.workVersion ?? 0) >= TRUSTED_WORK_VERSION &&
      editing.title === draft.title &&
      editing.author === draft.author
    setSearching(true)
    try {
      const urls = await findCoverCandidates({ ...draft, workKey: isSameWork ? editing.workKey : undefined })
      setCandidates({ key, urls })
      return urls
    } catch {
      setMessage("No se ha podido buscar ahora mismo. Prueba más tarde.")
      return null
    } finally {
      setSearching(false)
    }
  }

  async function findNextCover() {
    setMessage(null)
    const urls = await loadCandidates()
    if (!urls) return

    const current = urls.indexOf(values.coverUrl)
    setSearching(true)
    setMessage("Cargando portada…")
    const found = await nextLoadableCover(urls, current, failedCovers.current)
    setSearching(false)

    if (found === -1) {
      setMessage(
        current === -1
          ? "No he encontrado portada. Sube una foto o pega la URL de una imagen."
          : "No he encontrado otra portada. Puedes subir una foto."
      )
      return
    }
    setCover(urls[found])
    setMessage(
      found <= current
        ? `No hay más: vuelvo a la primera (${found + 1} de ${urls.length}).`
        : `Portada ${found + 1} de ${urls.length}. ¿No es esta? Pulsa otra vez.`
    )
    const upcoming = urls[(found + 1) % urls.length]
    if (upcoming && !failedCovers.current.has(upcoming)) void preloadImage(upcoming)
  }

  async function uploadCover(file: File) {
    setSearching(true)
    setMessage(null)
    try {
      setCover(await imageFileToDataUrl(file))
      setMessage("Foto lista. Se guardará con el libro.")
    } catch {
      setMessage("No he podido leer esa imagen. Prueba con una foto JPG o PNG.")
    } finally {
      setSearching(false)
    }
  }

  async function findPublisherEdition() {
    const publisher = values.publisher.trim()
    if (!publisher || !values.title.trim() || normalize(publisher) === normalize(editionPublisher)) return
    setEditionPublisher(publisher)
    setSearching(true)
    setMessage(`Buscando la edición de ${publisher}…`)
    try {
      const edition = await findEdition({ title: values.title, author: values.author || undefined, publisher })
      if (!edition?.coverUrl && !edition?.isbn) {
        setMessage(`No he encontrado la edición de ${publisher}; se queda la portada que había.`)
        return
      }
      setValues((v) => ({
        ...v,
        coverUrl: edition.coverUrl ?? v.coverUrl,
        coverRemoved: edition.coverUrl ? false : v.coverRemoved,
        isbn: edition.isbn ?? v.isbn,
      }))
      const found = [edition.coverUrl && "Portada", edition.isbn && "ISBN"].filter(Boolean).join(" e ")
      setMessage(`${found} de la edición de ${publisher}.`)
    } catch {
      setMessage("No se ha podido buscar la edición ahora mismo.")
    } finally {
      setSearching(false)
    }
  }

  return {
    searching,
    message,
    hasCandidates: candidates !== null,
    findNextCover,
    uploadCover,
    findPublisherEdition,
    setEditionPublisher,
  }
}
