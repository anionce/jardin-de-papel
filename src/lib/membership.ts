import { doc, getDoc } from "firebase/firestore"
import { auth, firestore } from "@/lib/firebase"

export const MEMBERS_COLLECTION = "allowedUsers"

export interface Membership {
  library: string
  person?: string
}

let current: Membership | null = null

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined)

export const membershipFrom = (email: string, data: unknown): Membership => {
  const fields = (data ?? {}) as { library?: unknown; person?: unknown }
  const person = text(fields.person)
  return { library: text(fields.library)?.toLowerCase() ?? email, ...(person ? { person } : {}) }
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
  return current?.library ?? email
}

export const currentMemberPerson = () => current?.person
