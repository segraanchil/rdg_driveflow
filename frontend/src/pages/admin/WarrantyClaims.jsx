import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

const STATUSES = ['under_review', 'approved', 'rejected', 'refunded']

/** Warranty claim review/management. */
export default function WarrantyClaims() {
  const [claims, setClaims] = useState([])

  function load() {
    apiClient.get('/admin/warranty-claims').then(({ data }) => setClaims(data.data ?? []))
  }

  useEffect(load, [])

  async function setStatus(id, status) {
    await apiClient.patch(`/admin/warranty-claims/${id}`, { status })
    load()
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-brand">Warranty Claims</h1>
      <div className="space-y-3">
        {claims.map((claim) => (
          <div key={claim.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium">{claim.sale?.buyer?.name}</p>
            <p className="text-slate-500">{claim.issue_description}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs uppercase text-slate-400">{claim.status}</span>
              <select
                onChange={(e) => setStatus(claim.id, e.target.value)}
                defaultValue=""
                className="rounded border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="" disabled>Update status</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
