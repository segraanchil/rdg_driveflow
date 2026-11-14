import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, CarFront, X } from 'lucide-react'
import apiClient from '../../api/client'
import VehicleCard from '../../components/vehicles/VehicleCard'
import { Modal } from '../../components/ui/Modal'
import { peso } from '../../lib/format'
import Select from '../../components/ui/Select'

const FILTER_KEYS = ['q', 'make', 'min_price', 'max_price', 'min_year', 'transmission', 'fuel_type', 'body_type']
const SORTS = [
  ['newest', 'Newest arrivals'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['mileage_asc', 'Lowest mileage'],
  ['year_desc', 'Newest model year'],
]
const BUDGETS = [['', 'Any budget'], ['500000', 'Up to ₱500K'], ['750000', 'Up to ₱750K'], ['1000000', 'Up to ₱1M'], ['1500000', 'Up to ₱1.5M']]

/** Browse & filter (Story 04). Filters live in the URL so results can be shared and survive "back". */
export default function Inventory() {
  const [params, setParams] = useSearchParams()
  const [vehicles, setVehicles] = useState([])
  const [meta, setMeta] = useState({ total: 0, last_page: 1, current_page: 1 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [facets, setFacets] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const [q, setQ] = useState(params.get('q') ?? '')

  const filters = useMemo(() => Object.fromEntries([...FILTER_KEYS, 'sort'].map((k) => [k, params.get(k) ?? ''])), [params])
  const activeCount = FILTER_KEYS.filter((k) => filters[k]).length

  useEffect(() => {
    apiClient.get('/vehicles/facets', { silent: true }).then(({ data }) => setFacets(data)).catch(() => {})
  }, [])

  // Debounce the free-text box into the URL.
  useEffect(() => {
    const id = setTimeout(() => q !== (params.get('q') ?? '') && update({ q }), 350)
    return () => clearTimeout(id)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true)
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    apiClient.get('/vehicles', { params: { ...query, per_page: 12 } }).then(({ data }) => {
      setVehicles(data.data ?? [])
      setMeta({ total: data.total, last_page: data.last_page, current_page: data.current_page })
    }).finally(() => setLoading(false))
  }, [filters])

  function update(patch) {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true })
  }

  function clearAll() {
    setQ('')
    setParams(filters.sort ? { sort: filters.sort } : {}, { replace: true })
  }

  async function loadMore() {
    setLoadingMore(true)
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    const { data } = await apiClient.get('/vehicles', { params: { ...query, per_page: 12, page: meta.current_page + 1 } }).finally(() => setLoadingMore(false))
    setVehicles((v) => [...v, ...(data.data ?? [])])
    setMeta({ total: data.total, last_page: data.last_page, current_page: data.current_page })
  }

  const chips = [
    filters.make && ['make', filters.make],
    filters.max_price && ['max_price', `Up to ${peso(filters.max_price)}`],
    filters.min_price && ['min_price', `From ${peso(filters.min_price)}`],
    filters.min_year && ['min_year', `${filters.min_year} or newer`],
    filters.transmission && ['transmission', filters.transmission],
    filters.fuel_type && ['fuel_type', filters.fuel_type],
    filters.body_type && ['body_type', filters.body_type],
  ].filter(Boolean)

  const filterPanel = (
    <div className="space-y-4">
      <FilterSelect label="Brand" value={filters.make} onChange={(v) => update({ make: v })} options={[['', 'All brands'], ...(facets?.makes ?? []).map((m) => [m, m])]} />
      <FilterSelect label="Budget" value={filters.max_price} onChange={(v) => update({ max_price: v })} options={BUDGETS} />
      <div>
        <span className="rdg-label">Price range (₱)</span>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min="0" placeholder="Min" value={filters.min_price} onChange={(e) => update({ min_price: e.target.value })} className="w-full text-sm" />
          <input type="number" min="0" placeholder="Max" value={filters.max_price} onChange={(e) => update({ max_price: e.target.value })} className="w-full text-sm" />
        </div>
      </div>
      <FilterSelect label="Model year" value={filters.min_year} onChange={(v) => update({ min_year: v })}
        options={[['', 'Any year'], ...yearOptions(facets?.years)]} />
      {(facets?.transmissions ?? []).length > 0 && <Pills label="Transmission" value={filters.transmission} onChange={(v) => update({ transmission: v })} options={facets.transmissions} />}
      {(facets?.fuel_types ?? []).length > 0 && <Pills label="Fuel" value={filters.fuel_type} onChange={(v) => update({ fuel_type: v })} options={facets.fuel_types} />}
      {(facets?.body_types ?? []).length > 0 && <Pills label="Body type" value={filters.body_type} onChange={(v) => update({ body_type: v })} options={facets.body_types} />}
      {activeCount > 0 && <button onClick={clearAll} className="flex items-center gap-1 text-sm font-bold text-emerald-700 hover:underline"><X size={14} /> Clear all filters</button>}
    </div>
  )

  return (
    <div>
      <div className="mb-5">
        <h1>Browse Cars</h1>
        <p className="mt-1 text-sm text-slate-500">Every car is inspected and priced transparently. Open one to inspect it in 360°.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand, model or year…" aria-label="Search cars" className="w-full py-2.5 pl-10 text-sm" />
        </label>
        <button onClick={() => setDrawer(true)} className="rdg-btn-ghost lg:hidden"><SlidersHorizontal size={16} /> Filters{activeCount > 0 && <span className="rounded-full bg-emerald-500 px-1.5 text-[11px] text-white">{activeCount}</span>}</button>
        <Select value={filters.sort || 'newest'} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })} aria-label="Sort" className="text-sm">
          {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="rdg-card sticky top-24 p-4">
            <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><SlidersHorizontal size={14} /> Filters</p>
            {filterPanel}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="mr-2 text-sm text-slate-500">{loading ? 'Searching…' : <><strong className="text-slate-900">{meta.total}</strong> car{meta.total === 1 ? '' : 's'} found</>}</p>
            {chips.map(([key, label]) => (
              <button key={key} onClick={() => update({ [key]: '' })} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">{label} <X size={12} /></button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="rdg-skeleton h-80 rounded-2xl" />)}</div>
          ) : vehicles.length === 0 ? (
            <div className="rdg-card flex flex-col items-center p-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CarFront size={28} /></span>
              <p className="mt-4 font-bold text-slate-800">{activeCount ? 'No cars match those filters' : 'No cars listed yet'}</p>
              <p className="mt-1 text-sm text-slate-500">{activeCount ? 'Try a wider budget or a different brand.' : 'New arrivals are on the way. Check back soon!'}</p>
              {activeCount > 0 && <button onClick={clearAll} className="rdg-btn mt-5">Clear filters</button>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)}</div>
              {meta.current_page < meta.last_page && (
                <div className="mt-8 text-center">
                  <button onClick={loadMore} disabled={loadingMore} className="rdg-btn-ghost px-8">{loadingMore ? 'Loading…' : `Show more (${meta.total - vehicles.length} left)`}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={drawer} onClose={() => setDrawer(false)} title="Filters" footer={<button onClick={() => setDrawer(false)} className="rdg-btn w-full">Show {meta.total} car{meta.total === 1 ? '' : 's'}</button>}>
        {filterPanel}
      </Modal>
    </div>
  )
}

function yearOptions(years) {
  if (!years?.min) return []
  const out = []
  for (let y = years.max; y >= years.min; y--) out.push([String(y), `${y} or newer`])
  return out
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="rdg-label">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-sm">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    </label>
  )
}

function Pills({ label, value, onChange, options }) {
  return (
    <div>
      <span className="rdg-label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(value === o ? '' : o)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${value === o ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{o}</button>
        ))}
      </div>
    </div>
  )
}
