import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/layout/AuthShell'

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
    <AuthShell>
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Log In</h1>
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full"
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rdg-btn w-full py-3">
          Continue
        </button>
        <p className="text-center text-sm text-slate-500">
          No account? <Link to="/register" className="font-semibold text-emerald-700 hover:underline">Sign up</Link>
        </p>
      </form>
    </AuthShell>
  )
}
