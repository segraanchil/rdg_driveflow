import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import apiClient from '../../api/client'

const STEPS = ['submitted', 'under_appraisal', 'offer_made', 'accepted']

export default function AppraisalStatus() {
  const { id } = useParams()
  const [lead, setLead] = useState(null)

  useEffect(() => {
    apiClient.get(`/seller/acquisition-leads/${id}`).then(({ data }) => setLead(data))
  }, [id])

  if (!lead) return <p className="text-slate-400">Loading…</p>

  const currentStep = STEPS.indexOf(lead.status)

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-brand">Appraisal Status</h1>

      <ol className="flex justify-between text-xs">
        {STEPS.map((step, i) => (
          <li key={step} className={`flex-1 text-center ${i <= currentStep ? 'text-brand-accent' : 'text-slate-300'}`}>
            <div className={`mx-auto mb-1 h-3 w-3 rounded-full ${i <= currentStep ? 'bg-brand-accent' : 'bg-slate-300'}`} />
            {step.replace('_', ' ')}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded border border-slate-200 bg-white p-4 text-sm">
        <p>
          {lead.vehicle_specs?.year} {lead.vehicle_specs?.make} {lead.vehicle_specs?.model}
        </p>
        <p className="mt-1 text-slate-500">Current status: {lead.status}</p>
      </div>
    </div>
  )
}
