import { useState } from "react"
import { shelfPhotoToBase64 } from "@/lib/image"
import { buildCandidates, type PhotoCandidate } from "@/lib/photoImport"
import { requestShelfReading } from "@/lib/shelfApi"
import { SHELF_IMAGE_MAX_SIDE, type SpineReading } from "@/lib/shelfReading"
import type { Book } from "@/lib/types"

export interface ReadingProgress {
  done: number
  total: number
}

export const useShelfPhotoReading = () => {
  const [progress, setProgress] = useState<ReadingProgress | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [candidates, setCandidates] = useState<PhotoCandidate[] | null>(null)

  const readPhotos = async (photos: File[], library: Book[]) => {
    const readings: SpineReading[][] = []
    const failures: string[] = []
    setErrors([])
    setCandidates(null)
    setProgress({ done: 0, total: photos.length })
    try {
      for (const [index, photo] of photos.entries()) {
        try {
          readings.push(await requestShelfReading(await shelfPhotoToBase64(photo, SHELF_IMAGE_MAX_SIDE)))
        } catch (error) {
          failures.push(`Foto ${index + 1}: ${error instanceof Error ? error.message : "no se ha podido leer"}`)
        }
        setProgress({ done: index + 1, total: photos.length })
      }
      setCandidates(buildCandidates(readings, library))
      setErrors(failures)
    } finally {
      setProgress(null)
    }
  }

  const updateCandidate = (key: string, patch: Partial<PhotoCandidate>) => {
    setCandidates((current) => current?.map((c) => (c.key === key ? { ...c, ...patch } : c)) ?? null)
  }

  const reset = () => {
    setCandidates(null)
    setErrors([])
  }

  return { progress, errors, candidates, readPhotos, updateCandidate, reset }
}
