import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, Banknote, StickyNote, ArrowLeft, XCircle } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'

const STEPS = [
  ['submitted', 'Submitted'],
  ['under_appraisal', 'Under appraisal'],
  ['offer_made', 'Offer made'],
  ['accepted', 'Accepted'],
]

/** Seller's appraisal tracker ("Track Appraisal Status"), including the dealership's offer. */
export default function AppraisalStatus() {
  const { id } = useParams()
  const [lead, setLead] = useState(null)

  useEffect(() => {
    apiClient.get(`/seller/acquisition-leads/${id}`).then(({ data }) => setLead(data))
  }, [id])

  if (!lead) return <PageLoader />

  const specs = lead.vehicle_specs ?? {}
  const declined = lead.status === 'declined'
  const current = STEPS.findIndex(([key]) => key === lead.status)

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/my-leads" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline"><ArrowLeft size={15} /> My submissions</Link>
      <h1 className="mb-1">Appraisal Status</h1>
      <p className="mb-6 text-sm text-slate-500">{specs.year} {specs.make} {specs.model} · {Number(specs.mileage ?? 0).toLocaleString()} km</p>

      <div className="rdg-card p-6">
        {declined ? (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-slate-600">
            <XCircle className="shrink-0 text-slate-400" /> The dealership decided not to acquire this vehicle. Thank you for your submission.
          </div>
        ) : (
          <ol className="grid grid-cols-4 gap-2">
            {STEPS.map(([key, label], i) => {
              const done = i <= current
              return (
                <li key={key} className="relative text-center">
                  {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                  <span className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {done ? <Check size={16} /> : i + 1}
                  </span>
                  <span className={`mt-2 block text-xs font-semibold ${done ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                </li>
              )
            })}
          </ol>
        )}

        {lead.offer_amount && (
          <div className="mt-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-50"><Banknote size={14} /> Our offer</p>
            <p className="text-3xl font-extrabold">₱{Number(lead.offer_amount).toLocaleString()}</p>
            <p className="mt-1 text-sm text-emerald-50">Our team will contact you to discuss the next steps.</p>
          </div>
        )}
        {lead.admin_notes && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400"><StickyNote size={13} /> Notes from our appraiser</p>
            {lead.admin_notes}
          </div>
        )}

        {(lead.photos_path ?? []).length > 0 && (
          <div className="mt-6">
            <p className="rdg-label">Your photos</p>
            <div className="grid grid-cols-4 gap-2">
              {lead.photos_path.map((p) => <img key={p} src={backendUrl(`/storage/${p}`)} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
