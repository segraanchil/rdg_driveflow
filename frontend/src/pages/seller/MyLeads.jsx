import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../api/client'

/** A seller's own acquisition-lead submissions — otherwise there's no way to find your way back to a status page after the first visit. */
export default function MyLeads() {
  const [leads, setLeads] = useState([])

  useEffect(() => {
    apiClient.get('/seller/acquisition-leads').then(({ data }) => setLeads(data))
  }, [])

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">My Submissions</h1>
        <Link to="/sell-your-car" className="text-sm text-brand underline">Submit another car</Link>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-slate-400">You haven't submitted a vehicle yet.</p>
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <li key={lead.id}>
              <Link
                to={`/appraisal-status/${lead.id}`}
                className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 text-sm hover:border-brand"
              >
                <span>
                  {lead.vehicle_specs?.year} {lead.vehicle_specs?.make} {lead.vehicle_specs?.model}
                </span>
                <span className="text-xs uppercase text-slate-400">{lead.status.replace('_', ' ')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
