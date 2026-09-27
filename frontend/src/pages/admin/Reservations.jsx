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
      <h1 className="mb-4 text-2xl font-bold text-brand">Reservation Queue</h1>
      <ul className="space-y-2">
        {reservations.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 text-sm">
            <span>
              {r.vehicle?.year} {r.vehicle?.make} {r.vehicle?.model} — {r.buyer?.name}
            </span>
            <span className="flex gap-2">
              <a href={backendUrl(`/storage/${r.payment_proof_path}`)} target="_blank" rel="noreferrer" className="text-brand underline">
                View proof
              </a>
              <button onClick={() => verify(r.id)} className="rounded bg-green-600 px-2 py-1 text-white">Verify</button>
              <button onClick={() => reject(r.id)} className="rounded bg-red-600 px-2 py-1 text-white">Reject</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
