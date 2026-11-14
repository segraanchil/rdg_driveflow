import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarCheck, CarFront, Info, CheckCircle2 } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { apiError, formatDate, vehicleName } from '../../lib/format'

const SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']

/** Request a test drive: pick one of the next showroom days and a time slot. */
export default function TestDrive() {
  const [params] = useSearchParams()
  const vehicleId = params.get('vehicle_id')
  const [vehicle, setVehicle] = useState(undefined)
  const [day, setDay] = useState('')
  const [slot, setSlot] = useState('')
  const [note, setNote] = useState('')
  const [done, setDone] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!vehicleId) return setVehicle(null)
    apiClient.get(`/vehicles/${vehicleId}`).then(({ data }) => setVehicle(data)).catch(() => setVehicle(null))
  }, [vehicleId])

  // Next 12 showroom days (Mon–Sat), starting tomorrow.
  const days = useMemo(() => {
    const out = []
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    while (out.length < 12) {
      d.setDate(d.getDate() + 1)
      if (d.getDay() !== 0) out.push(new Date(d))
    }
    return out
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    const [y, m, dd] = [day.slice(0, 4), day.slice(5, 7), day.slice(8, 10)]
    try {
      const { data } = await apiClient.post('/buyer/test-drives', { vehicle_id: vehicleId, preferred_at: `${y}-${m}-${dd} ${slot}:00`, note: note || undefined }, { quietErrors: true })
      setDone(data)
    } catch (err) {
      setError(apiError(err, 'Could not submit your request.'))
    }
  }

  if (vehicle === undefined) return <PageLoader />
  if (!vehicle) {
    return (
      <div className="rdg-card mx-auto max-w-md p-10 text-center">
        <p className="font-bold text-slate-900">Choose a car first.</p>
        <Link to="/inventory" className="rdg-btn mt-5">Browse cars</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rdg-card mx-auto max-w-md p-8 text-center">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
        <h1 className="no-bar mt-3 block">Test drive requested</h1>
        <p className="mt-1 text-sm text-slate-600">{vehicleName(vehicle)}</p>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 font-semibold text-slate-800">{formatDate(done.preferred_at, { weekday: 'long' })} at {new Date(done.preferred_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</p>
        <p className="mt-3 text-sm text-slate-500">We’ll email you once our staff confirms the time. Bring a valid driver’s license.</p>
        <div className="mt-5 grid gap-2">
          <Link to="/garage" className="rdg-btn">View in My Garage</Link>
          <Link to={`/reservation?vehicle_id=${vehicle.id}&payment=cash`} className="rdg-btn-ghost">Reserve it now so no one else gets it</Link>
        </div>
      </div>
    )
  }

  const thumb = vehicle.media?.find((m) => m.type === 'photo')?.file_path ?? vehicle.media?.[0]?.file_path

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1">Book a Test Drive</h1>
      <p className="mb-6 text-sm text-slate-500">Pick a day and time. Our staff confirms by email.</p>

      <div className="rdg-card mb-5 flex items-center gap-4 p-4">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {thumb ? <img src={backendUrl(`/storage/${thumb}`)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><CarFront /></div>}
        </div>
        <div>
          <p className="font-bold text-slate-900">{vehicleName(vehicle)}</p>
          <Link to={`/inventory/${vehicle.id}`} className="text-sm font-semibold text-emerald-700 hover:underline">View car</Link>
        </div>
      </div>

      <form onSubmit={submit} className="rdg-card space-y-5 p-6">
        <div>
          <span className="rdg-label is-required">Day</span>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {days.map((d) => {
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              return (
                <button type="button" key={key} onClick={() => setDay(key)}
                  className={`w-16 shrink-0 rounded-xl border py-2 text-center ${day === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
                  <span className="block text-[11px] font-semibold uppercase">{d.toLocaleDateString('en-PH', { weekday: 'short' })}</span>
                  <span className="block text-lg font-extrabold">{d.getDate()}</span>
                  <span className="block text-[11px]">{d.toLocaleDateString('en-PH', { month: 'short' })}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <span className="rdg-label is-required">Time</span>
          <div className="grid grid-cols-4 gap-2">
            {SLOTS.map((t) => (
              <button type="button" key={t} onClick={() => setSlot(t)} disabled={!day}
                className={`rounded-lg border py-2 text-sm font-semibold ${slot === t ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
                {new Date(`2000-01-01T${t}`).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="rdg-label">Note for our staff (optional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className="w-full" placeholder="e.g. I’d like to try it on the highway" />
        </label>
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Info size={16} className="mt-0.5 shrink-0" /> A test drive doesn’t reserve the car. It can still be reserved or sold before your visit.</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={!day || !slot || vehicle.status !== 'available'} className="rdg-btn w-full py-3"><CalendarCheck size={17} /> Request test drive</button>
      </form>
    </div>
  )
}
