import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import apiClient, { ensureCsrfCookie } from '../../api/client'
import AuthShell from '../../components/layout/AuthShell'
import PasswordInput from '../../components/ui/PasswordInput'
import PasswordRules, { passwordOk } from '../../components/ui/PasswordRules'
import { apiError } from '../../lib/format'

/** Step 2 of "Forgot password": opened from the emailed link (?token=…&email=…). */
export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!passwordOk(password)) return setError('Your password needs at least 8 characters with an uppercase letter, a lowercase letter and a number.')
    if (password !== confirm) return setError('The two passwords don’t match.')
    setBusy(true)
    try {
      await ensureCsrfCookie()
      const { data } = await apiClient.post('/auth/reset-password', { token, email, password, password_confirmation: confirm }, { loadingText: 'Saving your new password…', quietErrors: true })
      navigate('/login', { replace: true, state: { email, notice: data.message } })
    } catch (err) {
      setBusy(false)
      setError(apiError(err, 'We couldn’t change your password. Try again.'))
    }
  }

  if (!token || !email) {
    return (
      <AuthShell>
        <div className="space-y-4 text-center">
          <h1 className="font-display text-3xl font-bold uppercase italic tracking-wide text-slate-900">Link not valid</h1>
          <p className="text-sm text-slate-600">This reset link is incomplete. Open the newest link from your email, or ask for a new one.</p>
          <Link to="/forgot-password" className="rdg-btn w-full">Get a new link</Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white"><KeyRound size={22} /></span>
          <h1 className="font-display text-3xl font-bold uppercase italic tracking-wide text-slate-900">Choose a new password</h1>
          <p className="mt-1 text-sm text-slate-500">For <strong className="text-slate-800">{email}</strong></p>
        </div>
        <div>
          <label className="block">
            <span className="rdg-label">New password</span>
            <PasswordInput required autoFocus autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <PasswordRules password={password} confirm={confirm} />
        </div>
        <label className="block">
          <span className="rdg-label">Confirm new password</span>
          <PasswordInput required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error} {/expired|invalid/i.test(error) && <Link to="/forgot-password" className="font-semibold underline">Get a new link</Link>}
          </p>
        )}
        <button type="submit" disabled={busy} className="rdg-btn w-full py-3">Save new password</button>
      </form>
    </AuthShell>
  )
}
