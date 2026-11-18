import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore"

// La config web de Firebase no es secreta: el acceso lo controlan las reglas
// de Firestore (firestore.rules) + Auth, no ocultar esto.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Sin .env la app sigue funcionando en "modo local" (localStorage), útil
 * para desarrollar antes de tener el proyecto Firebase creado. */
export const isFirebaseConfigured = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey)

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null

export const auth: Auth | null = app ? getAuth(app) : null
export const googleProvider = new GoogleAuthProvider()

// ignoreUndefinedProperties: casi todos los campos de Book son opcionales y
// Firestore rechaza `undefined` explícitos por defecto.
export const firestore: Firestore | null = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    })
  : null
