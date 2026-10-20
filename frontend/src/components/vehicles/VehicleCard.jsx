import { Link } from 'react-router-dom'
import { Gauge, Rotate3d, CarFront, ArrowRight } from 'lucide-react'
import { backendUrl } from '../../api/client'

const STATUS_CHIP = {
  available: 'bg-emerald-500 text-white',
  reserved: 'bg-amber-500 text-white',
  sold: 'bg-slate-700 text-white',
}

export default function VehicleCard({ vehicle }) {
  const thumbnail = vehicle.media?.[0]?.file_path
  const has360 = (vehicle.media ?? []).filter((m) => m.type === '360_frame').length > 1

  return (
    <Link
      to={`/inventory/${vehicle.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {thumbnail ? (
          <img
            src={backendUrl(`/storage/${thumbnail}`)}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
            <CarFront size={40} strokeWidth={1.4} />
            <span className="text-xs">Photos coming soon</span>
          </div>
        )}
        {vehicle.status && (
          <span className={`rdg-chip absolute left-3 top-3 ${STATUS_CHIP[vehicle.status] ?? 'bg-white text-slate-700'}`}>{vehicle.status}</span>
        )}
        {has360 && (
          <span className="rdg-chip absolute right-3 top-3 bg-slate-900/80 text-white"><Rotate3d size={12} /> 360°</span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{vehicle.year}</p>
        <h3 className="text-lg font-extrabold leading-tight text-slate-900">
          {vehicle.make} {vehicle.model}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <Gauge size={14} /> {vehicle.mileage != null ? `${Number(vehicle.mileage).toLocaleString()} km` : 'Mileage on request'}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-xl font-extrabold text-emerald-600">₱{Number(vehicle.selling_price).toLocaleString()}</p>
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-400 group-hover:text-emerald-600">
            View <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  )
}
