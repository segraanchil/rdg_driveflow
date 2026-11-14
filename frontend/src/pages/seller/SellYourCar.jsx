import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, Camera, Banknote, ClipboardList, Handshake } from 'lucide-react'
import apiClient from '../../api/client'
import { apiError } from '../../lib/format'

const STEPS = [
  [ClipboardList, 'Tell us about your car', 'Specs, condition and photos. It takes about 3 minutes.'],
  [Banknote, 'Get an offer', 'Our appraiser reviews it and sends you an offer. Follow it in My Submissions.'],
  [Handshake, 'Close the deal', 'Bring the car in for inspection, accept the offer and get paid.'],
]

/** "Sell Your Car" portal (Stories 13–14): specs + photos for a dealership appraisal. */
export default function SellYourCar() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ make: '', model: '', year: '', mileage: '', condition_notes: '' })
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState(null)
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError(null)
    const data = new FormData()
    Object.entries(form).forEach(([key, value]) => data.append(key, value))
    photos.forEach((file) => data.append('photos[]', file))
    try {
      const { data: lead } = await apiClient.post('/seller/acquisition-leads', data, { headers: { 'Content-Type': 'multipart/form-data' }, loadingText: 'Submitting your car…', quietErrors: true })
      navigate(`/appraisal-status/${lead.id}`)
    } catch (err) {
      setError(apiError(err, 'Could not submit your car.'))
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1">Sell Your Car</h1>
      <p className="mb-6 text-sm text-slate-500">Get a dealership offer without dealing with private buyers.</p>

      <ol className="mb-6 grid gap-3 sm:grid-cols-3">
        {STEPS.map(([Icon, title, text], i) => (
          <li key={title} className="rdg-card flex gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Icon size={18} /></span>
            <span><span className="block text-sm font-bold text-slate-900">{i + 1}. {title}</span><span className="text-xs text-slate-500">{text}</span></span>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="rdg-card space-y-5 p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label><span className="rdg-label">Make</span><input required value={form.make} onChange={set('make')} placeholder="Toyota" className="w-full" /></label>
          <label><span className="rdg-label">Model</span><input required value={form.model} onChange={set('model')} placeholder="Vios" className="w-full" /></label>
          <label><span className="rdg-label">Year</span><input required type="number" min="1980" max={new Date().getFullYear() + 1} value={form.year} onChange={set('year')} className="w-full" /></label>
          <label><span className="rdg-label">Mileage (km)</span><input required type="number" min="0" value={form.mileage} onChange={set('mileage')} className="w-full" /></label>
        </div>
        <label className="block">
          <span className="rdg-label">Condition</span>
          <textarea rows={4} value={form.condition_notes} onChange={set('condition_notes')} className="w-full"
            placeholder="Transmission, number of owners, accident history, recent repairs, known issues, complete papers?" />
        </label>

        <div>
          <span className="rdg-label">Photos</span>
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-500 hover:border-emerald-400 hover:bg-emerald-50">
            <Upload size={20} className="text-emerald-600" />
            <span className="font-semibold text-slate-700">Add photos</span>
            <span className="text-xs">More photos mean a more accurate offer</span>
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setPhotos((p) => [...p, ...Array.from(e.target.files)])} />
          </label>
          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {previews.map((url, i) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  <button type="button" aria-label="Remove" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500"><Camera size={14} className="mt-0.5 shrink-0" /> Front, back, both sides, interior, dashboard (with the odometer showing), engine bay, and any damage.</p>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" className="rdg-btn w-full py-3">Submit for appraisal</button>
      </form>
    </div>
  )
}
