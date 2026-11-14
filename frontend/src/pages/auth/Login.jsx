import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/layout/AuthShell'
import AuthTransition from '../../components/ui/AuthTransition'
import PasswordInput from '../../components/ui/PasswordInput'

/** Step 1 (password) login, shared by all four roles; the emailed code step lives at /mfa. */
export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate('/mfa', { state: { from: location.state?.from } })
    } catch (err) {
      setBusy(false)
      const apiMessage = err.response?.data?.errors?.email?.[0] ?? err.response?.data?.message
      setError(apiMessage ?? 'We couldn’t reach the server. Check your connection and try again.')
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="space-y-4" noValidate={false}>
        <div>
          <h1 className="font-display text-3xl font-bold uppercase italic tracking-wide text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Log in to reserve cars, track financing and see your garage.</p>
        </div>
        <label className="block">
          <span className="rdg-label">Email</span>
          <span className="relative block">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-9" placeholder="you@example.com" />
          </span>
        </label>
        <div>
          <label className="block">
            <span className="rdg-label">Password</span>
            <PasswordInput autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <div className="mt-1.5 text-right">
            <Link to="/forgot-password" state={{ email }} className="text-sm font-semibold text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline">Forgot password?</Link>
          </div>
        </div>
        {location.state?.notice && !error && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{location.state.notice}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="rdg-btn w-full py-3">Continue <ArrowRight size={17} /></button>
        <p className="text-center text-xs text-slate-500">We’ll email you a 6-digit code to finish signing in.</p>
        <p className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          New to RDG? <Link to="/register" className="font-semibold text-slate-900 underline-offset-2 hover:underline">Create a free account</Link>
        </p>
      </form>
      <AuthTransition open={busy} title="Signing you in" subtitle="Checking your details and sending your code…" />
    </AuthShell>
  )
}
