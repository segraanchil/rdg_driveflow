import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Rotate3d, Landmark, CalendarCheck, CarFront, ShieldCheck, BadgeCheck, Sparkles } from 'lucide-react'
import apiClient from '../../api/client'
import VehicleCard from '../../components/vehicles/VehicleCard'

const FEATURES = [
  { icon: Rotate3d, title: '360° virtual showroom', text: 'Drag to rotate every car and inspect it from home before you visit.' },
  { icon: Landmark, title: 'Bank financing', text: 'Apply online with a checklist made for your employment type.' },
  { icon: CalendarCheck, title: 'Test drive or reserve', text: 'Book a test drive, or reserve with proof of payment and a 48-hour hold.' },
  { icon: CarFront, title: 'Sell your car', text: 'Submit your vehicle for a dealership appraisal and track the offer.' },
]

export default function Home() {
  const [featured, setFeatured] = useState(null)

  useEffect(() => {
    apiClient
      .get('/vehicles', { silent: true })
      .then(({ data }) => setFeatured((data.data ?? []).slice(0, 3)))
      .catch(() => setFeatured([]))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="rdg-pattern absolute inset-0 opacity-40" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-rdg-fade-up">
            <span className="rdg-chip bg-emerald-500/15 text-emerald-300"><Sparkles size={12} /> Quezon City&apos;s trusted secondhand dealer</span>
            <h1 className="no-bar mt-4 block text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              Drive home your next car with <span className="text-emerald-400">confidence</span>.
            </h1>
            <p className="mt-4 max-w-md text-slate-300">
              Inspected secondhand vehicles, transparent pricing, and a 360° showroom you can browse from your phone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/inventory" className="rdg-btn px-6 py-3 text-base">Browse Inventory <ArrowRight size={18} /></Link>
              <Link to="/loan-calculator" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10">
                Estimate a loan
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-300">
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400" /> 1-month money-back guarantee</span>
              <span className="flex items-center gap-2"><BadgeCheck size={16} className="text-emerald-400" /> Legal documents ready on sale</span>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lift backdrop-blur">
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900">
                <CarFront size={140} strokeWidth={1.2} className="text-emerald-400/80" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">Virtual showroom</p>
                  <p className="font-bold">Drag to rotate 360°</p>
                </div>
                <Rotate3d className="text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rdg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Icon size={21} /></span>
              <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured vehicles */}
      <section className="rdg-pattern border-y border-slate-200 bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Fresh on the lot</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Featured vehicles</h2>
            </div>
            <Link to="/inventory" className="flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800">View all <ArrowRight size={16} /></Link>
          </div>
          {featured === null ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="rdg-skeleton h-72 rounded-2xl" />)}</div>
          ) : featured.length === 0 ? (
            <div className="rdg-card p-10 text-center text-slate-500">New arrivals are being prepared. Check back soon!</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((v) => <VehicleCard key={v.id} vehicle={v} />)}</div>
          )}
        </div>
      </section>

      {/* Sell CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-white shadow-lift md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Selling your car?</h2>
            <p className="mt-1 text-emerald-50">Get a dealership appraisal without the hassle of private buyers.</p>
          </div>
          <Link to="/sell-your-car" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-emerald-700 hover:bg-emerald-50">
            Submit your car <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}
