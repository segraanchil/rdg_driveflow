import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, CarFront, X } from 'lucide-react'
import apiClient from '../../api/client'
import VehicleCard from '../../components/vehicles/VehicleCard'

const EMPTY = { make: '', model: '', min_price: '', max_price: '' }

export default function Inventory() {
  const [vehicles, setVehicles] = useState([])
  const [filters, setFilters] = useState(EMPTY)
  const [loading, setLoading] = useState(true)

  // Wait until typing pauses before searching, instead of calling the server on every keystroke.
  useEffect(() => {
    setLoading(true)
    const id = setTimeout(() => {
      apiClient
        .get('/vehicles', { params: filters })
        .then(({ data }) => setVehicles(data.data ?? []))
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(id)
  }, [filters])

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))
  const active = Object.values(filters).some(Boolean)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Every car is inspected and priced transparently. Tap one to view it in 360°.</p>
        </div>
        {!loading && <span className="rdg-chip bg-emerald-50 text-emerald-700">{vehicles.length} vehicle{vehicles.length === 1 ? '' : 's'}</span>}
      </div>

      <div className="rdg-card mb-6 p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><SlidersHorizontal size={14} /> Find your car</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Make (e.g. Toyota)" className="w-full pl-9 text-sm" value={filters.make} onChange={set('make')} />
          </label>
          <input placeholder="Model (e.g. Vios)" className="w-full text-sm" value={filters.model} onChange={set('model')} />
          <input placeholder="Min budget (₱)" type="number" min="0" className="w-full text-sm" value={filters.min_price} onChange={set('min_price')} />
          <input placeholder="Max budget (₱)" type="number" min="0" className="w-full text-sm" value={filters.max_price} onChange={set('max_price')} />
        </div>
        {active && (
          <button onClick={() => setFilters(EMPTY)} className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800">
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="rdg-skeleton h-72 rounded-2xl" />)}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rdg-card flex flex-col items-center p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CarFront size={28} /></span>
          <p className="mt-4 font-bold text-slate-800">{active ? 'No cars match those filters' : 'No cars listed yet'}</p>
          <p className="mt-1 text-sm text-slate-500">{active ? 'Try a wider budget or a different make.' : 'New arrivals are on the way. Check back soon!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}
        </div>
      )}
    </div>
  )
}
