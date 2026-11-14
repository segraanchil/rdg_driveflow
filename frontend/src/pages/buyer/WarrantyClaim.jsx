import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, Upload, X, CheckCircle2, FileText } from 'lucide-react'
import apiClient from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { apiError, formatDate, vehicleName } from '../../lib/format'

function deadlineOf(sale) {
  const d = new Date(`${sale.sale_date}T23:59:59`)
  d.setMonth(d.getMonth() + 1)
  return d
}

/** Warranty claim (Story 12): 1-month money-back guarantee, with photo/video evidence and a ticket number. */
export default function WarrantyClaim() {
  const [params] = useSearchParams()
  const [sales, setSales] = useState(null)
  const [saleId, setSaleId] = useState(params.get('sale_id') ?? '')
  const [issue, setIssue] = useState('')
  const [evidence, setEvidence] = useState([])
  const [submitted, setSubmitted] = useState(null)
  const [error, setError] = useState(null)
  const previews = useMemo(() => evidence.map((f) => ({ name: f.name, url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null })), [evidence])
  useEffect(() => () => previews.forEach((p) => p.url && URL.revokeObjectURL(p.url)), [previews])

  useEffect(() => {
    apiClient.get('/buyer/sales').then(({ data }) => setSales(data))
  }, [])

  async function submit(e) {
    e.preventDefault()
    const form = new FormData()
    form.append('sale_id', saleId)
    form.append('issue_description', issue)
    evidence.forEach((file) => form.append('evidence[]', file))
    setError(null)
    try {
      const { data } = await apiClient.post('/buyer/warranty-claims', form, { headers: { 'Content-Type': 'multipart/form-data' }, loadingText: 'Filing your claim…', quietErrors: true })
      setSubmitted(data)
    } catch (err) {
      setError(apiError(err, 'Could not submit the claim.'))
    }
  }

  if (sales === null) return <PageLoader />

  if (submitted) {
    return (
      <div className="rdg-card mx-auto max-w-md p-8 text-center">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
        <h1 className="no-bar mt-3 block">Claim submitted</h1>
        <p className="mt-1 text-slate-500">Your ticket number is</p>
        <p className="my-3 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 py-3 font-mono text-2xl font-extrabold tracking-wider text-emerald-700">{submitted.ticket_number}</p>
        <p className="text-sm text-slate-500">Our team will review it and email you each time its status changes.</p>
        <Link to="/garage" className="rdg-btn mt-5 w-full">Follow it in My Garage</Link>
      </div>
    )
  }

  const eligible = sales.filter((s) => deadlineOf(s) > new Date())
  const selected = sales.find((s) => String(s.id) === saleId)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1">Warranty Claim</h1>
      <p className="mb-6 text-sm text-slate-500">Every car has a 1-month money-back guarantee. Tell us what’s wrong and attach photos or a short video.</p>

      {sales.length === 0 ? (
        <div className="rdg-card p-8 text-center">
          <ShieldCheck size={36} className="mx-auto text-emerald-500" />
          <p className="mt-3 font-bold text-slate-900">No purchases on file yet</p>
          <p className="mt-1 text-sm text-slate-500">A warranty claim is filed against a car you bought from us.</p>
          <Link to="/inventory" className="rdg-btn mt-5">Browse cars</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="rdg-card space-y-5 p-6">
          <div>
            <span className="rdg-label is-required">Which car?</span>
            <div className="space-y-2">
              {sales.map((s) => {
                const open = deadlineOf(s) > new Date()
                const daysLeft = Math.ceil((deadlineOf(s) - new Date()) / 86_400_000)
                return (
                  <label key={s.id} className={`flex items-center gap-3 rounded-xl border p-3 ${!open ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${saleId === String(s.id) ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20' : 'border-slate-200'}`}>
                    <input type="radio" name="sale" value={s.id} checked={saleId === String(s.id)} disabled={!open} onChange={(e) => setSaleId(e.target.value)} />
                    <span className="flex-1">
                      <span className="block font-semibold text-slate-900">{vehicleName(s.vehicle)}</span>
                      <span className="text-xs text-slate-500">Bought {formatDate(s.sale_date)} · {open ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left to claim` : 'guarantee period ended'}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            {eligible.length === 0 && <p className="mt-2 text-sm text-amber-700">The 1-month guarantee has ended for all your purchases. You can still chat with us for help.</p>}
          </div>

          <label className="block">
            <span className="rdg-label is-required">What’s the problem?</span>
            <textarea value={issue} onChange={(e) => setIssue(e.target.value)} required rows={5} maxLength={3000} className="w-full"
              placeholder="Describe what happens, when it started and how often, e.g. “Engine check light turns on after 20 minutes of driving.”" />
          </label>

          <div>
            <span className="rdg-label">Photos or videos (optional)</span>
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-500 hover:border-emerald-400 hover:bg-emerald-50">
              <Upload size={20} className="text-emerald-600" />
              <span className="font-semibold text-slate-700">Add files</span>
              <span className="text-xs">Up to 10 MB each</span>
              <input type="file" multiple accept="image/*,video/*,.pdf" className="sr-only" onChange={(e) => setEvidence((f) => [...f, ...Array.from(e.target.files)])} />
            </label>
            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {previews.map((p, i) => (
                  <div key={i} className="relative">
                    {p.url ? <img src={p.url} alt={p.name} className="aspect-square w-full rounded-lg object-cover" /> : <span className="flex aspect-square items-center justify-center rounded-lg bg-slate-100 text-slate-400"><FileText size={20} /></span>}
                    <button type="button" aria-label="Remove" onClick={() => setEvidence((f) => f.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={!selected || deadlineOf(selected) <= new Date() || !issue.trim()} className="rdg-btn w-full py-3"><ShieldCheck size={17} /> Submit claim</button>
        </form>
      )}
    </div>
  )
}
