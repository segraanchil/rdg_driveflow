import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Banknote, Clock, ShieldCheck, Upload, Store, FileCheck2, CarFront } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'

/** Straight Cash reservation: payment instructions, proof upload, then a live 48-hour hold timer. */
export default function Reservation() {
  const [searchParams] = useSearchParams()
  const vehicleId = searchParams.get('vehicle_id')
  const paymentMethod = searchParams.get('payment') === 'financing' ? 'financing' : 'cash'
  const [vehicle, setVehicle] = useState(null)
  const [file, setFile] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (vehicleId) apiClient.get(`/vehicles/${vehicleId}`).then(({ data }) => setVehicle(data)).catch(() => {})
  }, [vehicleId])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    const form = new FormData()
    form.append('vehicle_id', vehicleId)
    form.append('payment_method', paymentMethod)
    form.append('payment_proof', file)
    try {
      const { data } = await apiClient.post('/buyer/reservations', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        loadingText: 'Reserving your car…',
      })
      setReservation(data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Reservation failed.')
    }
  }

  if (reservation) return <ReservationHold reservation={reservation} vehicle={vehicle} />

  const thumb = vehicle?.media?.[0]?.file_path

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1">Reserve — Straight Cash</h1>
      <p className="mb-6 text-sm text-slate-500">Pay the reservation fee, upload your proof, and we&apos;ll hold the car for you for 48 hours while we verify it.</p>

      <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
        {/* Car summary */}
        <div className="rdg-card overflow-hidden">
          <div className="aspect-video bg-slate-100">
            {thumb ? <img src={backendUrl(`/storage/${thumb}`)} alt="" className="h-full w-full object-cover" />
              : <div className="flex h-full items-center justify-center text-slate-400"><CarFront size={40} strokeWidth={1.4} /></div>}
          </div>
          <div className="p-4">
            {vehicle ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{vehicle.year}</p>
                <p className="text-lg font-extrabold text-slate-900">{vehicle.make} {vehicle.model}</p>
                <p className="mt-2 text-2xl font-extrabold text-emerald-600">₱{Number(vehicle.selling_price).toLocaleString()}</p>
              </>
            ) : <div className="rdg-skeleton h-16" />}
          </div>
        </div>

        <div className="space-y-5">
          {/* Cash instructions */}
          <div className="rdg-card p-5">
            <p className="mb-3 flex items-center gap-2 font-bold text-slate-900"><Banknote size={18} className="text-emerald-600" /> How Straight Cash works</p>
            <ol className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">1</span>Pay the reservation fee using the payment details our staff gave you (bank transfer, e-wallet, or at the showroom).</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">2</span>Upload a clear photo or screenshot of your receipt below.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">3</span>The car is held for you right away. We verify your payment within 48 hours.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">4</span>Pay the remaining balance in cash at our showroom when you claim the car. Your invoice, Deed of Sale and Official Receipt are prepared on the spot.</li>
            </ol>
          </div>

          <form onSubmit={submit} className="rdg-card p-5">
            <p className="mb-2 flex items-center gap-2 font-bold text-slate-900"><Upload size={18} className="text-emerald-600" /> Proof of payment</p>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="w-full" required />
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" className="rdg-btn mt-4 w-full py-3" disabled={!vehicleId}>Submit reservation</button>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck size={14} /> If your payment can&apos;t be verified, the car is released and our staff will contact you.</p>
          </form>
        </div>
      </div>
    </div>
  )
}

function ReservationHold({ reservation, vehicle }) {
  const expiresAt = new Date(reservation.expires_at).getTime()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remaining = Math.max(0, expiresAt - now)
  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  const s = Math.floor((remaining % 60_000) / 1000)
  const pct = Math.min(100, (remaining / (48 * 3_600_000)) * 100)
  const pad = (n) => String(n).padStart(2, '0')

  return (
    <div className="mx-auto max-w-md">
      <div className="rdg-card p-7 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><FileCheck2 size={28} /></span>
        <h1 className="no-bar mt-4 block">Reservation submitted</h1>
        {vehicle && <p className="mt-1 text-sm font-semibold text-slate-700">{vehicle.year} {vehicle.make} {vehicle.model}</p>}
        <p className="mt-1 text-sm text-slate-500">The car is held for you while we verify your payment.</p>

        <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white">
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300"><Clock size={14} /> Hold time remaining</p>
          <p className="mt-1 font-mono text-4xl font-extrabold tabular-nums">{pad(h)}:{pad(m)}:{pad(s)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          <Link to="/garage" className="rdg-btn py-3">View in My Garage</Link>
          <Link to="/inventory" className="rdg-btn-ghost"><Store size={16} /> Keep browsing</Link>
        </div>
      </div>
    </div>
  )
}
