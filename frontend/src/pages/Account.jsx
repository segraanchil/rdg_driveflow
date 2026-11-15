import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserRound, Mail, KeyRound, Trash2, BadgeCheck, AlertTriangle, Info } from 'lucide-react'
import apiClient from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Field, PageHeader, RequiredNote } from '../components/ui/kit'
import { Modal } from '../components/ui/Modal'
import PasswordInput from '../components/ui/PasswordInput'
import PasswordRules, { passwordOk } from '../components/ui/PasswordRules'
import { apiError, initials } from '../lib/format'
import { toast } from '../lib/toast'

const ROLE_LABEL = { buyer: 'Buyer account', seller: 'Seller account', admin: 'Administrative staff', ceo: 'CEO / Management' }

/**
 * My account. Buyers and sellers: profile, email, password, delete account.
 * Admin and CEO: change password only (their accounts are managed in Manage Admins).
 */
export default function Account() {
  const { user } = useAuth()
  const customer = ['buyer', 'seller'].includes(user.role)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My Account" subtitle={customer ? 'Your details, sign-in email and password.' : 'Change the password you use to sign in.'} />

      <div className="rdg-card mb-5 flex items-center gap-4 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">{initials(user.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold text-slate-900">{user.name}</p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
        </div>
        <div className="hidden flex-col items-end gap-1 sm:flex">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{ROLE_LABEL[user.role]}</span>
          {user.email_verified_at
            ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700"><BadgeCheck size={14} /> Email confirmed</span>
            : customer && <span className="text-xs font-semibold text-amber-700">Email not confirmed yet</span>}
        </div>
      </div>

      <div className="space-y-5">
        {customer && <ProfileCard />}
        {customer && <EmailCard />}
        <PasswordCard />
        {customer ? <DeleteCard /> : (
          <p className="flex gap-2 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
            <Info size={16} className="mt-0.5 shrink-0" />
            {user.role === 'ceo' ? 'Admin accounts are added, changed and deactivated under Manage Admins.' : 'Your name and email are managed by the CEO. Ask them if anything needs changing.'}
          </p>
        )}
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, text, children, tone = 'default' }) {
  return (
    <section className={`rdg-card p-6 ${tone === 'danger' ? 'border-red-200' : ''}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}`}><Icon size={18} /></span>
        <div>
          <h2 className="text-base font-extrabold">{title}</h2>
          {text && <p className="text-sm text-slate-500">{text}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function useSave() {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function run(fn) {
    setError(null)
    setBusy(true)
    try { return await fn() } catch (err) { setError(apiError(err)); return null } finally { setBusy(false) }
  }
  return { error, setError, busy, run }
}

function ProfileCard() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ name: user.name ?? '', phone: user.phone ?? '' })
  const { error, busy, run } = useSave()
  const changed = form.name !== (user.name ?? '') || form.phone !== (user.phone ?? '')

  async function save(e) {
    e.preventDefault()
    const res = await run(() => apiClient.put('/account/profile', form, { loadingText: 'Saving…', quietErrors: true }))
    if (res) { setUser(res.data.user); toast.success('Profile saved') }
  }

  return (
    <Section icon={UserRound} title="Profile" text="Shown to our staff on your reservations, test drives and offers.">
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input required maxLength={255} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" /></Field>
          <Field label="Mobile number" hint="So staff can call or text you about your car."><input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0917 123 4567" className="w-full" /></Field>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <RequiredNote />
          <button disabled={busy || !changed} className="rdg-btn">Save profile</button>
        </div>
      </form>
    </Section>
  )
}

function EmailCard() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ email: '', current_password: '' })
  const { error, busy, run } = useSave()

  async function save(e) {
    e.preventDefault()
    const res = await run(() => apiClient.put('/account/email', form, { loadingText: 'Changing your email…', quietErrors: true }))
    if (res) { setUser(res.data.user); setForm({ email: '', current_password: '' }); toast.success(res.data.message) }
  }

  return (
    <Section icon={Mail} title="Sign-in email" text={<>Currently <strong className="text-slate-800">{user.email}</strong>. Your login codes and updates are sent here.</>}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New email"><input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="w-full" /></Field>
          <Field label="Current password" hint="To confirm it’s you."><PasswordInput required autoComplete="current-password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} /></Field>
        </div>
        <p className="text-xs text-slate-500">We’ll send a confirmation link to the new address and a notice to the old one.</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end"><button disabled={busy} className="rdg-btn">Change email</button></div>
      </form>
    </Section>
  )
}

function PasswordCard() {
  const blank = { current_password: '', password: '', password_confirmation: '' }
  const [form, setForm] = useState(blank)
  const { error, setError, busy, run } = useSave()

  async function save(e) {
    e.preventDefault()
    if (!passwordOk(form.password)) return setError('Your new password needs at least 8 characters with an uppercase letter, a lowercase letter and a number.')
    if (form.password !== form.password_confirmation) return setError('The two new passwords don’t match.')
    const res = await run(() => apiClient.put('/account/password', form, { loadingText: 'Changing your password…', quietErrors: true }))
    if (res) { setForm(blank); toast.success('Password changed') }
  }

  return (
    <Section icon={KeyRound} title="Change password" text="Use a password you don’t use on other websites.">
      <form onSubmit={save} className="space-y-4">
        {/* Same 2-column grid for all three, so every field has the same width and edges line up. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password"><PasswordInput required autoComplete="current-password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} /></Field>
          <div className="hidden sm:block" aria-hidden />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password"><PasswordInput required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Confirm new password"><PasswordInput required autoComplete="new-password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} /></Field>
        </div>
        <PasswordRules password={form.password} confirm={form.password_confirmation} />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end"><button disabled={busy} className="rdg-btn">Change password</button></div>
      </form>
    </Section>
  )
}

function DeleteCard() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ current_password: '', confirm: '' })
  const { error, setError, busy, run } = useSave()

  async function remove(e) {
    e.preventDefault()
    const res = await run(() => apiClient.delete('/account', { data: form, loadingText: 'Deleting your account…', quietErrors: true }))
    if (res) {
      setUser(null)
      toast.success('Your account was deleted')
      navigate('/', { replace: true })
    }
  }

  return (
    <Section icon={Trash2} title="Delete account" tone="danger" text="Removes your name, email and saved cars, and signs you out. This can’t be undone.">
      <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>Records of cars you already bought (invoices, warranty) are kept for the dealership’s books, without your name.</li>
        <li>If you have an active reservation, finish or cancel it with our staff first.</li>
      </ul>
      <button type="button" onClick={() => { setOpen(true); setError(null); setForm({ current_password: '', confirm: '' }) }} className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
        <Trash2 size={15} /> Delete my account
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete your account?" size="sm">
        <form onSubmit={remove} className="space-y-4">
          <p className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> You’ll be signed out and won’t be able to log in with this account again.</p>
          <Field label="Current password"><PasswordInput required autoComplete="current-password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} /></Field>
          <Field label="Type DELETE to confirm"><input required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="off" placeholder="DELETE" className="w-full font-semibold tracking-widest" /></Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rdg-btn-ghost">Keep my account</button>
            <button disabled={busy || form.confirm !== 'DELETE'} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"><Trash2 size={15} /> Delete forever</button>
          </div>
        </form>
      </Modal>
    </Section>
  )
}
