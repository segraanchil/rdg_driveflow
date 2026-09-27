import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/** Step 1 (password) login — shared by all four roles; MFA step lives at /mfa. */
export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate('/mfa', { state: { from: location.state?.from } })
    } catch (err) {
      const apiMessage =
        err.response?.data?.errors?.email?.[0] ?? err.response?.data?.message
      setError(apiMessage ?? `Login failed (${err.message}). Is the backend running?`)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={submit} className="w-80 space-y-4 rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-bold text-brand">Log In</h1>
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-brand py-2 text-white">
          Continue
        </button>
        <p className="text-center text-sm text-slate-500">
          No account? <Link to="/register" className="text-brand underline">Sign up</Link>
        </p>
      </form>
    </div>
  )
}
