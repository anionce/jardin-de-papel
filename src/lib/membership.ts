import { doc, getDoc } from "firebase/firestore"
import { auth, firestore } from "@/lib/firebase"

export const MEMBERS_COLLECTION = "allowedUsers"
export const ACTIVE_LIBRARY_KEY = "active-library"

export interface Membership {
  library: string
  person?: string
  admin?: boolean
}

let current: Membership | null = null

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined)

export const membershipFrom = (email: string, data: unknown): Membership => {
  const fields = (data ?? {}) as { library?: unknown; person?: unknown; admin?: unknown }
  const person = text(fields.person)
  return {
    library: text(fields.library)?.toLowerCase() ?? email,
    ...(person ? { person } : {}),
    ...(fields.admin === true ? { admin: true } : {}),
  }
}

const chosenLibrary = () => {
  try {
    return localStorage.getItem(ACTIVE_LIBRARY_KEY)
  } catch {
    return null
  }
}

export const libraryFor = (membership: Membership | null, email: string, chosen: string | null) => {
  const own = membership?.library ?? email
  return membership?.admin && chosen ? chosen : own
}

export const loadMembership = async (): Promise<Membership | null> => {
  const email = auth?.currentUser?.email
  if (!firestore || !email) {
    current = null
    return null
  }
  try {
    const snapshot = await getDoc(doc(firestore, MEMBERS_COLLECTION, email))
    current = membershipFrom(email, snapshot.data())
  } catch {
    current = { library: email }
  }
  return current
}

export const currentLibrary = (): string => {
  const email = auth?.currentUser?.email
  if (!email) throw new Error("Hay que entrar con Google")
  return libraryFor(current, email, chosenLibrary())
}

export const ownLibrary = () => current?.library ?? auth?.currentUser?.email ?? null

export const isAdmin = () => current?.admin === true

export const currentMemberPerson = () => {
  const email = auth?.currentUser?.email
  if (!current || !email) return undefined
  return libraryFor(current, email, chosenLibrary()) === current.library ? current.person : undefined
}

export const switchLibrary = (library: string) => {
  try {
    if (library === ownLibrary()) localStorage.removeItem(ACTIVE_LIBRARY_KEY)
    else localStorage.setItem(ACTIVE_LIBRARY_KEY, library)
  } catch {
    return
  }
  window.location.reload()
}
