/**
 * Live updates through the Firebase Realtime Database (the chat's live channel; MySQL keeps the
 * permanent record). The server writes to Firebase; the browser only listens and, on each change,
 * reloads the latest data from our API. Firebase is loaded on demand, and when no Firebase project
 * is configured (VITE_FIREBASE_* empty) `listen` returns null and callers keep their normal
 * every-few-seconds refresh.
 */
let loader = null
function loadFirebase() {
  loader ??= Promise.all([import('../firebase/config'), import('firebase/database')])
    .then(([config, db]) => ({ database: config.database, ...db }))
    .catch(() => ({ database: null }))
  return loader
}

export const liveConfigured = Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_DATABASE_URL)

/**
 * Calls onChange whenever something is added under `path` (only the newest item is replayed on
 * start). Returns an unsubscribe function, or null when Firebase isn't configured.
 */
export function listen(path, onChange) {
  if (!liveConfigured) return null
  let off = null
  let stopped = false
  loadFirebase().then((fb) => {
    if (stopped || !fb.database) return
    const q = fb.query(fb.ref(fb.database, path), fb.limitToLast(1))
    off = fb.onChildAdded(q, () => onChange(), () => { /* permission/network error: polling still runs */ })
  })
  return () => { stopped = true; off?.() }
}
