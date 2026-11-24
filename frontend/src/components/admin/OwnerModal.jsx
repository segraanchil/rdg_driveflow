import { useState } from 'react'
import { BadgeCheck, TriangleAlert, ZoomIn } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import { Modal, useConfirm } from '../ui/Modal'
import { Field, StatusBadge } from '../ui/kit'
import Select from '../ui/Select'
import DateSelect from '../ui/DateSelect'
import { LicensePhoto } from '../vehicles/DeedOwner'
import { MIN_OWNER_AGE, RELATIONSHIP_LABELS, ageOn, apiError, vehicleName } from '../../lib/format'
import { toast } from '../../lib/toast'

const CIVIL_STATUSES = { single: 'Single', married: 'Married', widowed: 'Widowed', separated: 'Separated' }

/**
 * Staff fill in or correct the details of the person to be named on the Deed of Sale, next to their
 * driver's license, then approve. Without `owner`, staff add one themselves for a buyer's reservation
 * or sale (`target`: { buyer, buyer_id, vehicle, vehicle_id }) and upload the license here.
 */
export default function OwnerModal({ owner, target, onClose, onSaved }) {
  const buyer = owner?.buyer ?? target?.buyer
  const vehicle = owner?.vehicle ?? target?.vehicle
  const [form, setForm] = useState({
    full_name: owner?.full_name ?? '',
    birthdate: owner?.birthdate ?? '',
    relationship: owner?.relationship ?? '',
    license_number: owner?.license_number ?? '',
    license_expiry: owner?.license_expiry ?? '',
    nationality: owner?.nationality ?? 'Filipino',
    civil_status: owner?.civil_status ?? '',
    address: owner?.address ?? '',
  })
  const [front, setFront] = useState(null)
  const [back, setBack] = useState(null)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirm, confirmUi] = useConfirm()

  const year = new Date().getFullYear()
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const age = form.birthdate ? ageOn(form.birthdate) : null
  const tooYoung = age !== null && age < MIN_OWNER_AGE
  const approved = owner?.status === 'approved'

  async function save(e) {
    e.preventDefault()
    setErrors({})
    setError(null)
    if (!form.birthdate || !form.license_expiry) return setError('Fill in the birthdate and the license expiry date.')
    if (!form.relationship) return setError('Choose the relationship to the buyer.')
    if (tooYoung) return setError(`The owner named on the Deed of Sale must be at least ${MIN_OWNER_AGE} years old.`)
    if (!owner && !front) return setError('Upload the front of the new owner’s driver’s license.')

    setBusy(true)
    try {
      if (owner) {
        await apiClient.put(`/admin/intended-owners/${owner.id}/approve`, form, { loadingText: 'Saving owner…', quietErrors: true })
      } else {
        const body = new FormData()
        body.append('buyer_id', target.buyer_id)
        body.append('vehicle_id', target.vehicle_id)
        Object.entries(form).forEach(([k, v]) => body.append(k, v))
        body.append('owner_license_front', front)
        if (back) body.append('owner_license_back', back)
        await apiClient.post('/admin/intended-owners', body, { headers: { 'Content-Type': 'multipart/form-data' }, loadingText: 'Saving owner…', quietErrors: true })
      }
      toast.success(`${form.full_name} will be named on the Deed of Sale`)
      onSaved()
    } catch (err) {
      setErrors(Object.fromEntries(Object.entries(err.response?.data?.errors ?? {}).map(([k, v]) => [k, v[0]])))
      setError(apiError(err, 'Could not save the owner.'))
    } finally {
      setBusy(false)
    }
  }

  async function reject() {
    const result = await confirm({
      title: 'Reject this owner?',
      message: <><strong>{buyer?.name}</strong> is notified and can upload the license again.</>,
      confirmLabel: 'Reject',
      tone: 'danger',
      input: 'Reason, e.g. “License is expired” or “Photo is blurry”',
    })
    if (!result) return
    try {
      await apiClient.post(`/admin/intended-owners/${owner.id}/reject`, { reason: result.value }, { quietErrors: true })
      toast.success('Rejected. The buyer has been notified.')
      onSaved()
    } catch (err) {
      setError(apiError(err))
    }
  }

  async function backToBuyer() {
    const ok = await confirm({
      title: 'Use the buyer’s name?',
      message: <>The Deed of Sale goes back to <strong>{buyer?.name}</strong>. {owner.full_name}’s details and license photos are deleted.</>,
      confirmLabel: 'Use buyer’s name',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await apiClient.delete(`/admin/intended-owners/${owner.id}`, { quietErrors: true })
      toast.success('The Deed of Sale is back in the buyer’s name')
      onSaved()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const rejectLook = 'inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50'

  return (
    <>
      <Modal
        open
        size="xl"
        onClose={onClose}
        title={`Owner on the Deed of Sale · ${vehicleName(vehicle)}`}
        footer={
          <>
            {owner && <button type="button" onClick={backToBuyer} className="rdg-btn-ghost mr-auto">Use buyer’s name</button>}
            {owner && owner.status === 'pending' && <button type="button" onClick={reject} className={rejectLook}>Reject</button>}
            <button type="button" onClick={onClose} className="rdg-btn-ghost">Cancel</button>
            <button type="submit" form="owner-form" disabled={busy} className="rdg-btn"><BadgeCheck size={16} /> {approved ? 'Save changes' : 'Approve owner'}</button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Buyer (paying)</p>
              <p className="font-semibold text-slate-900">{buyer?.name}</p>
              <p className="text-xs text-slate-500">{buyer?.email}</p>
              {owner && <StatusBadge kind="owner" status={owner.status} className="mt-2" />}
              {owner?.rejection_reason && <p className="mt-1.5 text-xs text-red-700">Reason: {owner.rejection_reason}</p>}
            </div>
            {owner ? (
              <>
                <License owner={owner} side="front" />
                {owner.has_back && <License owner={owner} side="back" />}
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <LicensePhoto label="Driver’s license, front" required file={front} onChange={setFront} />
                <LicensePhoto label="Driver’s license, back" file={back} onChange={setBack} />
              </div>
            )}
          </div>

          <form id="owner-form" onSubmit={save} className="space-y-4">
            <Field label="Full name" error={errors.full_name}>
              <input required minLength={3} maxLength={120} value={form.full_name} onChange={set('full_name')} className="w-full" placeholder="As printed on the license" />
            </Field>
            <div>
              <span className="rdg-label is-required">Birthdate</span>
              <DateSelect value={form.birthdate} onChange={(v) => setForm((f) => ({ ...f, birthdate: v }))} minYear={year - 100} maxYear={year} label="Birthdate" />
              {age !== null && (tooYoung
                ? <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-red-600"><TriangleAlert size={14} className="mt-0.5 shrink-0" /> {age} years old. Must be at least {MIN_OWNER_AGE}.</p>
                : <p className="mt-1.5 text-xs font-semibold text-green-700">{age} years old</p>)}
              {errors.birthdate && !tooYoung && <p className="mt-1 text-xs font-semibold text-red-600">{errors.birthdate}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="License no." error={errors.license_number}>
                <input required maxLength={40} value={form.license_number} onChange={set('license_number')} className="w-full uppercase" placeholder="N01-12-345678" />
              </Field>
              <div>
                <span className="rdg-label is-required">Relationship to buyer</span>
                <Select value={form.relationship} onChange={set('relationship')} placeholder="Choose" className="w-full" aria-label="Relationship to buyer">
                  {Object.entries(RELATIONSHIP_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <span className="rdg-label is-required">License valid until</span>
              <DateSelect value={form.license_expiry} onChange={(v) => setForm((f) => ({ ...f, license_expiry: v }))} minYear={year - 5} maxYear={year + 11} newestFirst={false} label="License valid until" />
              {errors.license_expiry && <p className="mt-1 text-xs font-semibold text-red-600">{errors.license_expiry}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nationality" error={errors.nationality}><input required maxLength={40} value={form.nationality} onChange={set('nationality')} className="w-full" /></Field>
              <div>
                <span className="rdg-label">Civil status</span>
                <Select value={form.civil_status} onChange={set('civil_status')} className="w-full" aria-label="Civil status">
                  <option value="">—</option>
                  {Object.entries(CIVIL_STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              </div>
            </div>
            <Field label="Address" error={errors.address}>
              <textarea required rows={2} maxLength={255} value={form.address} onChange={set('address')} className="w-full" placeholder="House no., street, barangay, city" />
            </Field>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </form>
        </div>
      </Modal>
      {confirmUi}
    </>
  )
}

function License({ owner, side }) {
  const url = backendUrl(`/api/admin/intended-owners/${owner.id}/license/${side}?v=${encodeURIComponent(owner.updated_at)}`)
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block">
      <span className="rdg-label">Driver’s license, {side}</span>
      <span className="relative block overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
        <img src={url} alt={`Driver’s license, ${side}`} className="max-h-72 w-full object-contain" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"><ZoomIn size={22} /></span>
      </span>
    </a>
  )
}
