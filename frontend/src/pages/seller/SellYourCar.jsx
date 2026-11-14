import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Upload, X, Camera, Banknote, ClipboardList, Handshake, LogIn, UserPlus, Check, Info } from 'lucide-react'
import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { apiError } from '../../lib/format'

const STEPS = [
  [ClipboardList, 'Tell us about your car', 'Details and a few photos. About 3 minutes.'],
  [Banknote, 'Get an offer', 'Our appraiser reviews it and sends you an offer online.'],
  [Handshake, 'Accept and get paid', 'Accept the offer, bring the car in for inspection, get paid.'],
]
const SHOTS = ['Front', 'Back', 'Both sides', 'Dashboard with odometer', 'Interior / seats', 'Engine bay', 'Any dents or scratches']
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs repair']
const DRAFT_KEY = 'rdg.sell-draft'
const BLANK = { make: '', model: '', year: '', mileage: '', transmission: '', fuel_type: '', color: '', condition: 'Good', asking_price: '', complete_papers: true, location: '', contact_number: '', condition_notes: '' }

/** "Sell Your Car" (Stories 13–14): open to everyone; guests sign in before submitting and keep their draft. */
export default function SellYourCar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState(() => {
    try { return { ...BLANK, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}') } } catch { return BLANK }
  })
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState(null)
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])
  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)) } catch { /* ignore */ } }, [form])

  const canSubmit = user && ['buyer', 'seller'].includes(user.role)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!user) return navigate('/register?role=seller&next=/sell-your-car')
    if (photos.length < 3) return setError('Add at least 3 photos so we can appraise your car.')
    const data = new FormData()
    Object.entries(form).forEach(([key, value]) => data.append(key, key === 'complete_papers' ? (value ? '1' : '0') : value))
    photos.forEach((file) => data.append('photos[]', file))
    try {
      const { data: lead } = await apiClient.post('/seller/acquisition-leads', data, { headers: { 'Content-Type': 'multipart/form-data' }, loadingText: 'Sending your car for appraisal…', quietErrors: true })
      sessionStorage.removeItem(DRAFT_KEY)
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><Icon size={18} /></span>
            <span><span className="block text-sm font-bold text-slate-900">{i + 1}. {title}</span><span className="text-xs text-slate-500">{text}</span></span>
          </li>
        ))}
      </ol>

      {!user && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-slate-900 p-5 text-white sm:flex-row sm:items-center">
          <p className="flex-1 text-sm"><strong>You’ll need a free account to submit</strong> so we can send you the offer. Fill in the form first; it’s saved while you sign up.</p>
          <div className="flex gap-2">
            <Link to="/login" state={{ from: { pathname: '/sell-your-car' } }} className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold hover:bg-white/10"><LogIn size={15} /> Log in</Link>
            <Link to="/register?role=seller&next=/sell-your-car" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900"><UserPlus size={15} /> Sign up</Link>
          </div>
        </div>
      )}
      {user && !canSubmit && (
        <p className="mb-5 flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><Info size={16} className="mt-0.5 shrink-0" /> Staff accounts can’t submit cars. Log in with a buyer or seller account to try this out.</p>
      )}

      <form onSubmit={submit} className="space-y-5">
        <section className="rdg-card p-6">
          <h2 className="mb-4 font-display text-xl font-bold uppercase italic tracking-wide">Your car</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Brand"><input required value={form.make} onChange={set('make')} placeholder="Toyota" className="w-full" /></Field>
            <Field label="Model"><input required value={form.model} onChange={set('model')} placeholder="Vios 1.3 E" className="w-full" /></Field>
            <Field label="Year"><input required type="number" min="1980" max={new Date().getFullYear() + 1} value={form.year} onChange={set('year')} placeholder="2019" className="w-full" /></Field>
            <Field label="Mileage (km)"><input required type="number" min="0" value={form.mileage} onChange={set('mileage')} placeholder="45000" className="w-full" /></Field>
            <Field label="Transmission">
              <select value={form.transmission} onChange={set('transmission')} className="w-full"><option value="">Select</option><option>Automatic</option><option>Manual</option><option>CVT</option></select>
            </Field>
            <Field label="Fuel">
              <select value={form.fuel_type} onChange={set('fuel_type')} className="w-full"><option value="">Select</option><option>Gasoline</option><option>Diesel</option><option>Hybrid</option><option>Electric</option></select>
            </Field>
            <Field label="Color"><input value={form.color} onChange={set('color')} placeholder="Silver" className="w-full" /></Field>
            <Field label="Asking price (₱, optional)"><input type="number" min="0" step="1000" value={form.asking_price} onChange={set('asking_price')} placeholder="450000" className="w-full" /></Field>
          </div>

          <div className="mt-4">
            <span className="rdg-label">Overall condition</span>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button type="button" key={c} onClick={() => setForm((f) => ({ ...f, condition: c }))}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${form.condition === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c}</button>
              ))}
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3">
            <input type="checkbox" checked={form.complete_papers} onChange={(e) => setForm((f) => ({ ...f, complete_papers: e.target.checked }))} className="h-4 w-4" />
            <span className="text-sm"><strong className="text-slate-900">Complete papers</strong> <span className="text-slate-500">— original OR/CR in my name (or with a deed of sale), no loan balance</span></span>
          </label>

          <Field label="Anything we should know?" className="mt-4">
            <textarea rows={4} value={form.condition_notes} onChange={set('condition_notes')} className="w-full" placeholder="Number of owners, accident history, recent repairs or replaced parts, known issues…" />
          </Field>
        </section>

        <section className="rdg-card p-6">
          <h2 className="mb-1 font-display text-xl font-bold uppercase italic tracking-wide">Photos</h2>
          <p className="mb-3 text-sm text-slate-500">At least 3, up to 15. More angles mean a more accurate offer.</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SHOTS.map((s) => <span key={s} className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"><Camera size={12} /> {s}</span>)}
          </div>
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-7 text-center text-sm text-slate-500 hover:border-slate-900">
            <Upload size={20} className="text-slate-900" />
            <span className="font-semibold text-slate-700">Add photos</span>
            <span className="text-xs">JPG or PNG, up to 10 MB each</span>
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setPhotos((p) => [...p, ...Array.from(e.target.files)].slice(0, 15))} />
          </label>
          {previews.length > 0 && (
            <>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {previews.map((url, i) => (
                  <div key={url} className="relative">
                    <img src={url} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                    <button type="button" aria-label="Remove photo" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={12} /></button>
                  </div>
                ))}
              </div>
              <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${photos.length >= 3 ? 'text-green-700' : 'text-amber-700'}`}><Check size={13} /> {photos.length} photo{photos.length === 1 ? '' : 's'} added{photos.length < 3 ? ` — add ${3 - photos.length} more` : ''}</p>
            </>
          )}
        </section>

        <section className="rdg-card p-6">
          <h2 className="mb-4 font-display text-xl font-bold uppercase italic tracking-wide">How we reach you</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mobile number"><input required type="tel" value={form.contact_number} onChange={set('contact_number')} placeholder="0917 123 4567" className="w-full" /></Field>
            <Field label="Where is the car? (city)"><input value={form.location} onChange={set('location')} placeholder="Quezon City" className="w-full" /></Field>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={user && !canSubmit} className="rdg-btn mt-5 w-full py-3">
            {user ? 'Submit for appraisal' : 'Sign up to submit'}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">Free, no obligation. You decide whether to accept our offer.</p>
        </section>
      </form>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="rdg-label">{label}</span>
      {children}
    </label>
  )
}
