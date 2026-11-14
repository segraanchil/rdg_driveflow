import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Car, CarFront, Mail, UserRound, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/layout/AuthShell'
import AuthTransition from '../../components/ui/AuthTransition'
import PasswordInput from '../../components/ui/PasswordInput'
import PasswordRules, { passwordOk } from '../../components/ui/PasswordRules'
import { RequiredNote } from '../../components/ui/kit'

const ROLES = [
  { key: 'buyer', title: 'I’m buying', text: 'Reserve, finance and track cars', icon: Car },
  { key: 'seller', title: 'I’m selling', text: 'Get an offer for my car', icon: CarFront },
]

/** Buyer/seller signup only; Admin/CEO accounts are provisioned by the CEO. */
export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '', role: params.get('role') === 'seller' ? 'seller' : 'buyer' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!passwordOk(form.password)) return setError('Your password needs at least 8 characters with an uppercase letter, a lowercase letter and a number.')
    if (form.password !== form.password_confirmation) return setError('The two passwords don’t match.')
    setBusy(true)
    try {
      await register({ ...form, email: form.email.trim() })
      navigate(params.get('next') ?? (form.role === 'seller' ? '/sell-your-car' : '/'))
    } catch (err) {
      setBusy(false)
      const data = err.response?.data
      setError(data?.errors ? Object.values(data.errors)[0][0] : data?.message ?? 'We couldn’t reach the server. Check your connection and try again.')
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase italic tracking-wide text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Free, and takes less than a minute.</p>
        </div>

        <span className="rdg-label is-required -mb-2">I am</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="I am">
          {ROLES.map(({ key, title, text, icon: Icon }) => {
            const on = form.role === key
            return (
              <button type="button" role="radio" aria-checked={on} key={key} onClick={() => setForm((f) => ({ ...f, role: key }))}
                className={`relative rounded-xl border p-3 text-left ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 hover:border-slate-500'}`}>
                {on && <Check size={15} className="absolute right-2 top-2" />}
                <Icon size={18} />
                <span className="mt-1 block text-sm font-bold">{title}</span>
                <span className={`block text-[11px] ${on ? 'text-slate-300' : 'text-slate-500'}`}>{text}</span>
              </button>
            )
          })}
        </div>

        <label className="block">
          <span className="rdg-label">Full name</span>
          <span className="relative block">
            <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input required autoComplete="name" value={form.name} onChange={set('name')} className="w-full pl-9" placeholder="Juan Dela Cruz" />
          </span>
        </label>
        <label className="block">
          <span className="rdg-label">Email</span>
          <span className="relative block">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} className="w-full pl-9" placeholder="you@example.com" />
          </span>
        </label>
        <div>
          <label className="block">
            <span className="rdg-label">Password</span>
            <PasswordInput required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="Create a password" />
          </label>
          <PasswordRules password={form.password} confirm={form.password_confirmation} />
        </div>
        <label className="block">
          <span className="rdg-label">Confirm password</span>
          <PasswordInput required autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} placeholder="Type it again" />
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="rdg-btn w-full py-3">Create account</button>
        <RequiredNote className="text-center" />
        <p className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="font-semibold text-slate-900 hover:underline">Log in</Link>
        </p>
      </form>
      <AuthTransition open={busy} title="Creating your account" subtitle="Setting up your garage…" />
    </AuthShell>
  )
}
