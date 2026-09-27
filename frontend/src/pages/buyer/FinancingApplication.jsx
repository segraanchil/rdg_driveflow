import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiClient from '../../api/client'
import { estimateMonthlyAmortization } from '../../lib/loanCalculator'

const PROFILES = [
  { value: 'employed', label: 'Employed' },
  { value: 'ofw', label: 'OFW' },
  { value: 'business_owner', label: 'Business Owner' },
]

/**
 * The actual bank-financing submission flow: pick a profile, see the
 * checklist, submit the application, then upload each required document.
 * LoanCalculator.jsx is a separate, no-login "just estimate" tool — this
 * page is what turns an estimate into a real financing_applications row.
 */
export default function FinancingApplication() {
  const [searchParams] = useSearchParams()
  const vehicleId = searchParams.get('vehicle_id')

  const [vehicle, setVehicle] = useState(null)
  const [employmentProfile, setEmploymentProfile] = useState('')
  const [termMonths, setTermMonths] = useState(36)
  const [downPayment, setDownPayment] = useState(0)
  const [checklist, setChecklist] = useState([])
  const [application, setApplication] = useState(null)
  const [uploaded, setUploaded] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    if (vehicleId) {
      apiClient.get(`/vehicles/${vehicleId}`).then(({ data }) => {
        setVehicle(data)
        setDownPayment(Math.round(Number(data.selling_price) * 0.2))
      })
    }
  }, [vehicleId])

  useEffect(() => {
    if (!employmentProfile) return
    apiClient.get(`/financing/checklist/${employmentProfile}`).then(({ data }) => setChecklist(data.documents))
  }, [employmentProfile])

  const estimate = vehicle
    ? estimateMonthlyAmortization({ vehiclePrice: Number(vehicle.selling_price), downPayment, termMonths })
    : 0

  async function submitApplication(e) {
    e.preventDefault()
    setError(null)
    try {
      const { data } = await apiClient.post('/buyer/financing-applications', {
        vehicle_id: vehicleId,
        employment_profile: employmentProfile,
        term_months: termMonths,
        down_payment: downPayment,
      })
      setApplication(data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not submit the application.')
    }
  }

  async function uploadDoc(docType, file) {
    await apiClient.post(
      `/buyer/financing-applications/${application.id}/documents`,
      (() => {
        const form = new FormData()
        form.append('doc_type', docType)
        form.append('file', file)
        return form
      })(),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    setUploaded((u) => ({ ...u, [docType]: true }))
  }

  if (!vehicleId) return <p className="text-slate-500">Pick a vehicle first from its detail page.</p>

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-bold text-brand">Bank Financing Application</h1>
      {vehicle && (
        <p className="mb-4 text-sm text-slate-500">
          {vehicle.year} {vehicle.make} {vehicle.model} — ₱{Number(vehicle.selling_price).toLocaleString()}
        </p>
      )}

      {!application ? (
        <form onSubmit={submitApplication} className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Employment profile</p>
            <div className="flex gap-2">
              {PROFILES.map((p) => (
                <label
                  key={p.value}
                  className={`flex-1 cursor-pointer rounded border px-3 py-2 text-center text-sm ${
                    employmentProfile === p.value ? 'border-brand bg-brand text-white' : 'border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="profile"
                    value={p.value}
                    checked={employmentProfile === p.value}
                    onChange={(e) => setEmploymentProfile(e.target.value)}
                    className="hidden"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {employmentProfile && (
            <div className="rounded border border-slate-200 bg-white p-3 text-sm">
              <p className="mb-1 font-medium">You'll need to upload:</p>
              <ul className="list-inside list-disc text-slate-600">
                {checklist.map((doc) => (
                  <li key={doc}>{doc.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          )}

          <label className="block text-sm">
            Down payment: ₱{Number(downPayment).toLocaleString()}
            <input
              type="range"
              min={0}
              max={vehicle ? Number(vehicle.selling_price) : 0}
              step={5000}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="block text-sm">
            Term: {termMonths} months
            <input
              type="range"
              min={12}
              max={60}
              step={6}
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <p className="text-sm text-slate-500">
            Estimated monthly: <strong>₱{estimate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!employmentProfile}
            className="w-full rounded bg-brand py-2 text-white disabled:opacity-50"
          >
            Submit Application
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="rounded bg-green-50 p-3 text-sm text-green-700">
            Application submitted. Upload each required document below.
          </p>
          {checklist.map((doc) => (
            <div key={doc} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 text-sm">
              <span className="capitalize">{doc.replace(/_/g, ' ')} {uploaded[doc] ? '✅' : ''}</span>
              {!uploaded[doc] && (
                <input
                  type="file"
                  onChange={(e) => e.target.files[0] && uploadDoc(doc, e.target.files[0])}
                  className="text-xs"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
