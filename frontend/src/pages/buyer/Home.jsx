import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Rotate3d, Landmark, CalendarCheck, CarFront, ShieldCheck, BadgeCheck, Sparkles, Search, FileCheck2, KeyRound,
} from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import VehicleCard from '../../components/vehicles/VehicleCard'
import { peso, pesoCompact } from '../../lib/format'

const BUDGETS = [
  ['Under ₱500K', 500000],
  ['Under ₱750K', 750000],
  ['Under ₱1M', 1000000],
]

const STEPS = [
  { icon: Search, title: 'Find your car', text: 'Filter by brand, budget and specs, then inspect it in the 360° showroom.' },
  { icon: Landmark, title: 'Choose how to pay', text: 'Straight cash, or apply for bank financing with a checklist made for your job.' },
  { icon: FileCheck2, title: 'Reserve online', text: 'Pay the reservation fee, upload your receipt, and the car is held for you for 48 hours.' },
  { icon: KeyRound, title: 'Drive it home', text: 'Your invoice, Deed of Sale and Official Receipt are ready when you claim the car.' },
]

export default function Home() {
  const navigate = useNavigate()
  const [featured, setFeatured] = useState(null)
  const [facets, setFacets] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    apiClient.get('/vehicles', { params: { per_page: 6 }, silent: true }).then(({ data }) => setFeatured(data.data ?? [])).catch(() => setFeatured([]))
    apiClient.get('/vehicles/facets', { silent: true }).then(({ data }) => setFacets(data)).catch(() => {})
  }, [])

  const hero = featured?.find((v) => v.media?.[0])

  function search(e) {
    e.preventDefault()
    navigate(query.trim() ? `/inventory?q=${encodeURIComponent(query.trim())}` : '/inventory')
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="rdg-pattern absolute inset-0 opacity-40" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div className="animate-rdg-fade-up">
            <span className="rdg-chip bg-emerald-500/15 text-emerald-300"><Sparkles size={12} /> Quezon City&apos;s trusted secondhand dealer</span>
            <h1 className="no-bar mt-4 block text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              Drive home your next car with <span className="text-emerald-400">confidence</span>.
            </h1>
            <p className="mt-4 max-w-md text-slate-300">Inspected secondhand vehicles, transparent pricing, and a 360° showroom you can browse from your phone.</p>

            <form onSubmit={search} className="mt-7 flex max-w-md gap-2 rounded-2xl bg-white p-1.5 shadow-lift">
              <label className="relative flex-1">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a brand or model, e.g. Vios" aria-label="Search cars"
                  className="w-full border-0 pl-10 text-sm shadow-none focus:ring-0" />
              </label>
              <button className="rdg-btn px-5">Search</button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUDGETS.map(([label, max]) => (
                <Link key={max} to={`/inventory?max_price=${max}`} className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-400 hover:text-white">{label}</Link>
              ))}
              {(facets?.makes ?? []).slice(0, 4).map((m) => (
                <Link key={m} to={`/inventory?make=${encodeURIComponent(m)}`} className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-400 hover:text-white">{m}</Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-300">
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400" /> 1-month money-back guarantee</span>
              <span className="flex items-center gap-2"><BadgeCheck size={16} className="text-emerald-400" /> Legal documents ready on sale</span>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lift backdrop-blur">
              {hero ? (
                <Link to={`/inventory/${hero.id}`} className="group block">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-800">
                    <img src={backendUrl(`/storage/${hero.media[0].file_path}`)} alt={`${hero.year} ${hero.make} ${hero.model}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  </div>
                  <div className="mt-4 flex items-center justify-between px-1">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-400">Featured · {hero.year}</p>
                      <p className="font-bold">{hero.make} {hero.model}</p>
                    </div>
                    <p className="text-xl font-extrabold text-emerald-400">{peso(hero.selling_price)}</p>
                  </div>
                </Link>
              ) : (
                <>
                  <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900"><CarFront size={140} strokeWidth={1.2} className="text-emerald-400/80" /></div>
                  <div className="mt-4 flex items-center justify-between px-1">
                    <div><p className="text-xs uppercase tracking-wider text-slate-400">Virtual showroom</p><p className="font-bold">Drag to rotate 360°</p></div>
                    <Rotate3d className="text-emerald-400" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Numbers */}
      {facets && facets.total > 0 && (
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-slate-100 px-4 py-5 text-center">
            <div><p className="text-2xl font-extrabold text-slate-900">{facets.total}</p><p className="text-xs font-semibold text-slate-500">cars available</p></div>
            <div><p className="text-2xl font-extrabold text-slate-900">{peso(facets.price.min)}</p><p className="text-xs font-semibold text-slate-500">starting price</p></div>
            <div><p className="text-2xl font-extrabold text-slate-900">{facets.makes.length}</p><p className="text-xs font-semibold text-slate-500">brand{facets.makes.length === 1 ? '' : 's'} to choose from</p></div>
          </div>
        </section>
      )}

      {/* Featured vehicles */}
      <section className="rdg-pattern">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Fresh on the lot</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Latest arrivals</h2>
            </div>
            <Link to="/inventory" className="flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800">View all <ArrowRight size={16} /></Link>
          </div>
          {featured === null ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="rdg-skeleton h-72 rounded-2xl" />)}</div>
          ) : featured.length === 0 ? (
            <div className="rdg-card p-10 text-center text-slate-500">New arrivals are being prepared. Check back soon!</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map((v) => <VehicleCard key={v.id} vehicle={v} />)}</div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">How it works</p>
          <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-slate-900">From browsing to driving, online</h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl bg-slate-50 p-5">
                <span className="absolute right-4 top-4 text-3xl font-extrabold text-slate-200">{i + 1}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white"><Icon size={20} /></span>
                <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/inventory" className="rdg-btn px-6 py-3">Browse cars <ArrowRight size={18} /></Link>
            <Link to="/loan-calculator" className="rdg-btn-ghost px-6 py-3"><CalendarCheck size={17} /> Estimate my monthly payment</Link>
          </div>
        </div>
      </section>

      {/* Sell CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-white shadow-lift md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Selling your car?</h2>
            <p className="mt-1 text-emerald-50">Get a dealership appraisal and an offer without the hassle of private buyers.</p>
          </div>
          <Link to="/sell-your-car" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-emerald-700 hover:bg-emerald-50">Submit your car <ArrowRight size={18} /></Link>
        </div>
      </section>
    </div>
  )
}
