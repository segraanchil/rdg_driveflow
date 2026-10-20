import axios from 'axios'
import { trackRequest } from '../lib/loading'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const API_ROOT = API_URL.replace(/\/api\/?$/, '')

// Laravel Sanctum SPA auth: cookie-based sessions, so every request must
// carry credentials, and a CSRF cookie must be fetched once before the
// first state-changing request.
//
// withXSRFToken is required (not just withCredentials) because the frontend
// (localhost:5173) and API (localhost:8000) are different origins — axios
// only auto-attaches the X-XSRF-TOKEN header from the cookie for same-origin
// requests unless this is explicitly set, and every POST/PATCH/DELETE here
// would otherwise 419 with a CSRF token mismatch.
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

export async function ensureCsrfCookie() {
  await axios.get(`${API_ROOT}/sanctum/csrf-cookie`, { withCredentials: true })
}

// For building links to backend-served files (storage, downloads) — a bare
// "/storage/..." href would resolve against the frontend's own origin
// (:5173), not the API (:8000), since the two run on different ports.
export function backendUrl(path) {
  return `${API_ROOT}/${path.replace(/^\//, '')}`
}

export default apiClient

// ── Loading indicators ────────────────────────────────────────────────────
// Every request reports to the global loader: reads show the top progress bar,
// writes (POST/PUT/PATCH/DELETE) also show the "Saving…" card. Pass
// { loadingText: '…' } to set the message, or { silent: true } for background polling.
const WRITE_MESSAGES = [
  [/\/auth\/login/, 'Signing in…'],
  [/\/auth\/register/, 'Creating your account…'],
  [/\/auth\/mfa\/verify/, 'Checking your code…'],
  [/\/auth\/mfa\/resend/, 'Sending a new code…'],
  [/\/auth\/logout/, 'Signing out…'],
  [/\/verify\b/, 'Verifying…'],
  [/\/(approve|confirm)\b/, 'Approving…'],
  [/\/(reject|decline)\b/, 'Rejecting…'],
  [/(generate|invoice|legal-documents|deed|receipt)/, 'Generating document…'],
  [/\/chat\//, 'Sending…'],
]

function loadingMessage(config) {
  if (config.loadingText) return config.loadingText
  const method = (config.method || 'get').toLowerCase()
  if (method === 'delete') return 'Deleting…'
  const url = config.url || ''
  const hit = WRITE_MESSAGES.find(([pattern]) => pattern.test(url))
  if (hit) return hit[1]
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) return 'Uploading…'
  return 'Saving…'
}

apiClient.interceptors.request.use((config) => {
  if (!config.silent) {
    const method = (config.method || 'get').toLowerCase()
    const kind = ['post', 'put', 'patch', 'delete'].includes(method) ? 'write' : 'read'
    config.__done = trackRequest(kind, kind === 'write' ? loadingMessage(config) : '')
  }
  return config
})
apiClient.interceptors.response.use(
  (response) => { response.config.__done?.(); return response },
  (error) => { error.config?.__done?.(); return Promise.reject(error) },
)
