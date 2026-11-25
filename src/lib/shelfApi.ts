import { postAuthorized } from "@/lib/authorizedPost"
import { workMatchingSchema, type WorkMatch, type WorkMatchRequest } from "@/lib/workMatching"

export const MATCH_WORKS_ENDPOINT = "/api/match-works"

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
