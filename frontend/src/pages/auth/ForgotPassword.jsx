import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mail, ArrowLeft, MailCheck } from 'lucide-react'
import apiClient, { ensureCsrfCookie } from '../../api/client'
import AuthShell from '../../components/layout/AuthShell'
import { apiError } from '../../lib/format'

/** Step 1 of "Forgot password": ask for the email, then we send a one-hour reset link. */
export default function ForgotPassword() {
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [sent, setSent] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await ensureCsrfCookie()
      const { data } = await apiClient.post('/auth/forgot-password', { email: email.trim() }, { loadingText: 'Sending the reset link…', quietErrors: true })
      setSent(data.message)
    } catch (err) {
      setError(err.response?.status === 429 ? 'Too many requests. Wait a minute, then try again.' : apiError(err, 'We couldn’t send the link. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white"><MailCheck size={26} /></span>
          <h1 className="font-display text-3xl font-bold uppercase italic tracking-wide text-slate-900">Check your email</h1>
          <p className="text-sm text-slate-600">{sent}</p>
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">The link works for 60 minutes. Didn’t get it? Check spam, or wait a minute and send it again.</p>
          <div className="grid gap-2">
            <button onClick={() => setSent(null)} className="rdg-btn-ghost w-full">Send it again</button>
            <Link to="/login" state={{ email }} className="rdg-btn w-full">Back to log in</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase italic tracking-wide text-slate-900">Forgot your password?</h1>
            <p className="mt-1 text-sm text-slate-500">Enter the email you use for RDG. We’ll send you a link to choose a new password.</p>
          </div>
          <label className="block">
            <span className="rdg-label">Email</span>
            <span className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Mail size={16} /></span>
              <input type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-9" placeholder="you@example.com" />
            </span>
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="rdg-btn w-full py-3">Send reset link</button>
          <p className="border-t border-slate-100 pt-4 text-center text-sm">
            <Link to="/login" state={{ email }} className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 hover:underline"><ArrowLeft size={15} /> Back to log in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
