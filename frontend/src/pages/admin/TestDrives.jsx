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
      <h1 className="mb-4 text-2xl font-bold text-brand">Test Drive Requests</h1>
      <ul className="space-y-2">
        {testDrives.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 text-sm">
            <span>
              {t.vehicle?.year} {t.vehicle?.make} {t.vehicle?.model} — {t.buyer?.name} —{' '}
              {new Date(t.preferred_at).toLocaleString()}
              {t.note && <span className="block text-xs text-slate-400">"{t.note}"</span>}
            </span>
            {t.status === 'pending' ? (
              <span className="flex gap-2">
                <button onClick={() => confirm(t.id)} className="rounded bg-green-600 px-2 py-1 text-white">Confirm</button>
                <button onClick={() => decline(t.id)} className="rounded bg-red-600 px-2 py-1 text-white">Decline</button>
              </span>
            ) : (
              <span className="text-xs uppercase text-slate-400">{t.status}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
