import { useEffect, useState } from 'react'
import apiClient, { backendUrl } from '../../api/client'

/** Reservation & payment proof verification queue. */
export default function Reservations() {
  const [reservations, setReservations] = useState([])

  function load() {
    apiClient.get('/admin/reservations').then(({ data }) => setReservations(data.data ?? []))
  }

  useEffect(load, [])

  async function verify(id) {
    await apiClient.post(`/admin/reservations/${id}/verify`)
    load()
  }

  async function reject(id) {
    await apiClient.post(`/admin/reservations/${id}/reject`)
    load()
  }

  return (
    <div>
      <h1 className="mb-6">Reservation Queue</h1>
      <ul className="space-y-2">
        {reservations.map((r) => (
          <li key={r.id} className="rdg-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              {r.vehicle?.year} {r.vehicle?.make} {r.vehicle?.model} — {r.buyer?.name}
              <span className={`rdg-chip ml-2 ${r.payment_method === 'financing' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {r.payment_method === 'financing' ? 'Bank financing' : 'Straight cash'}
              </span>
              {r.expires_at && <span className="ml-2 text-xs text-slate-400">hold ends {new Date(r.expires_at).toLocaleString()}</span>}
            </span>
            <span className="flex gap-2">
              <a href={backendUrl(`/storage/${r.payment_proof_path}`)} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 hover:underline">
                View proof
              </a>
              <button onClick={() => verify(r.id)} className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600">Verify</button>
              <button onClick={() => reject(r.id)} className="inline-flex items-center rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600">Reject</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
