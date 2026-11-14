import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Heart, Gauge, Banknote, Landmark, CalendarCheck, ChevronRight, Cog, Fuel, Palette, Car, CalendarDays, Share2, ShieldCheck, Clock, Calculator, Info, Wrench, Users, Milestone, Check,
} from 'lucide-react'
import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Viewer360 from '../../components/vehicles/Viewer360'
import VehicleCard from '../../components/vehicles/VehicleCard'
import PageLoader from '../../components/ui/PageLoader'
import { estimateMonthlyAmortization } from '../../lib/loanCalculator'
import { useSettings } from '../../lib/useSettings'
import { formatDateTime, km, peso } from '../../lib/format'
import { toast } from '../../lib/toast'

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const settings = useSettings()
  const [vehicle, setVehicle] = useState(null)
  const [missing, setMissing] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setVehicle(null)
    apiClient.get(`/vehicles/${id}`).then(({ data }) => setVehicle(data)).catch(() => setMissing(true))
  }, [id])

  useEffect(() => {
    if (user?.role !== 'buyer') return
    apiClient.get('/buyer/garage', { silent: true }).then(({ data }) => setSaved((data.saved_vehicles ?? []).some((v) => String(v.id) === id))).catch(() => {})
  }, [user, id])

  async function toggleSaved() {
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    if (saved) await apiClient.delete(`/buyer/saved-vehicles/${id}`, { silent: true })
    else await apiClient.post(`/buyer/saved-vehicles/${id}`, {}, { silent: true })
    setSaved(!saved)
    toast.success(saved ? 'Removed from My Garage' : 'Saved to My Garage')
  }

  async function share() {
    const url = window.location.href
    const title = `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${peso(vehicle.selling_price)}`
    try {
      if (navigator.share) await navigator.share({ title, url })
      else { await navigator.clipboard.writeText(url); toast.success('Link copied') }
    } catch { /* cancelled */ }
  }

  if (missing) {
    return (
      <div className="rdg-card mx-auto max-w-md p-10 text-center">
        <p className="font-bold text-slate-900">This car isn’t listed anymore.</p>
        <Link to="/inventory" className="rdg-btn mt-5">Browse other cars</Link>
      </div>
    )
  }
  if (!vehicle) return <PageLoader />

  const price = Number(vehicle.selling_price)
  const available = vehicle.status === 'available'
  const isBuyer = !user || user.role === 'buyer'
  const monthly = estimateMonthlyAmortization({ vehiclePrice: price, downPayment: price * 0.2, termMonths: 60, annualInterestRate: Number(settings.loan_rate_employed) })
  const specs = [
    [CalendarDays, 'Year', vehicle.year],
    [Gauge, 'Mileage', km(vehicle.mileage)],
    [Cog, 'Transmission', vehicle.transmission],
    [Fuel, 'Fuel', vehicle.fuel_type],
    [Car, 'Body', vehicle.body_type],
    [Palette, 'Color', vehicle.color],
    [Wrench, 'Engine', vehicle.engine],
    [Users, 'Seats', vehicle.seats ? `${vehicle.seats} seats` : null],
    [Milestone, 'Drivetrain', vehicle.drivetrain],
  ]
  const features = (vehicle.features ?? '').split('\n').map((f) => f.trim()).filter(Boolean)

  const actions = available && isBuyer && (
    <div className="grid gap-2.5">
      <button onClick={() => navigate(`/reservation?vehicle_id=${vehicle.id}&payment=cash`)} className="rdg-btn py-3"><Banknote size={18} /> Reserve with Straight Cash</button>
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => navigate(`/financing-application?vehicle_id=${vehicle.id}`)} className="rdg-btn-dark"><Landmark size={16} /> Apply for financing</button>
        <button onClick={() => navigate(`/test-drive?vehicle_id=${vehicle.id}`)} className="rdg-btn-ghost"><CalendarCheck size={16} /> Book test drive</button>
      </div>
    </div>
  )

  return (
    <div className="pb-24 lg:pb-0">
      <nav className="mb-4 flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/inventory" className="hover:text-emerald-700">Browse Cars</Link>
        <ChevronRight size={14} />
        <Link to={`/inventory?make=${encodeURIComponent(vehicle.make)}`} className="hover:text-emerald-700">{vehicle.make}</Link>
        <ChevronRight size={14} />
        <span className="truncate font-semibold text-slate-700">{vehicle.model}</span>
      </nav>

      {/* Phones: photos → price & actions → specs. Desktop: photos/specs left, sticky price card right. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr] lg:grid-rows-[auto_auto_1fr]">
          <div className="order-1 rdg-card p-3 lg:order-none lg:col-start-1"><Viewer360 vehicle={vehicle} /></div>

          <div className="order-3 rdg-card p-5 lg:order-none lg:col-start-1">
            <h2 className="mb-4 font-display text-xl font-bold uppercase italic tracking-wide">Specifications</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {specs.map(([Icon, label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400"><Icon size={13} /> {label}</dt>
                  <dd className={`mt-1 font-bold ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value || 'Ask us'}</dd>
                </div>
              ))}
            </dl>
            {features.length > 0 && (
              <>
                <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">Features</h3>
                <ul className="grid gap-x-4 gap-y-1.5 text-sm text-slate-700 sm:grid-cols-2">
                  {features.map((f) => <li key={f} className="flex items-center gap-2"><Check size={15} className="shrink-0 text-green-600" /> {f}</li>)}
                </ul>
              </>
            )}
            <p className="mt-4 text-xs text-slate-400">Listing updated {formatDateTime(vehicle.last_updated)}. Specs are checked during inspection; ask us if you need a detail that isn’t listed.</p>
          </div>

          {vehicle.description && (
            <div className="order-4 rdg-card p-5 lg:order-none lg:col-start-1">
              <h2 className="mb-2 font-bold">About this car</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{vehicle.description}</p>
            </div>
          )}

        <div className="order-2 space-y-4 lg:order-none lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
          <div className="rdg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">{vehicle.year} · {km(vehicle.mileage)}</p>
                <h1 className="no-bar block">{vehicle.make} {vehicle.model}</h1>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={share} aria-label="Share" className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:border-emerald-400 hover:text-emerald-700"><Share2 size={17} /></button>
                {isBuyer && (
                  <button onClick={toggleSaved} aria-label={saved ? 'Remove from saved' : 'Save to My Garage'} aria-pressed={saved}
                    className={`rounded-lg border p-2 ${saved ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-300 text-slate-600 hover:border-rose-300 hover:text-rose-600'}`}>
                    <Heart size={17} className={saved ? 'fill-rose-500' : ''} />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-50">Selling price</p>
              <p className="text-3xl font-extrabold">{peso(price)}</p>
              {monthly > 0 && <p className="mt-1 text-sm text-emerald-50">or from <strong className="text-white">{peso(monthly)}/mo</strong> with 20% down over 60 months*</p>}
            </div>

            {!available && (
              <div className="mt-5 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                <Clock size={18} className="mt-0.5 shrink-0" />
                <span>
                  {vehicle.status === 'reserved' ? 'This car is reserved by another buyer. It may become available again if the reservation isn’t completed.'
                    : vehicle.status === 'sold' ? 'This car has been sold.' : 'This car is being prepared and will be available soon.'}
                  {' '}<Link to={`/inventory?make=${encodeURIComponent(vehicle.make)}`} className="font-bold underline">See other {vehicle.make} cars</Link>
                </span>
              </div>
            )}

            {actions && <div className="mt-5 hidden lg:block">{actions}</div>}
            {user && !isBuyer && <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">You’re signed in as {user.role}. Reserving and financing are for buyer accounts.</p>}

            <Link to={`/loan-calculator?vehicle_id=${vehicle.id}`} className="mt-4 flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-700 hover:underline"><Calculator size={15} /> Calculate my monthly payment</Link>
          </div>

          <ul className="rdg-card space-y-3 p-5 text-sm text-slate-600">
            <li className="flex gap-3"><ShieldCheck size={18} className="shrink-0 text-emerald-600" /> 1-month money-back guarantee on every car</li>
            <li className="flex gap-3"><Clock size={18} className="shrink-0 text-emerald-600" /> Reserve online: the car is held for you for 48 hours</li>
            <li className="flex gap-3"><Info size={18} className="shrink-0 text-emerald-600" /> A test drive doesn’t reserve the car. It may be sold before your visit.</li>
          </ul>
          <p className="px-1 text-[11px] text-slate-400">*Estimate at {settings.loan_rate_employed}% a year for employed applicants. Final terms depend on the bank.</p>
        </div>
      </div>

      {(vehicle.similar ?? []).length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-extrabold text-slate-900">You might also like</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{vehicle.similar.map((v) => <VehicleCard key={v.id} vehicle={v} />)}</div>
        </section>
      )}

      {actions && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(15,23,42,.25)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-500">{vehicle.year} {vehicle.make} {vehicle.model}</p>
              <p className="font-extrabold text-slate-900">{peso(price)}</p>
            </div>
            <button onClick={() => navigate(`/test-drive?vehicle_id=${vehicle.id}`)} className="rdg-btn-ghost px-3" aria-label="Book test drive"><CalendarCheck size={17} /></button>
            <button onClick={() => navigate(`/reservation?vehicle_id=${vehicle.id}&payment=cash`)} className="rdg-btn">Reserve</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
