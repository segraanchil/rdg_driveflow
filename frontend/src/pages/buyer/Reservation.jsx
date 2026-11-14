import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Banknote, Clock, ShieldCheck, Upload, Store, FileCheck2, CarFront, Copy, Landmark, Smartphone, X } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { useSettings } from '../../lib/useSettings'
import { apiError, peso, vehicleName } from '../../lib/format'
import { toast } from '../../lib/toast'

/** Straight Cash reservation (Stories 09–10): payment details, proof upload, then a live 48-hour hold timer. */
export default function Reservation() {
  const [params] = useSearchParams()
  const vehicleId = params.get('vehicle_id')
  const paymentMethod = params.get('payment') === 'financing' ? 'financing' : 'cash'
  const s = useSettings()
  const [vehicle, setVehicle] = useState(undefined)
  const [file, setFile] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [error, setError] = useState(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  useEffect(() => {
    if (!vehicleId) return setVehicle(null)
    apiClient.get(`/vehicles/${vehicleId}`).then(({ data }) => setVehicle(data)).catch(() => setVehicle(null))
  }, [vehicleId])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    const form = new FormData()
    form.append('vehicle_id', vehicleId)
    form.append('payment_method', paymentMethod)
    form.append('payment_proof', file)
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

  const thumb = vehicle.media?.find((m) => m.type === 'photo')?.file_path ?? vehicle.media?.[0]?.file_path
  const fee = Number(s.reservation_fee)
  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast.success('Copied'))
  const hasBank = s.payment_bank_name && s.payment_account_number
  const hasWallet = s.payment_ewallet_number

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1">Reserve with Straight Cash</h1>
      <p className="mb-6 text-sm text-slate-500">Pay the reservation fee, upload your receipt, and the car is held for you for 48 hours while we verify it.</p>

      {vehicle.status !== 'available' && (
        <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">This car is no longer available to reserve. <Link to="/inventory" className="font-bold underline">See other cars</Link></p>
      )}

      <div className="grid gap-5 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-5">
          <div className="rdg-card overflow-hidden">
            <div className="aspect-video bg-slate-100">
              {thumb ? <img src={backendUrl(`/storage/${thumb}`)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><CarFront size={40} strokeWidth={1.4} /></div>}
            </div>
            <div className="p-4">
              <p className="text-lg font-extrabold text-slate-900">{vehicleName(vehicle)}</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Car price</dt><dd className="font-semibold">{peso(vehicle.selling_price)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Reservation fee (pay now)</dt><dd className="font-bold text-emerald-700">{peso(fee)}</dd></div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5"><dt className="text-slate-500">Balance on release</dt><dd className="font-semibold">{peso(Math.max(0, vehicle.selling_price - fee))}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-slate-400">The reservation fee is deducted from the price on your invoice.</p>
            </div>
          </div>

          <div className="rdg-card p-5">
            <p className="mb-3 font-bold text-slate-900">How it works</p>
            <ol className="space-y-3 text-sm text-slate-600">
              {[
                `Pay the ${peso(fee)} reservation fee using any channel on this page.`,
                'Upload a clear photo or screenshot of your receipt.',
                'The car is held for you right away. We verify your payment within 48 hours and email you.',
                'Pay the balance at our showroom when you claim the car. Your invoice, Deed of Sale and Official Receipt are prepared on the spot.',
              ].map((t, i) => (
                <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">{i + 1}</span>{t}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rdg-card p-5">
            <p className="mb-3 flex items-center gap-2 font-bold text-slate-900"><Banknote size={18} className="text-emerald-600" /> Where to pay {peso(fee)}</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                {hasBank && <PayRow icon={Landmark} title={s.payment_bank_name} lines={[s.payment_account_name, s.payment_account_number]} onCopy={() => copy(s.payment_account_number)} />}
                {hasWallet && <PayRow icon={Smartphone} title={s.payment_ewallet_name || 'E-wallet'} lines={[s.payment_account_name, s.payment_ewallet_number]} onCopy={() => copy(s.payment_ewallet_number)} />}
                <PayRow icon={Store} title="At the showroom" lines={[s.business_address, s.business_hours]} />
                {!hasBank && !hasWallet && <p className="text-xs text-slate-500">Need our bank or e-wallet details? Ask in the chat and our staff will send them.</p>}
              </div>
              {s.payment_qr_path && (
                <div className="text-center">
                  <img src={backendUrl(`/storage/${s.payment_qr_path}`)} alt="Payment QR code" className="mx-auto h-36 w-36 rounded-xl bg-white object-contain p-1 ring-1 ring-slate-200" />
                  <p className="mt-1 text-[11px] text-slate-500">Scan to pay</p>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={submit} className="rdg-card p-5">
            <p className="mb-3 flex items-center gap-2 font-bold text-slate-900"><Upload size={18} className="text-emerald-600" /> Upload your receipt</p>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Your receipt" className="max-h-64 w-full rounded-xl bg-slate-100 object-contain" />
                <button type="button" onClick={() => setFile(null)} className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white" aria-label="Remove"><X size={14} /></button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 hover:border-emerald-400 hover:bg-emerald-50">
                <Upload size={22} className="text-emerald-600" />
                <span className="font-semibold text-slate-700">Tap to choose a photo or screenshot</span>
                <span className="text-xs">Make sure the amount, date and reference number are readable.</span>
                <input type="file" accept="image/*" required className="sr-only" onChange={(e) => setFile(e.target.files[0] ?? null)} />
              </label>
            )}
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" className="rdg-btn mt-4 w-full py-3" disabled={!file || vehicle.status !== 'available'}>Submit reservation</button>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><ShieldCheck size={14} className="mt-0.5 shrink-0" /> If your payment can’t be verified, the car is released and you’ll be emailed the reason.</p>
          </form>
        </div>
      </div>
    </div>
  )
}

function PayRow({ icon: Icon, title, lines, onCopy }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
      <Icon size={18} className="mt-0.5 shrink-0 text-emerald-600" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold text-slate-900">{title}</p>
        {lines.filter(Boolean).map((l, i) => <p key={i} className={i === 1 && onCopy ? 'font-mono font-semibold text-slate-800' : 'text-slate-500'}>{l}</p>)}
      </div>
      {onCopy && <button type="button" onClick={onCopy} aria-label="Copy number" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-emerald-700"><Copy size={15} /></button>}
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
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><FileCheck2 size={28} /></span>
        <h1 className="no-bar mt-4 block">Reservation submitted</h1>
        {vehicle && <p className="mt-1 text-sm font-semibold text-slate-700">{vehicleName(vehicle)}</p>}
        <p className="mt-1 text-sm text-slate-500">The car is held for you while we verify your payment. We’ll email you once it’s confirmed.</p>

        <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white">
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300"><Clock size={14} /> Hold time remaining</p>
          <p className="mt-1 font-mono text-4xl font-extrabold tabular-nums">{pad(h)}:{pad(m)}:{pad(sec)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="mt-5 grid gap-2">
          <Link to="/garage" className="rdg-btn py-3">View in My Garage</Link>
          <Link to="/inventory" className="rdg-btn-ghost"><Store size={16} /> Keep browsing</Link>
        </div>
      </div>
    </div>
  )
}
