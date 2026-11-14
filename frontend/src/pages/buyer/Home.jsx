import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Landmark, ShieldCheck, BadgeCheck, Sparkles, Search, FileCheck2, KeyRound, Clock, Rotate3d, ChevronDown, Calculator, CarFront,
} from 'lucide-react'
import apiClient from '../../api/client'
import VehicleCard from '../../components/vehicles/VehicleCard'
import Viewer360 from '../../components/vehicles/Viewer360'
import Logo from '../../components/ui/Logo'
import { estimateMonthlyAmortization } from '../../lib/loanCalculator'
import { useSettings } from '../../lib/useSettings'
import { peso } from '../../lib/format'

const BUDGETS = [
  ['Under ₱500K', 500000, 'First cars and city drivers'],
  ['Under ₱750K', 750000, 'Sedans and compact SUVs'],
  ['Under ₱1M', 1000000, 'Family MPVs and SUVs'],
  ['₱1M and up', null, 'Premium picks'],
]
const TYPES = ['Sedan', 'Hatchback', 'MPV', 'SUV', 'Pickup', 'Van']

const PERKS = [
  [BadgeCheck, 'Inspected units', 'Every car is checked before it reaches the lot.'],
  [ShieldCheck, '1-month money-back', 'Report a problem within a month, we make it right.'],
  [Landmark, 'Bank financing', 'Apply online with a checklist for your job type.'],
  [Clock, '48-hour online hold', 'Reserve now, verify later. No one else can take it.'],
]

const STEPS = [
  { icon: Search, title: 'Find your car', text: 'Filter by brand, budget and specs, then spin it in 360° and look inside the cabin.' },
  { icon: Landmark, title: 'Choose how to pay', text: 'Straight cash, or apply for bank financing with requirements made for your job.' },
  { icon: FileCheck2, title: 'Reserve online', text: 'Pay the reservation fee by GCash or bank transfer and upload your receipt.' },
  { icon: KeyRound, title: 'Drive it home', text: 'Your invoice, Deed of Sale and Official Receipt are ready when you claim the car.' },
]

const FAQ = [
  ['Can I see the car before buying?', 'Yes. Spin it in 360° here first, then book a free test drive from the car’s page. Our staff confirms the schedule by email.'],
  ['How does reserving work?', 'Pay the reservation fee via GCash or bank transfer and upload your receipt. The car is held for you right away for 48 hours while we verify the payment. The fee is deducted from the price.'],
  ['What do I need for bank financing?', 'It depends on your work (employed, OFW or business owner). Open the loan calculator and pick your profile to see the exact documents, how many, and what kind.'],
  ['What if something is wrong after I buy?', 'Every car has a 1-month money-back guarantee. File a warranty claim with photos from My Garage and track it with your ticket number.'],
  ['Do you buy cars?', 'Yes. Submit your car in Sell Your Car with a few photos and our appraiser will send you an offer you can accept or decline online.'],
]

