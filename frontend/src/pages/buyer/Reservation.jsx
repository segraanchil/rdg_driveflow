import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Clock, ShieldCheck, Upload, Store, FileCheck2, CarFront, Copy, Landmark, Smartphone, X, Check, QrCode, Hash, Lock } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { BLANK_OWNER, DeedNameChoice, OwnerFields, OwnerSummary, appendOwner, ownerProblem } from '../../components/vehicles/DeedOwner'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../lib/useSettings'
import { MIN_OWNER_AGE, apiError, peso, vehicleName } from '../../lib/format'
import { toast } from '../../lib/toast'

/**
 * Reservation (Stories 09–10): choose a payment channel (GCash shows the QR, bank transfer shows
 * the account number), pay the fee, say whose name goes on the Deed of Sale, agree to the terms, upload
 * the receipt, then a live 48-hour hold timer.
 * Payments are verified manually by staff.
 */
export default function Reservation() {
  const [params] = useSearchParams()
  const vehicleId = params.get('vehicle_id')
  const paymentMethod = params.get('payment') === 'financing' ? 'financing' : 'cash'
  const s = useSettings()
  const [vehicle, setVehicle] = useState(undefined)
  const [channel, setChannel] = useState('gcash')
  const [reference, setReference] = useState('')
  const [file, setFile] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [error, setError] = useState(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const { user } = useAuth()
  const [deedName, setDeedName] = useState('self') // 'self' | 'other'
  const [owner, setOwner] = useState(BLANK_OWNER)
  const [existingOwner, setExistingOwner] = useState(null) // already sent with the financing application
  const [replaceOwner, setReplaceOwner] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (!vehicleId) { setVehicle(null); return }
    apiClient.get(`/vehicles/${vehicleId}`).then(({ data }) => setVehicle(data)).catch(() => setVehicle(null))
    apiClient.get('/buyer/intended-owners', { params: { vehicle_id: vehicleId }, silent: true }).then(({ data }) => {
      if (!data.owner) return
      setExistingOwner(data.owner)
      setReplaceOwner(data.owner.status === 'rejected')
      setDeedName('other')
    }).catch(() => {})
  }, [vehicleId])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    const form = new FormData()
    form.append('vehicle_id', vehicleId)
    form.append('payment_method', paymentMethod)
    form.append('payment_channel', channel)
    if (reference.trim()) form.append('payment_reference', reference.trim())
    form.append('payment_proof', file)
    form.append('terms_accepted', agreed ? '1' : '0')
    const keepOwner = deedName === 'other' && existingOwner && !replaceOwner
    form.append('deed_name', keepOwner ? 'keep' : deedName)
    if (deedName === 'other' && !keepOwner) {
      const problem = ownerProblem(owner)
      if (problem) { setError(problem); return }
      appendOwner(form, owner)
    }
    try {
      const { data } = await apiClient.post('/buyer/reservations', form, { headers: { 'Content-Type': 'multipart/form-data' }, loadingText: 'Reserving your car…', quietErrors: true })
      setReservation(data)
    } catch (err) {
      setError(apiError(err, 'Reservation failed.'))
    }
  }

  if (reservation) return <ReservationHold reservation={reservation} vehicle={vehicle} />
  if (vehicle === undefined) return <PageLoader />
  if (!vehicle) {
    return (
      <div className="rdg-card mx-auto max-w-md p-10 text-center">
        <p className="font-bold text-slate-900">Pick a car to reserve first.</p>
        <Link to="/inventory" className="rdg-btn mt-5">Browse cars</Link>
      </div>
    )
  }

  const thumb = vehicle.media?.find((m) => m.type === 'photo')?.file_path ?? vehicle.media?.find((m) => m.type === '360_frame')?.file_path
  const fee = Number(s.reservation_fee)
  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast.success('Copied'))
  const channels = [
    { key: 'gcash', label: s.payment_ewallet_name || 'GCash', hint: 'Scan the QR or send to our number', icon: Smartphone },
    { key: 'bank_transfer', label: 'Bank transfer', hint: 'InstaPay / PESONet / over the counter', icon: Landmark },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1">Reserve this car</h1>
      <p className="mb-6 text-sm text-slate-500">Pay the {peso(fee)} reservation fee, upload your receipt, and the car is held for you for 48 hours while we verify it.</p>

      {vehicle.status !== 'available' && (
        <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">This car is no longer available to reserve. <Link to="/inventory" className="font-bold underline">See other cars</Link></p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
        <div className="space-y-5">
          <div className="rdg-card overflow-hidden">
            <div className="aspect-video bg-slate-100">
              {thumb ? <img src={backendUrl(`/storage/${thumb}`)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><CarFront size={40} strokeWidth={1.4} /></div>}
            </div>
            <div className="p-4">
              <p className="text-lg font-extrabold text-slate-900">{vehicleName(vehicle)}</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Car price</dt><dd className="font-semibold">{peso(vehicle.selling_price)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Reservation fee (pay now)</dt><dd className="font-bold text-slate-900">{peso(fee)}</dd></div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5"><dt className="text-slate-500">Balance on release</dt><dd className="font-semibold">{peso(Math.max(0, vehicle.selling_price - fee))}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-slate-400">The reservation fee is deducted from the price on your invoice.</p>
            </div>
          </div>

          <ol className="rdg-card space-y-3 p-5 text-sm text-slate-600">
            {[
              'Choose GCash or bank transfer and pay the reservation fee.',
              'Say whose name goes on the Deed of Sale, and agree to the terms and conditions.',
              'Upload a clear screenshot or photo of your receipt.',
              'The car is held for you right away. Our staff verifies the payment manually within 48 hours and emails you.',
              'Pay the balance when you claim the car. Your invoice, Deed of Sale and Official Receipt are prepared on the spot.',
            ].map((t, i) => (
              <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>{t}</li>
            ))}
          </ol>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="rdg-card p-5">
            <p className="mb-3 font-bold text-slate-900">1. How will you pay {peso(fee)}? <span className="text-red-500" aria-label="required">*</span></p>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment channel">
              {channels.map(({ key, label, hint, icon: Icon }) => {
                const on = channel === key
                return (
                  <button type="button" role="radio" aria-checked={on} key={key} onClick={() => setChannel(key)}
                    className={`relative flex items-start gap-3 rounded-xl border p-4 text-left ${on ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-400'}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}><Icon size={19} /></span>
                    <span><span className="block font-bold text-slate-900">{label}</span><span className="text-xs text-slate-500">{hint}</span></span>
                    {on && <Check size={16} className="absolute right-3 top-3 text-slate-900" />}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 animate-rdg-fade-up rounded-xl bg-slate-50 p-4" key={channel}>
              {channel === 'gcash' ? (
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  {s.payment_qr_path ? (
                    <img src={backendUrl(`/storage/${s.payment_qr_path}`)} alt={`${s.payment_ewallet_name || 'GCash'} QR code`} className="h-44 w-44 shrink-0 rounded-xl bg-white object-contain p-2 ring-1 ring-slate-200" />
                  ) : (
                    <div className="flex h-44 w-44 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white p-3 text-center text-xs text-slate-400"><QrCode size={32} /> QR code not uploaded yet</div>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold text-slate-900">Pay with {s.payment_ewallet_name || 'GCash'}</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-slate-600">
                      <li>Open the app and tap <strong>Scan QR</strong>, or send money to the number below.</li>
                      <li>Enter exactly <strong>{peso(fee)}</strong>.</li>
                      <li>Screenshot the receipt with the reference number.</li>
                    </ol>
                    {s.payment_ewallet_number ? (
                      <CopyRow label={`${s.payment_ewallet_name || 'GCash'} number`} value={s.payment_ewallet_number} name={s.payment_account_name} onCopy={copy} />
                    ) : !s.payment_qr_path && (
                      <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Our GCash details aren’t posted yet. Ask us in the chat, or choose bank transfer.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm">
                  <p className="font-bold text-slate-900">Pay by bank transfer</p>
                  <p className="mt-1 text-slate-600">Transfer exactly <strong>{peso(fee)}</strong> through InstaPay, PESONet or over the counter, then upload the confirmation.</p>
                  {s.payment_account_number ? (
                    <>
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200"><dt className="text-xs text-slate-500">Bank</dt><dd className="font-semibold text-slate-900">{s.payment_bank_name || '—'}</dd></div>
                        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200"><dt className="text-xs text-slate-500">Account name</dt><dd className="font-semibold text-slate-900">{s.payment_account_name}</dd></div>
                      </dl>
                      <CopyRow label="Account number" value={s.payment_account_number} onCopy={copy} />
                    </>
                  ) : (
                    <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Our bank details aren’t posted yet. Ask us in the chat, or choose GCash.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rdg-card p-5">
            <p className="mb-1 font-bold text-slate-900">2. Whose name goes on the Deed of Sale? <span className="text-red-500" aria-label="required">*</span></p>
            <p className="mb-3 text-sm text-slate-500">The owner must be at least {MIN_OWNER_AGE} years old.</p>
            <DeedNameChoice value={deedName} onChange={setDeedName} buyerName={user?.name} />
            {deedName === 'other' && (
              <div className="mt-4 animate-rdg-fade-up">
                {existingOwner && !replaceOwner ? (
                  <>
                    <OwnerSummary owner={existingOwner} />
                    <button type="button" onClick={() => setReplaceOwner(true)} className="mt-2 text-xs font-bold text-slate-900 underline underline-offset-2">Change this person</button>
                  </>
                ) : (
                  <>
                    <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">You stay the buyer and the one paying. Our staff validate this person’s driver’s license, then their details are printed on the Deed of Sale.</p>
                    <OwnerFields value={owner} onChange={setOwner} />
                  </>
                )}
              </div>
            )}
          </div>

          <div className="rdg-card p-5">
            <p className="mb-3 font-bold text-slate-900">3. Terms and conditions <span className="text-red-500" aria-label="required">*</span></p>
            <div tabIndex={0} role="region" aria-label="Terms and conditions" className="max-h-60 overflow-y-auto overscroll-contain space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
              {(s.reservation_terms || 'Loading the terms…').split('\n').filter((line) => line.trim()).map((line, i) => <p key={i}>{line}</p>)}
            </div>
            <label className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${agreed ? 'border-slate-900 bg-slate-50' : 'border-slate-300 hover:border-slate-400'}`}>
              <input type="checkbox" checked={agreed} disabled={!s.reservation_terms} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="font-semibold text-slate-800">I have read and agree to the terms and conditions, and I confirm that the owner named on the Deed of Sale is at least {MIN_OWNER_AGE} years old.</span>
            </label>
          </div>

          <div className="rdg-card p-5">
            <p className="mb-3 font-bold text-slate-900">4. Upload your receipt <span className="text-red-500" aria-label="required">*</span></p>
            {!agreed && <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><Lock size={15} className="mt-0.5 shrink-0" /> Agree to the terms and conditions first to upload your payment screenshot.</p>}
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Your receipt" className="max-h-72 w-full rounded-xl bg-slate-100 object-contain" />
                <button type="button" onClick={() => setFile(null)} className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white" aria-label="Remove"><X size={14} /></button>
              </div>
            ) : (
              <label className={`flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ${agreed ? 'cursor-pointer hover:border-slate-900' : 'cursor-not-allowed opacity-50'}`}>
                <Upload size={22} className="text-slate-900" />
                <span className="font-semibold text-slate-700">Tap to choose a screenshot or photo</span>
                <span className="text-xs">The amount, date and reference number must be readable.</span>
                <input type="file" accept="image/*" required disabled={!agreed} className="sr-only" aria-label="Payment screenshot" onChange={(e) => setFile(e.target.files[0] ?? null)} />
              </label>
            )}
            <label className="mt-4 block">
              <span className="rdg-label">Reference number (optional, speeds up verification)</span>
              <span className="relative block">
                <Hash size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} className="w-full pl-9" placeholder={channel === 'gcash' ? 'e.g. 1012 345 678901' : 'e.g. InstaPay trace no.'} />
              </span>
            </label>
            {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" className="rdg-btn mt-4 w-full py-3" disabled={!file || !agreed || vehicle.status !== 'available'}>Submit reservation</button>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><ShieldCheck size={14} className="mt-0.5 shrink-0" /> Payments are checked manually by our staff. If it can’t be verified, the car is released and you’ll be emailed the reason.</p>
          </div>
        </form>
      </div>
    </div>
  )
}

function CopyRow({ label, value, name, onCopy }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}{name ? ` · ${name}` : ''}</p>
        <p className="font-mono text-base font-bold tracking-wide text-slate-900">{value}</p>
      </div>
      <button type="button" onClick={() => onCopy(value)} className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-black"><Copy size={13} /> Copy</button>
    </div>
  )
}

export function ReservationHold({ reservation, vehicle }) {
  const expiresAt = new Date(reservation.expires_at).getTime()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remaining = Math.max(0, expiresAt - now)
  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  const sec = Math.floor((remaining % 60_000) / 1000)
  const pct = Math.min(100, (remaining / (48 * 3_600_000)) * 100)
  const pad = (n) => String(n).padStart(2, '0')

  return (
    <div className="mx-auto max-w-md">
      <div className="rdg-card p-7 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-900"><FileCheck2 size={28} /></span>
        <h1 className="no-bar mt-4 block">Reservation submitted</h1>
        {vehicle && <p className="mt-1 text-sm font-semibold text-slate-700">{vehicleName(vehicle)}</p>}
        <p className="mt-1 text-sm text-slate-500">The car is held for you while we verify your payment. We’ll email you once it’s confirmed.</p>

        <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white">
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300"><Clock size={14} /> Hold time remaining</p>
          <p className="mt-1 font-mono text-4xl font-extrabold tabular-nums">{pad(h)}:{pad(m)}:{pad(sec)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="mt-5 grid gap-2">
          <Link to="/garage" className="rdg-btn py-3">View in My Garage</Link>
          <Link to="/inventory" className="rdg-btn-ghost"><Store size={16} /> Keep browsing</Link>
        </div>
      </div>
    </div>
  )
}
