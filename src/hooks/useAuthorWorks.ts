import { useEffect, useMemo, useState } from "react"
import {
  applyWorkMatches,
  fetchAuthorWorkDocs,
  fetchOwnedWorkKeys,
  mainAuthor,
  workMatchRequest,
  type AuthorWork,
  type OpenLibraryWorkDoc,
} from "@/lib/authorWorks"
import { requestWorkMatching } from "@/lib/shelfApi"
import { workMatchingSchema, type WorkMatch } from "@/lib/workMatching"
import type { Book } from "@/lib/types"

interface AuthorWorksState {
  author: string
  docs: OpenLibraryWorkDoc[]
  ownedWorkKeys: string[]
  failed: boolean
}

export const useAuthorWorkDocs = (author: string, owned: Book[]) => {
  const [state, setState] = useState<AuthorWorksState | null>(null)
  const [ownedSnapshot, setOwnedSnapshot] = useState({ author, owned })
  if (ownedSnapshot.author !== author || ownedSnapshot.owned.length !== owned.length) setOwnedSnapshot({ author, owned })

  useEffect(() => {
    const controller = new AbortController()
    const { owned: books } = ownedSnapshot
    Promise.all([
      fetchAuthorWorkDocs(author, controller.signal),
      fetchOwnedWorkKeys(books, mainAuthor(author), controller.signal),
    ])
      .then(([docs, ownedWorkKeys]) => setState({ author, docs, ownedWorkKeys, failed: false }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ author, docs: [], ownedWorkKeys: [], failed: true })
      })
    return () => controller.abort()
  }, [author, ownedSnapshot])

  const current = state?.author === author ? state : null
  return {
    loading: current === null,
    failed: current?.failed ?? false,
    docs: current?.docs ?? [],
    ownedWorkKeys: current?.ownedWorkKeys ?? [],
  }
}

const MATCH_CACHE_PREFIX = "work-matches:v2:"

const readCachedMatches = (key: string): WorkMatch[] | null => {
  try {
    const raw = localStorage.getItem(MATCH_CACHE_PREFIX + key)
    if (!raw) return null
    const parsed = workMatchingSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.works : null
  } catch {
    return null
  }
}

const cacheMatches = (key: string, works: WorkMatch[]) => {
  try {
    localStorage.setItem(MATCH_CACHE_PREFIX + key, JSON.stringify({ works }))
  } catch {
    return
  }
}

interface MatchState {
  key: string
  matches: WorkMatch[] | null
}

export const useWorkMatching = (author: string, owned: Book[], works: AuthorWork[]) => {
  const request = useMemo(() => workMatchRequest(author, owned, works), [author, owned, works])
  const requestKey = useMemo(() => JSON.stringify(request), [request])
  const cached = useMemo(() => readCachedMatches(requestKey), [requestKey])
  const [state, setState] = useState<MatchState | null>(null)

  useEffect(() => {
    if (cached || request.candidates.length === 0) return
    let cancelled = false
    requestWorkMatching(request)
      .then((matches) => {
        cacheMatches(requestKey, matches)
        if (!cancelled) setState({ key: requestKey, matches })
      })
      .catch(() => {
        if (!cancelled) setState({ key: requestKey, matches: null })
      })
    return () => {
      cancelled = true
    }
  }, [cached, request, requestKey])

  const done = state?.key === requestKey ? state : null
  const matches = cached ?? done?.matches ?? null
  return {
    checking: works.length > 0 && !cached && !done,
    works: matches ? applyWorkMatches(works, matches, owned, mainAuthor(author)) : works,
  }
}
