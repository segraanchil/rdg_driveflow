import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Calculator, Landmark, Info, ArrowRight } from 'lucide-react'
import apiClient from '../../api/client'
import { estimateMonthlyAmortization } from '../../lib/loanCalculator'
import { loanRateFor, useSettings } from '../../lib/useSettings'
import { PROFILE_LABELS, peso, vehicleName } from '../../lib/format'

const TERMS = [12, 24, 36, 48, 60]
const DOWN_PCTS = [20, 30, 40, 50]

/** Auto-loan calculator (Story 06): down payment, 12–60 month terms, rate by employment profile. */
export default function LoanCalculator() {
  const [params] = useSearchParams()
  const vehicleId = params.get('vehicle_id')
  const settings = useSettings()

  const [vehicle, setVehicle] = useState(null)
  const [price, setPrice] = useState(800000)
  const [down, setDown] = useState(160000)
  const [term, setTerm] = useState(36)
  const [profile, setProfile] = useState('employed')

  useEffect(() => {
    if (!vehicleId) return
    apiClient.get(`/vehicles/${vehicleId}`).then(({ data }) => {
      setVehicle(data)
      const p = Number(data.selling_price)
      setPrice(p)
      setDown(Math.round(p * 0.2))
    }).catch(() => {})
  }, [vehicleId])

  const rate = loanRateFor(settings, profile)
  const safeDown = Math.min(down, price)
  const principal = Math.max(0, price - safeDown)
  const monthly = estimateMonthlyAmortization({ vehiclePrice: price, downPayment: safeDown, termMonths: term, annualInterestRate: rate })
  const totalInterest = Math.max(0, monthly * term - principal)
  const downPct = price > 0 ? Math.round((safeDown / price) * 100) : 0
  const interestShare = monthly * term > 0 ? (totalInterest / (monthly * term)) * 100 : 0

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1>Loan Calculator</h1>
        <p className="mt-1 text-sm text-slate-500">{vehicle ? <>For the <strong className="text-slate-700">{vehicleName(vehicle)}</strong>. </> : null}Adjust the down payment and term to see your estimated monthly amortization.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rdg-card space-y-6 p-6">
          <div>
            <span className="rdg-label">Your employment</span>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PROFILE_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setProfile(key)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${profile === key ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
                  {label}
                  <span className="block text-[11px] font-normal text-slate-500">{loanRateFor(settings, key)}% / yr</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="rdg-label">Vehicle price (₱)</span>
            <input type="number" min="0" step="1000" value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} disabled={Boolean(vehicle)} className="w-full text-lg font-bold" />
          </label>

          <div>
            <div className="flex items-end justify-between"><span className="rdg-label">Down payment</span><span className="text-sm font-bold text-slate-900">{peso(safeDown)} <span className="font-normal text-slate-500">({downPct}%)</span></span></div>
            <input type="range" min={0} max={price} step={5000} value={safeDown} onChange={(e) => setDown(Number(e.target.value))} className="w-full" aria-label="Down payment" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DOWN_PCTS.map((p) => (
                <button key={p} onClick={() => setDown(Math.round((price * p) / 100))} className={`rounded-full px-3 py-1 text-xs font-semibold ${downPct === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{p}%</button>
              ))}
            </div>
          </div>

          <div>
            <span className="rdg-label">Term</span>
            <div className="grid grid-cols-5 gap-2">
              {TERMS.map((t) => (
                <button key={t} onClick={() => setTerm(t)} className={`rounded-lg border py-2 text-sm font-bold ${term === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
                  {t}<span className="block text-[10px] font-normal opacity-70">months</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lift">
            <div className="p-6">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300"><Calculator size={14} /> Estimated monthly</p>
              <p className="mt-1 text-4xl font-extrabold tabular-nums">{peso(monthly)}</p>
              <p className="text-sm text-slate-400">for {term} months at {rate}% a year</p>
            </div>
            <dl className="space-y-2 border-t border-white/10 p-6 text-sm">
              <Row label="Vehicle price" value={peso(price)} />
              <Row label="Down payment" value={`− ${peso(safeDown)}`} />
              <Row label="Amount financed" value={peso(principal)} strong />
              <Row label="Total interest" value={peso(totalInterest)} />
              <Row label="Total you’ll pay" value={peso(monthly * term + safeDown)} strong />
            </dl>
            <div className="px-6 pb-6">
              <div className="flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <span className="bg-emerald-400" style={{ width: `${100 - interestShare}%` }} />
                <span className="bg-amber-400" style={{ width: `${interestShare}%` }} />
              </div>
              <p className="mt-2 flex gap-4 text-[11px] text-slate-400"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> Principal</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> Interest ({Math.round(interestShare)}%)</span></p>
            </div>
          </div>

          {vehicle ? (
            vehicle.status === 'available' && (
              <Link to={`/financing-application?vehicle_id=${vehicle.id}&profile=${profile}&term=${term}&down=${safeDown}`} className="rdg-btn w-full py-3"><Landmark size={17} /> Apply for financing with these terms</Link>
            )
          ) : (
            <Link to="/inventory" className="rdg-btn w-full py-3">Find a car in this budget <ArrowRight size={17} /></Link>
          )}
          <p className="flex gap-2 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" /> This is an estimate. The partner bank sets the final rate and terms after reviewing your application.</p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-bold text-white' : 'text-slate-300'}`}>
      <dt>{label}</dt><dd className="tabular-nums">{value}</dd>
    </div>
  )
}
