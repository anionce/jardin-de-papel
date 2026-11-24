import { useEffect, useState } from "react"
import { fetchAuthorWorkDocs, fetchOwnedWorkKeys, mainAuthor, type OpenLibraryWorkDoc } from "@/lib/authorWorks"
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
