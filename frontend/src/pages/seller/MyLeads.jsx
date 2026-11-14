import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronRight, CarFront } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { PageHeader, StatusBadge } from '../../components/ui/kit'
import { formatDate, peso } from '../../lib/format'

/** A seller's own submissions and where each appraisal stands. */
export default function MyLeads() {
  const [leads, setLeads] = useState(null)

  useEffect(() => {
    apiClient.get('/seller/acquisition-leads').then(({ data }) => setLeads(data))
  }, [])

  if (!leads) return <PageLoader />

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My Submissions" subtitle="Track each car you offered to us." actions={<Link to="/sell-your-car" className="rdg-btn"><Plus size={16} /> Submit a car</Link>} />

      {leads.length === 0 ? (
        <div className="rdg-card p-10 text-center">
          <CarFront size={36} className="mx-auto text-emerald-500" />
          <p className="mt-3 font-bold text-slate-900">You haven’t submitted a car yet</p>
          <Link to="/sell-your-car" className="rdg-btn mt-5">Get an offer</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => {
            const s = lead.vehicle_specs ?? {}
            const photo = lead.photos_path?.[0]
            return (
              <li key={lead.id}>
                <Link to={`/appraisal-status/${lead.id}`} className="rdg-card flex items-center gap-4 p-4 transition hover:shadow-lift">
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {photo ? <img src={backendUrl(`/storage/${photo}`)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="flex h-full items-center justify-center text-slate-300"><CarFront /></span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{s.year} {s.make} {s.model}</p>
                    <p className="text-xs text-slate-500">Submitted {formatDate(lead.created_at)}</p>
                    {lead.offer_amount && <p className="text-sm font-bold text-emerald-700">Offer: {peso(lead.offer_amount)}</p>}
                  </div>
                  <StatusBadge kind="lead" status={lead.status} />
                  <ChevronRight size={18} className="text-slate-300" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
