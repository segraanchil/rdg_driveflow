import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Viewer360 from '../../components/vehicles/Viewer360'

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

  if (!vehicle) return <p className="text-slate-400">Loading…</p>

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Viewer360 vehicle={vehicle} />

      <div>
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-brand">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          {user?.role === 'buyer' && (
            <button
              onClick={toggleSaved}
              className={`shrink-0 rounded border px-3 py-1 text-sm ${
                saved ? 'border-brand-accent bg-brand-accent text-white' : 'border-slate-300 text-slate-600'
              }`}
            >
              {saved ? '★ Saved' : '☆ Save'}
            </button>
          )}
        </div>
        <p className="text-slate-500">{vehicle.mileage?.toLocaleString()} km</p>
        <p className="mt-2 text-2xl font-bold text-brand-accent">
          ₱{Number(vehicle.selling_price).toLocaleString()}
        </p>

        {/* Straight Cash vs. Bank Financing payment path selection */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => navigate(`/reservation?vehicle_id=${vehicle.id}&payment=cash`)}
            className="rounded bg-brand px-4 py-2 text-white"
          >
            Reserve — Straight Cash
          </button>
          <button
            onClick={() => navigate(`/financing-application?vehicle_id=${vehicle.id}`)}
            className="rounded border border-brand px-4 py-2 text-brand"
          >
            Bank Financing
          </button>
          <button
            onClick={() => navigate(`/test-drive?vehicle_id=${vehicle.id}`)}
            className="rounded border border-slate-300 px-4 py-2 text-slate-600"
          >
            Schedule Test Drive
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Scheduling a test drive doesn't reserve this vehicle — it may still be sold or reserved
          by another buyer before your scheduled time.
        </p>
      </div>
    </div>
  )
}
