import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// Used ONLY for the AI chatbot message stream and live dashboard
// notifications — never for core business data. No Firebase project has
// been created yet; ask before creating one. Until VITE_FIREBASE_* env
// vars are set, `database` is null and ChatWidget falls back to a
// "chat temporarily unavailable" state instead of crashing.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isConfigured = Boolean(firebaseConfig.projectId && firebaseConfig.databaseURL)

export const firebaseApp = isConfigured ? initializeApp(firebaseConfig) : null
export const database = firebaseApp ? getDatabase(firebaseApp) : null
