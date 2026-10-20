import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Viewer360 from '../../components/vehicles/Viewer360'
import PageLoader from '../../components/ui/PageLoader'
import { Star, Gauge, BadgeCheck, Banknote, Landmark, CalendarCheck } from 'lucide-react'

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [vehicle, setVehicle] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    apiClient.get(`/vehicles/${id}`).then(({ data }) => setVehicle(data))
  }, [id])

  useEffect(() => {
    if (user?.role !== 'buyer') return
    apiClient.get('/buyer/garage').then(({ data }) => {
      setSaved((data.saved_vehicles ?? []).some((v) => String(v.id) === id))
    })
  }, [user, id])

  async function toggleSaved() {
    if (saved) {
      await apiClient.delete(`/buyer/saved-vehicles/${id}`)
    } else {
      await apiClient.post(`/buyer/saved-vehicles/${id}`)
    }
    setSaved(!saved)
  }

  if (!vehicle) return <PageLoader />

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
      <div className="rdg-card overflow-hidden p-3">
        <Viewer360 vehicle={vehicle} />
      </div>

      <div className="rdg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">{vehicle.year}</p>
            <h1 className="no-bar block">{vehicle.make} {vehicle.model}</h1>
          </div>
          {user?.role === 'buyer' && (
            <button
              onClick={toggleSaved}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${
                saved ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-300 text-slate-600 hover:border-emerald-400'
              }`}
            >
              <Star size={15} className={saved ? 'fill-amber-400 text-amber-500' : ''} /> {saved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400"><Gauge size={13} /> Mileage</p>
            <p className="mt-1 font-bold text-slate-800">{vehicle.mileage != null ? `${Number(vehicle.mileage).toLocaleString()} km` : '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400"><BadgeCheck size={13} /> Status</p>
            <p className="mt-1 font-bold capitalize text-slate-800">{vehicle.status ?? 'available'}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-50">Selling price</p>
          <p className="text-3xl font-extrabold">₱{Number(vehicle.selling_price).toLocaleString()}</p>
        </div>

        {/* Straight Cash vs. Bank Financing payment path selection */}
        <div className="mt-5 grid gap-2.5">
          <button onClick={() => navigate(`/reservation?vehicle_id=${vehicle.id}&payment=cash`)} className="rdg-btn py-3">
            <Banknote size={18} /> Reserve — Straight Cash
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => navigate(`/financing-application?vehicle_id=${vehicle.id}`)} className="rdg-btn-dark">
              <Landmark size={16} /> Bank Financing
            </button>
            <button onClick={() => navigate(`/test-drive?vehicle_id=${vehicle.id}`)} className="rdg-btn-ghost">
              <CalendarCheck size={16} /> Test Drive
            </button>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Scheduling a test drive doesn&apos;t reserve this vehicle. It may still be sold or reserved
          by another buyer before your scheduled time.
        </p>
      </div>
    </div>
  )
}
