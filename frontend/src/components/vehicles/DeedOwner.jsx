import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Check, Clock, FileSignature, IdCard, TriangleAlert, Upload, UserRound, UsersRound, X } from 'lucide-react'
import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Modal, useConfirm } from '../ui/Modal'
import { Field } from '../ui/kit'
import Select from '../ui/Select'
import DateSelect from '../ui/DateSelect'
import { MIN_OWNER_AGE, RELATIONSHIP_LABELS, ageOn, apiError } from '../../lib/format'
import { toast } from '../../lib/toast'

export const BLANK_OWNER = { name: '', birthdate: '', relationship: '', front: null, back: null }

/** First thing still wrong with the new owner's details, or null when they're ready to send. */
export function ownerProblem(o) {
  if (o.name.trim().length < 3) return 'Enter the new owner’s full name.'
  if (!o.birthdate) return 'Enter the new owner’s birthdate.'
  if (ageOn(o.birthdate) < MIN_OWNER_AGE) return `The new owner must be at least ${MIN_OWNER_AGE} years old.`
  if (!o.relationship) return 'Choose how the new owner is related to you.'
  if (!o.front) return 'Upload the front of the new owner’s driver’s license.'
  return null
}

export function appendOwner(form, o) {
  form.append('owner_name', o.name.trim())
  form.append('owner_birthdate', o.birthdate)
  form.append('owner_relationship', o.relationship)
  form.append('owner_license_front', o.front)
  if (o.back) form.append('owner_license_back', o.back)
}

