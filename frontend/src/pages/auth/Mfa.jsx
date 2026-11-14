import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../api/client'
import AuthShell from '../../components/layout/AuthShell'
import AuthTransition from '../../components/ui/AuthTransition'

const ROLE_FALLBACK = { admin: '/admin/overview', ceo: '/ceo/dashboard', buyer: '/', seller: '/' }
const RESEND_WAIT = 30

/** Step 2 of login for every role: the 6-digit code emailed at step 1. */
export default function Mfa() {
  const { verifyMfa, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState(null)
  const [phase, setPhase] = useState(null) // null | 'checking' | 'welcome'
  const [wait, setWait] = useState(RESEND_WAIT)
  const [resent, setResent] = useState(false)
  const boxes = useRef([])

  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])

  async function verify(code) {
    setError(null)
    setPhase('checking')
    try {
      await verifyMfa(code)
      setPhase('welcome')
      const fallback = ROLE_FALLBACK[user?.role] ?? '/'
      // Staff always land on their dashboard; buyers/sellers go back to where login interrupted them.
      const isStaff = user?.role === 'admin' || user?.role === 'ceo'
      setTimeout(() => navigate(isStaff ? fallback : location.state?.from?.pathname ?? fallback), 900)
    } catch (err) {
      setPhase(null)
      setDigits(['', '', '', '', '', ''])
      boxes.current[0]?.focus()
      setError(err.response?.data?.message ?? 'That code didn’t work. Check the latest email and try again.')
    }
  }

  function setDigit(i, value) {
    const clean = value.replace(/\D/g, '')
    if (clean.length > 1) return paste(clean, i)
    const next = [...digits]
    next[i] = clean
    setDigits(next)
    if (clean && i < 5) boxes.current[i + 1]?.focus()
    if (next.every(Boolean)) verify(next.join(''))
  }

  function paste(text, start = 0) {
    const chars = text.replace(/\D/g, '').slice(0, 6 - start).split('')
    const next = [...digits]
    chars.forEach((c, k) => { next[start + k] = c })
    setDigits(next)
    boxes.current[Math.min(5, start + chars.length)]?.focus()
    if (next.every(Boolean)) verify(next.join(''))
  }

  function onKey(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) boxes.current[i + 1]?.focus()
  }

  async function resend() {
    setError(null)
    setResent(false)
    await apiClient.post('/auth/mfa/resend', {}, { loadingText: 'Sending a new code…' })
    setResent(true)
    setWait(RESEND_WAIT)
    setDigits(['', '', '', '', '', ''])
    boxes.current[0]?.focus()
  }

  return (
    <AuthShell>
      <form onSubmit={(e) => { e.preventDefault(); if (digits.every(Boolean)) verify(digits.join('')) }} className="space-y-5">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-900"><MailCheck size={22} /></span>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase italic tracking-wide text-slate-900">Check your email</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the 6-digit code we sent to <strong className="text-slate-800">{user?.email ?? 'your email'}</strong>. It expires in 5 minutes.</p>
        </div>

        <div className="flex justify-center gap-2" onPaste={(e) => { e.preventDefault(); paste(e.clipboardData.getData('text')) }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { boxes.current[i] = el }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKey(i, e)}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              autoFocus={i === 0}
              aria-label={`Digit ${i + 1}`}
              maxLength={6}
              className="h-14 w-11 px-0 text-center text-2xl font-bold sm:w-12"
            />
          ))}
        </div>

        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{error}</p>}
        {resent && !error && <p className="rounded-lg bg-green-50 px-3 py-2 text-center text-sm text-green-700">A new code is on its way.</p>}

        <button type="submit" disabled={!digits.every(Boolean)} className="rdg-btn w-full py-3">Verify and continue</button>
        <p className="text-center text-sm text-slate-500">
          Didn’t get it? Check spam, or{' '}
          {wait > 0 ? <span className="text-slate-400">resend in {wait}s</span> : <button type="button" onClick={resend} className="font-semibold text-slate-900 hover:underline">send a new code</button>}
        </p>
      </form>
      <AuthTransition open={Boolean(phase)} done={phase === 'welcome'}
        title={phase === 'welcome' ? `Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}` : 'Verifying your code'}
        subtitle={phase === 'welcome' ? 'Taking you to your dashboard…' : 'One moment…'} />
    </AuthShell>
  )
}
