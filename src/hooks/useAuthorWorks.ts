import { useEffect, useState } from "react"
import { fetchAuthorWorkDocs, fetchWorkTitles, type OpenLibraryWorkDoc } from "@/lib/authorWorks"

interface AuthorWorksState {
  author: string
  docs: OpenLibraryWorkDoc[]
  ownedTitles: string[]
  failed: boolean
}

export const useAuthorWorkDocs = (author: string, ownedWorkKeys: string[]) => {
  const [state, setState] = useState<AuthorWorksState | null>(null)
  const workKeys = ownedWorkKeys.join(",")

  useEffect(() => {
    const controller = new AbortController()
    const keys = workKeys ? workKeys.split(",") : []
    Promise.all([fetchAuthorWorkDocs(author, controller.signal), fetchWorkTitles(keys, controller.signal)])
      .then(([docs, ownedTitles]) => setState({ author, docs, ownedTitles, failed: false }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ author, docs: [], ownedTitles: [], failed: true })
      })
    return () => controller.abort()
  }, [author, workKeys])

  const current = state?.author === author ? state : null
  return {
    loading: current === null,
    failed: current?.failed ?? false,
    docs: current?.docs ?? [],
    ownedTitles: current?.ownedTitles ?? [],
  }
}
