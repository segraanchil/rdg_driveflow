import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../api/client'

const ROLE_FALLBACK = {
  admin: '/admin/inventory',
  ceo: '/ceo/dashboard',
  buyer: '/',
  seller: '/',
}

/** Step 2 of login for every role — a 6-digit code emailed at step 1. */
export default function Mfa() {
  const { verifyMfa, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [resent, setResent] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      await verifyMfa(code)
      const fallback = ROLE_FALLBACK[user?.role] ?? '/'
      // Admin/CEO always land on their own dashboard — they have no
      // legitimate "return to where I was on the public site" case, so a
      // stale `from` (e.g. left over from an earlier redirect) must never
      // override it. Buyer/seller keep the return-to-origin behavior,
      // since that's what sends them back to e.g. the reservation flow
      // that originally bounced them to /login.
      const isStaffRole = user?.role === 'admin' || user?.role === 'ceo'
      navigate(isStaffRole ? fallback : location.state?.from?.pathname ?? fallback)
    } catch (err) {
      setError(err.response?.data?.message ?? `Verification failed (${err.message}).`)
    }
  }

  async function resend() {
    setError(null)
    setResent(false)
    await apiClient.post('/auth/mfa/resend')
    setResent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={submit} className="w-80 space-y-4 rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-bold text-brand">Check your email</h1>
        <p className="text-sm text-slate-500">
          We sent a 6-digit code to {user?.email ?? 'your email'}. It expires in 5 minutes.
        </p>
        <input
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-center text-lg tracking-widest"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {resent && <p className="text-sm text-green-600">New code sent.</p>}
        <button type="submit" className="w-full rounded bg-brand py-2 text-white">
          Verify
        </button>
        <button type="button" onClick={resend} className="w-full text-sm text-brand underline">
          Resend code
        </button>
      </form>
    </div>
  )
}
