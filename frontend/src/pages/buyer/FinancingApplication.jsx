import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, CheckCircle2, Circle, Upload, FileText, Landmark, Info } from 'lucide-react'
import apiClient from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/kit'
import { estimateMonthlyAmortization } from '../../lib/loanCalculator'
import { loanRateFor, useSettings } from '../../lib/useSettings'
import { PROFILE_LABELS, apiError, docLabel, peso, vehicleName } from '../../lib/format'
import RequirementsList, { useRequirements } from '../../components/vehicles/RequirementsList'
import { toast } from '../../lib/toast'

const TERMS = [12, 24, 36, 48, 60]
const STEPS = ['Your details', 'Upload documents', 'Bank review']

/**
 * Bank financing (Stories 07–08): pick an employment profile → see its checklist → submit →
 * upload each document (PDF/JPG/PNG). Returning to this page resumes an open application.
 */
export default function FinancingApplication() {
  const [params] = useSearchParams()
  const vehicleId = params.get('vehicle_id')
  const settings = useSettings()

  const [vehicle, setVehicle] = useState(null)
  const [application, setApplication] = useState(undefined)
  const [profile, setProfile] = useState(params.get('profile') ?? '')
  const [term, setTerm] = useState(Number(params.get('term')) || 36)
  const [down, setDown] = useState(params.get('down') ? Number(params.get('down')) : null)
  const [checklist, setChecklist] = useState([])
  const [uploading, setUploading] = useState(null)
  const [error, setError] = useState(null)
  const reqs = useRequirements(application?.employment_profile ?? null)

  useEffect(() => {
    if (!vehicleId) return
    apiClient.get(`/vehicles/${vehicleId}`).then(({ data }) => {
      setVehicle(data)
      setDown((d) => d ?? Math.round(Number(data.selling_price) * 0.2))
    })
    apiClient.get('/buyer/financing-applications').then(({ data }) => {
      setApplication(data.find((a) => String(a.vehicle_id) === vehicleId && a.status !== 'rejected') ?? null)
    })
  }, [vehicleId])

  useEffect(() => {
    if (!profile) return
    apiClient.get(`/financing/checklist/${profile}`, { silent: true }).then(({ data }) => setChecklist(data.documents))
  }, [profile])

  if (!vehicleId) {
    return (
      <div className="rdg-card mx-auto max-w-md p-10 text-center">
        <p className="font-bold text-slate-900">Choose a car first.</p>
        <p className="mt-1 text-sm text-slate-500">Open a car and tap “Apply for financing”.</p>
        <Link to="/inventory" className="rdg-btn mt-5">Browse cars</Link>
      </div>
    )
  }
  if (!vehicle || application === undefined) return <PageLoader />

  const price = Number(vehicle.selling_price)
  const rate = loanRateFor(settings, profile || 'employed')
  const monthly = estimateMonthlyAmortization({ vehiclePrice: price, downPayment: Math.min(down ?? 0, price), termMonths: term, annualInterestRate: rate })

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      const { data } = await apiClient.post('/buyer/financing-applications', { vehicle_id: vehicleId, employment_profile: profile, term_months: term, down_payment: down }, { quietErrors: true })
      setApplication(data)
      toast.success('Application started. Now upload your documents.')
    } catch (err) {
      setError(apiError(err, 'Could not submit the application.'))
    }
  }

  async function uploadDoc(docType, file) {
    const form = new FormData()
    form.append('doc_type', docType)
    form.append('file', file)
    setUploading(docType)
    try {
      const { data } = await apiClient.post(`/buyer/financing-applications/${application.id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' }, quietErrors: true })
      setApplication((a) => ({ ...a, documents: [...(a.documents ?? []), data] }))
      toast.success(`${docLabel(docType)} uploaded`)
    } catch (err) {
      toast.error(apiError(err, 'Upload failed.'))
    } finally {
      setUploading(null)
    }
  }

  const required = application?.required_documents ?? checklist
  const uploaded = new Set((application?.documents ?? []).map((d) => d.doc_type))
  const allUploaded = application && required.every((d) => uploaded.has(d))
  const stepIndex = !application ? 0 : allUploaded ? 2 : 1

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1">Bank Financing</h1>
      <p className="mb-6 text-sm text-slate-500">{vehicleName(vehicle)} · {peso(price)}</p>

      <ol className="mb-6 grid grid-cols-3 gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="relative text-center">
            {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${i <= stepIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            <span className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < stepIndex ? 'bg-emerald-500 text-white' : i === stepIndex ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {i < stepIndex ? <Check size={16} /> : i + 1}
            </span>
            <span className={`mt-2 block text-xs font-semibold ${i <= stepIndex ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
          </li>
        ))}
      </ol>

      {!application ? (
        <form onSubmit={submit} className="rdg-card space-y-6 p-6">
          <div>
            <span className="rdg-label">Your employment</span>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PROFILE_LABELS).map(([key, label]) => (
                <button type="button" key={key} onClick={() => setProfile(key)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold ${profile === key ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>{label}</button>
              ))}
            </div>
          </div>

          {profile ? <RequirementsList profile={profile} /> : <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-500"><FileText size={16} /> Pick your employment above to see exactly which documents to prepare.</p>}

          <div>
            <div className="flex items-end justify-between"><span className="rdg-label">Down payment</span><span className="text-sm font-bold">{peso(down)} <span className="font-normal text-slate-500">({Math.round(((down ?? 0) / price) * 100)}%)</span></span></div>
            <input type="range" min={0} max={price} step={5000} value={down ?? 0} onChange={(e) => setDown(Number(e.target.value))} className="w-full" aria-label="Down payment" />
          </div>

          <div>
            <span className="rdg-label">Term</span>
            <div className="grid grid-cols-5 gap-2">
              {TERMS.map((t) => <button type="button" key={t} onClick={() => setTerm(t)} className={`rounded-lg border py-2 text-sm font-bold ${term === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600'}`}>{t} mo</button>)}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white">
            <span className="text-sm text-slate-300">Estimated monthly{profile ? ` at ${rate}%/yr` : ''}</span>
            <span className="text-2xl font-extrabold tabular-nums">{peso(monthly)}</span>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={!profile || vehicle.status === 'sold'} className="rdg-btn w-full py-3"><Landmark size={17} /> Submit application</button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rdg-card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm text-slate-500">{PROFILE_LABELS[application.employment_profile]} · {application.term_months} months · {peso(application.down_payment)} down</p>
              <p className="font-bold text-slate-900">Estimated {peso(application.monthly_amortization)}/month</p>
            </div>
            <StatusBadge kind="financing" status={application.status} />
          </div>

          <div className="rdg-card p-5">
            <p className="mb-3 font-bold text-slate-900">Documents ({required.filter((d) => uploaded.has(d)).length}/{required.length})</p>
            <ul className="space-y-2">
              {required.map((doc) => {
                const done = uploaded.has(doc)
                const files = (application.documents ?? []).filter((d) => d.doc_type === doc).length
                const verified = (application.documents ?? []).some((d) => d.doc_type === doc && d.verified)
                const req = (reqs ?? []).find((r) => r.key === doc)
                return (
                  <li key={doc} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
                    {done ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Circle size={20} className="text-slate-300" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{req?.label ?? docLabel(doc)} {req && <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{req.quantity}</span>}{verified && <span className="ml-2 text-xs font-bold text-green-700">Verified</span>}</span>
                      {req && <span className="mt-0.5 block text-xs text-slate-500">{req.details[0]}</span>}
                      {files > 0 && <span className="mt-0.5 block text-xs font-semibold text-slate-600">{files} file{files === 1 ? '' : 's'} uploaded</span>}
                    </span>
                    <label className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold ${done ? 'text-slate-500 hover:text-emerald-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                      {uploading === doc ? 'Uploading…' : done ? '+ Add file' : <span className="flex items-center gap-1"><Upload size={13} /> Upload</span>}
                      <input type="file" accept=".pdf,image/jpeg,image/png" className="sr-only" disabled={Boolean(uploading)} onChange={(e) => e.target.files[0] && uploadDoc(doc, e.target.files[0])} />
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>

          {allUploaded && (
            <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <Info size={18} className="mt-0.5 shrink-0" />
              <span>All set! Our staff will check your documents and forward them to the partner bank. You’ll get an email when the bank decides. Meanwhile you can <Link to={`/reservation?vehicle_id=${vehicle.id}&payment=financing`} className="font-bold underline">reserve the car</Link> so no one else gets it.</span>
            </div>
          )}
          <Link to="/garage" className="rdg-btn-ghost w-full">Go to My Garage</Link>
        </div>
      )}
    </div>
  )
}
