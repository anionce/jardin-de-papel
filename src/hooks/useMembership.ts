import { useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { currentMemberPerson, loadMembership } from "@/lib/membership"
import { useSettingsStore } from "@/store/useSettingsStore"

export const useMembership = (user: User | null) => {
  const setMemberPerson = useSettingsStore((s) => s.setMemberPerson)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    loadMembership().then(() => {
      if (cancelled) return
      setMemberPerson(currentMemberPerson())
      setLoadedFor(uid)
    })
    return () => {
      cancelled = true
    }
  }, [uid, setMemberPerson])

  return uid !== null && loadedFor === uid
}
