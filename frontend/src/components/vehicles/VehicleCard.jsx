import { Link } from 'react-router-dom'
import { backendUrl } from '../../api/client'

export default function VehicleCard({ vehicle }) {
  const thumbnail = vehicle.media?.[0]?.file_path

  return (
    <Link
      to={`/inventory/${vehicle.id}`}
      className="block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-video bg-slate-100">
        {thumbnail ? (
          <img
            src={backendUrl(`/storage/${thumbnail}`)}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">No photo yet</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-brand">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        <p className="text-sm text-slate-500">{vehicle.mileage?.toLocaleString()} km</p>
        <p className="mt-2 text-lg font-bold text-brand-accent">
          ₱{Number(vehicle.selling_price).toLocaleString()}
        </p>
      </div>
    </Link>
  )
}
