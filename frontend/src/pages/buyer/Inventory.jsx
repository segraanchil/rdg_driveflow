import { useEffect, useState } from 'react'
import apiClient from '../../api/client'
import VehicleCard from '../../components/vehicles/VehicleCard'

export default function Inventory() {
  const [vehicles, setVehicles] = useState([])
  const [filters, setFilters] = useState({ make: '', model: '', min_price: '', max_price: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiClient
      .get('/vehicles', { params: filters })
      .then(({ data }) => setVehicles(data.data ?? []))
      .finally(() => setLoading(false))
  }, [filters])

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-brand">Inventory</h1>

      {/* TODO: replace with real make/model dropdowns once inventory has enough variety to filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <input
          placeholder="Make"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={filters.make}
          onChange={(e) => setFilters((f) => ({ ...f, make: e.target.value }))}
        />
        <input
          placeholder="Model"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={filters.model}
          onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value }))}
        />
        <input
          placeholder="Min budget"
          type="number"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={filters.min_price}
          onChange={(e) => setFilters((f) => ({ ...f, min_price: e.target.value }))}
        />
        <input
          placeholder="Max budget"
          type="number"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={filters.max_price}
          onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))}
        />
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  )
}
