import { postAuthorized } from "@/lib/authorizedPost"
import { shelfReadingSchema, type SpineReading } from "@/lib/shelfReading"
import { workMatchingSchema, type WorkMatch, type WorkMatchRequest } from "@/lib/workMatching"

export const READ_SHELF_ENDPOINT = "/api/read-shelf"
export const MATCH_WORKS_ENDPOINT = "/api/match-works"

export const requestShelfReading = async (
  image: { data: string; mediaType: string },
  fetchFn: typeof fetch = fetch
): Promise<SpineReading[]> => {
  const { books } = await postAuthorized(
    READ_SHELF_ENDPOINT,
    { image: image.data, mediaType: image.mediaType },
    shelfReadingSchema,
    "No se ha podido leer la foto. Prueba otra vez.",
    fetchFn
  )
  return books
}

export const requestWorkMatching = async (request: WorkMatchRequest, fetchFn: typeof fetch = fetch): Promise<WorkMatch[]> => {
  const { works } = await postAuthorized(
    MATCH_WORKS_ENDPOINT,
    request,
    workMatchingSchema,
    "No se ha podido comprobar qué libros tienes ya.",
    fetchFn
  )
  return works
}
