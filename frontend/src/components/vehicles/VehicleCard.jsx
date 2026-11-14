import { Link } from 'react-router-dom'
import { Gauge, Rotate3d, CarFront, Cog, Fuel } from 'lucide-react'
import { backendUrl } from '../../api/client'
import { estimateMonthlyAmortization } from '../../lib/loanCalculator'
import { useSettings } from '../../lib/useSettings'
import { km, peso } from '../../lib/format'

const STATUS_CHIP = {
  reserved: ['Reserved', 'bg-amber-500 text-white'],
  sold: ['Sold', 'bg-slate-700 text-white'],
  under_repair: ['Coming soon', 'bg-violet-600 text-white'],
}

export default function VehicleCard({ vehicle }) {
  const settings = useSettings()
  const thumbnail = vehicle.media?.[0]?.file_path
  const has360 = (vehicle.frames_count ?? (vehicle.media ?? []).filter((m) => m.type === '360_frame').length) > 1
  const price = Number(vehicle.selling_price)
  // "From ₱X/mo": 20% down over 60 months at the employed rate, the same estimate the calculator starts with.
  const monthly = estimateMonthlyAmortization({ vehiclePrice: price, downPayment: price * 0.2, termMonths: 60, annualInterestRate: Number(settings.loan_rate_employed) })
  const chip = STATUS_CHIP[vehicle.status]

  return (
    <Link to={`/inventory/${vehicle.id}`} className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {thumbnail ? (
          <img src={backendUrl(`/storage/${thumbnail}`)} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} loading="lazy" decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400"><CarFront size={40} strokeWidth={1.4} /><span className="text-xs">Photos coming soon</span></div>
        )}
        {chip && <span className={`rdg-chip absolute left-3 top-3 ${chip[1]}`}>{chip[0]}</span>}
        {has360 && <span className="rdg-chip absolute right-3 top-3 bg-slate-900/80 text-white backdrop-blur"><Rotate3d size={12} /> 360°</span>}
      </div>
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{vehicle.year}</p>
        <h3 className="truncate text-lg font-extrabold leading-tight text-slate-900">{vehicle.make} {vehicle.model}</h3>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Gauge size={13} /> {vehicle.mileage != null ? km(vehicle.mileage) : 'Mileage on request'}</span>
          {vehicle.transmission && <span className="flex items-center gap-1"><Cog size={13} /> {vehicle.transmission}</span>}
          {vehicle.fuel_type && <span className="flex items-center gap-1"><Fuel size={13} /> {vehicle.fuel_type}</span>}
        </p>
        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
          <p className="text-xl font-extrabold text-slate-900">{peso(price)}</p>
          {Number.isFinite(monthly) && monthly > 0 && <p className="text-right text-xs text-slate-500">from <strong className="text-emerald-700">{peso(monthly)}</strong>/mo</p>}
        </div>
      </div>
    </Link>
  )
}
