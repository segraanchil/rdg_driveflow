import axios from 'axios'

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
