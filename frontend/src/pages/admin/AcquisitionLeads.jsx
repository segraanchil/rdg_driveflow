import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

const STATUSES = ['under_appraisal', 'offer_made', 'accepted', 'declined']

/** Acquisition lead review — shared screen, reachable by Admin and CEO. */
export default function AcquisitionLeads() {
  const [leads, setLeads] = useState([])

  function load() {
    apiClient.get('/shared/acquisition-leads').then(({ data }) => setLeads(data.data ?? []))
  }

  useEffect(load, [])

  async function setStatus(id, status) {
    await apiClient.patch(`/shared/acquisition-leads/${id}`, { status })
    load()
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-brand">Acquisition Leads</h1>
      <div className="space-y-3">
        {leads.map((lead) => (
          <div key={lead.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium">
              {lead.vehicle_specs?.year} {lead.vehicle_specs?.make} {lead.vehicle_specs?.model} — {lead.seller?.name}
            </p>
            <p className="text-slate-500">{lead.vehicle_specs?.mileage?.toLocaleString()} km</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs uppercase text-slate-400">{lead.status}</span>
              <select
                onChange={(e) => setStatus(lead.id, e.target.value)}
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
