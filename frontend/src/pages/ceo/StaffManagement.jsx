import { useEffect, useState } from 'react'
import { UserPlus, Pencil, Ban, CheckCircle2 } from 'lucide-react'
import apiClient from '../../api/client'
import { Modal } from '../../components/ui/Modal'
import { Field, RequiredNote } from '../../components/ui/kit'
import PasswordInput from '../../components/ui/PasswordInput'
import PasswordRules, { passwordOk } from '../../components/ui/PasswordRules'
import { apiError } from '../../lib/format'

/** Story 28 — CEO adds, edits, and deactivates Administrative Staff accounts. */
export default function StaffManagement() {
  const [staff, setStaff] = useState([])
  const [editing, setEditing] = useState(null) // null = not editing, {} = new, {id,...} = existing
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)

  function load() {
    apiClient.get('/ceo/staff').then(({ data }) => setStaff(data))
  }

  useEffect(load, [])

  function openCreate() {
    setForm({ name: '', email: '', password: '' })
    setError(null)
    setEditing({})
  }

  function openEdit(admin) {
    setForm({ name: admin.name, email: admin.email, password: '' })
    setError(null)
    setEditing(admin)
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!editing?.id && !passwordOk(form.password)) return setError('The password needs at least 8 characters with an uppercase letter, a lowercase letter and a number.')
    try {
      if (editing?.id) {
        await apiClient.patch(`/ceo/staff/${editing.id}`, { name: form.name, email: form.email })
      } else {
        await apiClient.post('/ceo/staff', form)
      }
      setEditing(null)
      load()
    } catch (err) {
      setError(apiError(err, 'Could not save this account.'))
    }
  }

  async function toggleActive(admin) {
    const action = admin.is_active ? 'deactivate' : 'activate'
    await apiClient.patch(`/ceo/staff/${admin.id}/${action}`)
    load()
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1>Manage Admin Accounts</h1>
        </div>
        <button onClick={openCreate} className="rdg-btn w-full shrink-0 whitespace-nowrap sm:w-auto">
          <UserPlus size={16} /> Add admin
        </button>
      </div>

      {/* Phones: one card per admin instead of a sideways-scrolling table. */}
      <ul className="space-y-3 sm:hidden">
        {staff.map((admin, i) => (
          <li key={admin.id} style={{ animationDelay: `${i * 40}ms` }} className="rdg-card flex animate-rdg-fade-up items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{admin.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{admin.name}</p>
              <p className="truncate text-xs text-slate-500">{admin.email}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${admin.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{admin.is_active ? 'Active' : 'Deactivated'}</span>
            </div>
            <div className="flex shrink-0 gap-1">
              <button onClick={() => openEdit(admin)} aria-label={`Edit ${admin.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
              <button onClick={() => toggleActive(admin)} aria-label={admin.is_active ? 'Deactivate' : 'Activate'} className={`flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 ${admin.is_active ? 'text-red-500' : 'text-green-600'}`}>
                {admin.is_active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
              </button>
            </div>
          </li>
        ))}
        {staff.length === 0 && <li className="rdg-card p-6 text-center text-sm text-slate-400">No admin accounts yet.</li>}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((admin) => (
              <tr key={admin.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-700">{admin.name}</td>
                <td className="px-4 py-3 text-slate-500">{admin.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {admin.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(admin)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => toggleActive(admin)}
                      className={`rounded p-1.5 hover:bg-slate-100 ${admin.is_active ? 'text-red-500' : 'text-emerald-600'}`}
                      title={admin.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {admin.is_active ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No admin accounts yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Edit admin' : 'Add admin'} size="sm">
        <form onSubmit={submit} className="space-y-4">
          <RequiredNote />
          <Field label="Full name"><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full" /></Field>
          <Field label="Email" hint="Their login codes are sent here."><input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full" /></Field>
          {!editing?.id && (
            <div>
              <Field label="Temporary password" hint="Share it privately. They can change it under My account."><PasswordInput required autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></Field>
              <PasswordRules password={form.password} />
            </div>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rdg-btn-ghost">Cancel</button>
            <button type="submit" className="rdg-btn">{editing?.id ? 'Save changes' : 'Add admin'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
