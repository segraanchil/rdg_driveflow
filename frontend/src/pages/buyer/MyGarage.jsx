import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient, { backendUrl } from '../../api/client'

/** "My Garage": saved vehicles, active reservations, purchase/loan history, warranty claims. */
export default function MyGarage() {
  const [garage, setGarage] = useState(null)
  const [sales, setSales] = useState([])
  const [claims, setClaims] = useState([])
  const [testDrives, setTestDrives] = useState([])

  function loadGarage() {
    apiClient.get('/buyer/garage').then(({ data }) => setGarage(data))
  }

  useEffect(() => {
    loadGarage()
    apiClient.get('/buyer/sales').then(({ data }) => setSales(data))
    apiClient.get('/buyer/warranty-claims').then(({ data }) => setClaims(data))
    apiClient.get('/buyer/test-drives').then(({ data }) => setTestDrives(data))
  }, [])

  async function unsave(vehicleId) {
    await apiClient.delete(`/buyer/saved-vehicles/${vehicleId}`)
    loadGarage()
  }

  if (!garage) return <p className="text-slate-400">Loading…</p>

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-brand">My Garage</h1>

      <section>
        <h2 className="mb-2 font-semibold text-slate-700">Saved Vehicles</h2>
        {garage.saved_vehicles.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nothing saved yet — tap ☆ Save on any vehicle's detail page.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {garage.saved_vehicles.map((v) => (
              <div key={v.id} className="overflow-hidden rounded border border-slate-200 bg-white">
                <Link to={`/inventory/${v.id}`}>
                  <div className="aspect-video bg-slate-100">
                    {v.media?.[0] && (
                      <img
                        src={backendUrl(`/storage/${v.media[0].file_path}`)}
                        alt={`${v.year} ${v.make} ${v.model}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <p className="p-2 text-xs">{v.year} {v.make} {v.model}</p>
                </Link>
                <button onClick={() => unsave(v.id)} className="w-full border-t border-slate-100 py-1 text-xs text-red-600">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-slate-700">Active Reservations</h2>
        {garage.active_reservations.length === 0 ? (
          <p className="text-sm text-slate-400">No active reservations.</p>
        ) : (
          <ul className="space-y-2">
            {garage.active_reservations.map((r) => (
              <li key={r.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
                {r.vehicle?.year} {r.vehicle?.make} {r.vehicle?.model} — {r.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-slate-700">Test Drives</h2>
        {testDrives.length === 0 ? (
          <p className="text-sm text-slate-400">No test drives scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {testDrives.map((t) => (
              <li key={t.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
                {t.vehicle?.year} {t.vehicle?.make} {t.vehicle?.model} —{' '}
                {new Date(t.preferred_at).toLocaleString()} — {t.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-slate-700">Purchase History</h2>
        {sales.length === 0 ? (
          <p className="text-sm text-slate-400">No completed purchases yet.</p>
        ) : (
          <ul className="space-y-2">
            {sales.map((s) => (
              <li key={s.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
                {s.vehicle?.year} {s.vehicle?.make} {s.vehicle?.model} — ₱{Number(s.total_amount).toLocaleString()} on {s.sale_date}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-slate-700">Loan History</h2>
        {garage.loan_history.length === 0 ? (
          <p className="text-sm text-slate-400">No financing applications yet.</p>
        ) : (
          <ul className="space-y-2">
            {garage.loan_history.map((l) => (
              <li key={l.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
                {l.vehicle?.year} {l.vehicle?.make} {l.vehicle?.model} — {l.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-slate-700">Warranty Claims</h2>
        {claims.length === 0 ? (
          <p className="text-sm text-slate-400">No warranty claims filed.</p>
        ) : (
          <ul className="space-y-2">
            {claims.map((c) => (
              <li key={c.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
                <p>{c.issue_description}</p>
                <p className="mt-1 text-xs uppercase text-slate-400">{c.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