/** "My name" / "Someone else" cards. */
export function DeedNameChoice({ value, onChange, buyerName }) {
  const options = [
    ['self', UserRound, 'My name', buyerName],
    ['other', UsersRound, 'Someone else', 'e.g. your child or spouse'],
  ]
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Name on the Deed of Sale">
      {options.map(([key, Icon, label, hint]) => {
        const on = value === key
        return (
          <button type="button" role="radio" aria-checked={on} key={key} onClick={() => onChange(key)}
            className={`relative flex items-start gap-3 rounded-xl border p-4 text-left ${on ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-400'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}><Icon size={19} /></span>
            <span className="min-w-0"><span className="block font-bold text-slate-900">{label}</span><span className="block truncate text-xs text-slate-500">{hint}</span></span>
            {on && <Check size={16} className="absolute right-3 top-3 text-slate-900" />}
          </button>
        )
      })}
    </div>
  )
}

/** The new owner's details and driver's license. Controlled: value is BLANK_OWNER-shaped. */
export function OwnerFields({ value, onChange }) {
  const set = (key, v) => onChange({ ...value, [key]: v })
  const year = new Date().getFullYear()
  const age = value.birthdate ? ageOn(value.birthdate) : null
  const tooYoung = age !== null && age < MIN_OWNER_AGE

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name (as on the license)" required>
          <input value={value.name} onChange={(e) => set('name', e.target.value)} maxLength={120} autoComplete="off" className="w-full" placeholder="Juan Santos Dela Cruz" />
        </Field>
        <div>
          <span className="rdg-label is-required">Relationship to you</span>
          <Select value={value.relationship} onChange={(e) => set('relationship', e.target.value)} placeholder="Choose" className="w-full" aria-label="Relationship to you">
            {Object.entries(RELATIONSHIP_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <span className="rdg-label is-required">Birthdate</span>
        <DateSelect value={value.birthdate} onChange={(v) => set('birthdate', v)} minYear={year - 100} maxYear={year} label="Birthdate" />
        {tooYoung
          ? <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-red-600"><TriangleAlert size={14} className="mt-0.5 shrink-0" /> The owner named on the Deed of Sale must be at least {MIN_OWNER_AGE} years old.</p>
          : <p className="mt-1.5 text-xs text-slate-400">Must be {MIN_OWNER_AGE} or older.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <LicensePhoto label="Driver’s license, front" required file={value.front} onChange={(f) => set('front', f)} />
        <LicensePhoto label="Driver’s license, back" file={value.back} onChange={(f) => set('back', f)} />
      </div>
      <p className="text-xs text-slate-500">All four corners must be visible and readable. Only you and our staff can see these photos.</p>
    </div>
  )
}

export function LicensePhoto({ label, required, file, onChange }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  return (
    <div>
      <span className={`rdg-label ${required ? 'is-required' : ''}`}>{label}</span>
      {preview ? (
        <div className="relative">
          <img src={preview} alt={label} className="aspect-[1.6] w-full rounded-xl bg-slate-100 object-contain ring-1 ring-slate-200" />
          <button type="button" onClick={() => onChange(null)} aria-label={`Remove ${label}`} className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"><X size={14} /></button>
        </div>
      ) : (
        <label className="flex aspect-[1.6] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-3 text-center text-xs text-slate-500 hover:border-slate-900">
          <IdCard size={24} className="text-slate-900" />
          <span className="flex items-center gap-1 font-semibold text-slate-700"><Upload size={13} /> Choose a photo</span>
          <input type="file" accept="image/*" className="sr-only" aria-label={label} onChange={(e) => onChange(e.target.files[0] ?? null)} />
        </label>
      )}
    </div>
  )
}

const STATUS = {
  pending: [Clock, 'bg-amber-50 text-amber-800', 'Our staff are checking the driver’s license.'],
  approved: [BadgeCheck, 'bg-green-50 text-green-800', 'Approved. This name will be on the Deed of Sale.'],
  rejected: [TriangleAlert, 'bg-red-50 text-red-800', null],
}

/** "Juan Dela Cruz (your child)" with its validation status. */
export function OwnerSummary({ owner }) {
  const [Icon, tone, text] = STATUS[owner.status] ?? STATUS.pending
  return (
    <div className={`flex gap-2.5 rounded-xl p-3 text-sm ${tone}`}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <span>
        <strong>{owner.full_name}</strong> ({RELATIONSHIP_LABELS[owner.relationship]?.toLowerCase() ?? 'other'})
        <span className="block text-xs">{text ?? `Not accepted: ${owner.rejection_reason}. Upload again, or keep the car under your name.`}</span>
      </span>
    </div>
  )
}

/**
 * Whose name goes on the Deed of Sale, with change buttons (financing page, My Garage). Pass `owner`
 * when the page already has it (null = the buyer); otherwise the card loads it.
 */
export function DeedOwnerCard({ vehicleId, owner: given, onChanged, className = '' }) {
  const { user } = useAuth()
  const [owner, setOwner] = useState(given)
  const [editing, setEditing] = useState(false)
  const [confirm, confirmUi] = useConfirm()

  useEffect(() => {
    if (given !== undefined) { setOwner(given); return }
    apiClient.get('/buyer/intended-owners', { params: { vehicle_id: vehicleId }, silent: true }).then(({ data }) => setOwner(data.owner)).catch(() => setOwner(null))
  }, [vehicleId, given])

  if (owner === undefined) return null

  function changed(next) {
    setOwner(next)
    onChanged?.(next)
  }

  async function backToMyName() {
    const ok = await confirm({ title: 'Use your own name?', message: <>The Deed of Sale will be under <strong>{user?.name}</strong>, and {owner.full_name}’s license photos are deleted.</>, confirmLabel: 'Use my name' })
    if (!ok) return
    try {
      await apiClient.delete(`/buyer/intended-owners/${owner.id}`, { quietErrors: true })
      toast.success('The Deed of Sale will be in your name')
      changed(null)
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-slate-600"><FileSignature size={16} className="shrink-0 text-slate-900" /> <span>Name on the Deed of Sale{!owner && <>: <strong className="text-slate-900">{user?.name}</strong> (you)</>}</span></p>
        <div className="flex flex-wrap gap-3 text-xs font-bold">
          {owner && <button type="button" onClick={backToMyName} className="text-slate-500 hover:text-slate-900 hover:underline">Use my name</button>}
          <button type="button" onClick={() => setEditing(true)} className="text-slate-900 underline underline-offset-2">{owner ? (owner.status === 'rejected' ? 'Upload again' : 'Change') : 'Name it to someone else'}</button>
        </div>
      </div>
      {owner && <div className="mt-2"><OwnerSummary owner={owner} /></div>}
      {editing && <OwnerFormModal vehicleId={vehicleId} owner={owner} onClose={() => setEditing(false)} onSaved={(o) => { setEditing(false); changed(o) }} />}
      {confirmUi}
    </div>
  )
}

function OwnerFormModal({ vehicleId, owner, onClose, onSaved }) {
  const [value, setValue] = useState(owner ? { ...BLANK_OWNER, name: owner.full_name, birthdate: owner.birthdate, relationship: owner.relationship } : BLANK_OWNER)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    const problem = ownerProblem(value)
    setError(problem)
    if (problem) return
    const form = new FormData()
    form.append('vehicle_id', vehicleId)
    appendOwner(form, value)
    setBusy(true)
    try {
      const { data } = await apiClient.post('/buyer/intended-owners', form, { headers: { 'Content-Type': 'multipart/form-data' }, quietErrors: true })
      toast.success('Sent. Our staff will validate the license.')
      onSaved(data)
    } catch (err) {
      setError(apiError(err, 'Could not save the owner.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Name the car to someone else" footer={<><button type="button" onClick={onClose} className="rdg-btn-ghost">Cancel</button><button type="button" onClick={save} disabled={busy} className="rdg-btn">Send for validation</button></>}>
      <p className="mb-4 text-sm text-slate-600">This person becomes the owner on the Deed of Sale. You stay the buyer and the one paying.</p>
      <OwnerFields value={value} onChange={setValue} />
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </Modal>
  )
}
