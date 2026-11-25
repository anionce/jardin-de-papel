import { useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { loadMembership } from "@/lib/membership"
import { useSettingsStore } from "@/store/useSettingsStore"

export const useMembership = (user: User | null) => {
  const setMemberPerson = useSettingsStore((s) => s.setMemberPerson)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    loadMembership().then((membership) => {
      if (cancelled) return
      setMemberPerson(membership?.person)
      setLoadedFor(uid)
    })
    return () => {
      cancelled = true
    }
  }, [uid, setMemberPerson])

  return uid !== null && loadedFor === uid
}