export default function Home() {
  const navigate = useNavigate()
  const settings = useSettings()
  const [featured, setFeatured] = useState(null)
  const [hero, setHero] = useState(undefined)
  const [facets, setFacets] = useState(null)
  const [query, setQuery] = useState('')
  const [budget, setBudget] = useState(800000)

  useEffect(() => {
    apiClient.get('/vehicles', { params: { per_page: 6 }, silent: true }).then(({ data }) => {
      const list = data.data ?? []
      setFeatured(list)
      const spin = list.find((v) => v.frames_count > 1) ?? list[0]
      if (spin) apiClient.get(`/vehicles/${spin.id}`, { silent: true }).then(({ data: v }) => setHero(v)).catch(() => setHero(null))
      else setHero(null)
    }).catch(() => { setFeatured([]); setHero(null) })
    apiClient.get('/vehicles/facets', { silent: true }).then(({ data }) => setFacets(data)).catch(() => {})
  }, [])

  function search(e) {
    e.preventDefault()
    navigate(query.trim() ? `/inventory?q=${encodeURIComponent(query.trim())}` : '/inventory')
  }

  const monthly = estimateMonthlyAmortization({ vehiclePrice: budget, downPayment: budget * 0.2, termMonths: 60, annualInterestRate: Number(settings.loan_rate_employed) })

  return (
    <div>
      {/* Hero: search on the left, a car you can actually spin on the right */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 opacity-[.06] [background-image:repeating-linear-gradient(135deg,#fff_0_1px,transparent_1px_16px)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[1fr_1.1fr] lg:py-16">
          <div className="animate-rdg-fade-up">
            <span className="rdg-chip bg-white/10 text-slate-200"><Sparkles size={12} /> Quezon City&apos;s trusted secondhand dealer</span>
            <h1 className="no-bar mt-4 block font-display text-5xl font-bold uppercase italic leading-[.95] tracking-wide text-white md:text-7xl">
              Drive home your next car with <span className="underline decoration-white/40 decoration-4 underline-offset-8">confidence</span>.
            </h1>
            <p className="mt-4 max-w-md text-slate-300">Inspected secondhand cars with transparent prices. Spin every car in 360°, look inside the cabin, and reserve online.</p>

            <form onSubmit={search} className="mt-7 flex max-w-md gap-2 rounded-2xl bg-white p-1.5 shadow-lift">
              <label className="relative flex-1">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try “Vios” or “Innova”" aria-label="Search cars" className="w-full border-0 pl-10 text-sm shadow-none focus:ring-0" />
              </label>
              <button className="rdg-btn px-5">Search</button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {(facets?.makes ?? []).slice(0, 5).map((m) => (
                <Link key={m} to={`/inventory?make=${encodeURIComponent(m)}`} className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-white hover:text-white">{m}</Link>
              ))}
            </div>
            {facets?.total > 0 && (
              <p className="mt-6 text-sm text-slate-400"><strong className="text-white">{facets.total}</strong> {facets.total === 1 ? 'car' : 'cars'} on the lot right now, from <strong className="text-white">{peso(facets.price.min)}</strong></p>
            )}
          </div>

          <div className="animate-rdg-fade-up">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-lift backdrop-blur">
              {hero === undefined ? (
                <div className="rdg-skeleton aspect-[16/10] rounded-xl bg-white/10" />
              ) : hero ? (
                <>
                  <Viewer360 vehicle={hero} compact autoSpin />
                  <div className="mt-3 flex items-center justify-between gap-3 px-1">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-400"><Rotate3d size={13} /> Drag the car to rotate it</p>
                      <p className="truncate font-bold">{hero.year} {hero.make} {hero.model} · <span className="text-slate-300">{peso(hero.selling_price)}</span></p>
                    </div>
                    <Link to={`/inventory/${hero.id}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100">View car <ArrowRight size={16} /></Link>
                  </div>
                </>
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-10"><Logo onDark className="h-auto w-full max-w-sm" /></div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Why RDG */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(([Icon, title, text]) => (
            <div key={title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><Icon size={19} /></span>
              <span><span className="block font-bold text-slate-900">{title}</span><span className="text-sm text-slate-500">{text}</span></span>
            </div>
          ))}
        </div>
      </section>

      {/* Latest arrivals */}
      <section className="rdg-pattern">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <SectionTitle kicker="Fresh on the lot" title="Latest arrivals" link={<Link to="/inventory" className="flex items-center gap-1 text-sm font-bold text-slate-900 hover:underline">View all cars <ArrowRight size={16} /></Link>} />
          {featured === null ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="rdg-skeleton h-80 rounded-2xl" />)}</div>
          ) : featured.length === 0 ? (
            <div className="rdg-card p-10 text-center text-slate-500">New arrivals are being prepared. Check back soon!</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map((v) => <VehicleCard key={v.id} vehicle={v} />)}</div>
          )}
        </div>
      </section>

      {/* Shop by budget / type */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <SectionTitle kicker="Shop your way" title="What’s your budget?" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BUDGETS.map(([label, max, hint]) => (
              <Link key={label} to={max ? `/inventory?max_price=${max}` : '/inventory?min_price=1000000'} className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-slate-900 hover:shadow-lift">
                <p className="font-display text-2xl font-bold uppercase italic tracking-wide text-slate-900">{label}</p>
                <p className="mt-1 text-sm text-slate-500">{hint}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-slate-900">Browse <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-slate-500">Or by body type:</span>
            {TYPES.map((t) => <Link key={t} to={`/inventory?body_type=${t}`} className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-900 hover:text-white">{t}</Link>)}
          </div>
        </div>
      </section>

      {/* How it works + financing teaser */}
      <section className="rdg-pattern">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionTitle kicker="How it works" title="From browsing to driving" />
            <ol className="grid gap-3 sm:grid-cols-2">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="rdg-card relative p-5">
                  <span className="absolute right-4 top-3 font-display text-4xl font-bold italic text-slate-200">{i + 1}</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white"><Icon size={19} /></span>
                  <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{text}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="self-start rounded-3xl bg-slate-900 p-6 text-white shadow-lift">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Calculator size={14} /> Quick estimate</p>
            <p className="mt-2 text-sm text-slate-300">If the car costs</p>
            <p className="font-display text-4xl font-bold italic">{peso(budget)}</p>
            <input type="range" min={300000} max={2500000} step={25000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} aria-label="Car price" className="mt-3 w-full [accent-color:#fff]" />
            <p className="mt-4 text-sm text-slate-300">you could pay about</p>
            <p className="font-display text-4xl font-bold italic">{peso(monthly)}<span className="text-lg text-slate-400"> /month</span></p>
            <p className="mt-1 text-xs text-slate-400">20% down, 60 months, {settings.loan_rate_employed}% a year (employed). Estimate only.</p>
            <div className="mt-5 grid gap-2">
              <Link to={`/inventory?max_price=${budget}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100">See cars in this budget</Link>
              <Link to="/loan-calculator" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">Full calculator &amp; requirements</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <SectionTitle kicker="Good to know" title="Questions buyers ask" />
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                  {q}
                  <ChevronDown size={18} className="shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Sell CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-8 text-white shadow-lift md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <span className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-white/10 sm:flex"><CarFront size={28} /></span>
            <div>
              <h2 className="font-display text-3xl font-bold uppercase italic tracking-wide text-white">Selling your car?</h2>
              <p className="mt-1 text-slate-300">Send a few photos and get a dealership offer. No haggling with strangers.</p>
            </div>
          </div>
          <Link to="/sell-your-car" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-slate-900 hover:bg-slate-100">Get an offer <ArrowRight size={18} /></Link>
        </div>
      </section>
    </div>
  )
}

function SectionTitle({ kicker, title, link }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{kicker}</p>
        <h2 className="font-display text-3xl font-bold uppercase italic tracking-wide text-slate-900">{title}</h2>
      </div>
      {link}
    </div>
  )
}
