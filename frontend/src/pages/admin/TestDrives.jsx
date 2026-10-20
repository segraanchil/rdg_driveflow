import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

/** Test drive request queue. Confirm/decline only — never touches vehicle status. */
export default function TestDrives() {
  const [testDrives, setTestDrives] = useState([])

  function load() {
    apiClient.get('/admin/test-drives').then(({ data }) => setTestDrives(data.data ?? []))
  }

  useEffect(load, [])

  async function confirm(id) {
    await apiClient.patch(`/admin/test-drives/${id}/confirm`)
    load()
  }

  async function decline(id) {
    await apiClient.patch(`/admin/test-drives/${id}/decline`)
    load()
  }

  return (
    <div>
      <h1 className="mb-6">Test Drive Requests</h1>
      <ul className="space-y-2">
        {testDrives.map((t) => (
          <li key={t.id} className="rdg-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              {t.vehicle?.year} {t.vehicle?.make} {t.vehicle?.model} — {t.buyer?.name} —{' '}
              {new Date(t.preferred_at).toLocaleString()}
              {t.note && <span className="block text-xs text-slate-400">"{t.note}"</span>}
            </span>
            {t.status === 'pending' ? (
              <span className="flex gap-2">
                <button onClick={() => confirm(t.id)} className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600">Confirm</button>
                <button onClick={() => decline(t.id)} className="inline-flex items-center rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600">Decline</button>
              </span>
            ) : (
              <span className="rdg-chip bg-slate-100 text-slate-600">{t.status}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
