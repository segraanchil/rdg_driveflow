import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Camera, Banknote, ClipboardList, Handshake, LogIn, UserPlus, Check, Info, ImagePlus, RefreshCw } from 'lucide-react'
import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { apiError } from '../../lib/format'
import { Field, RequiredNote } from '../../components/ui/kit'
import Select from '../../components/ui/Select'
import PesoInput, { KmInput } from '../../components/ui/PesoInput'

const STEPS = [
  [ClipboardList, 'Tell us about your car', 'Details and a few photos. About 3 minutes.'],
  [Banknote, 'Get an offer', 'Our appraiser reviews it and sends you an offer online.'],
  [Handshake, 'Accept and get paid', 'Accept the offer, bring the car in for inspection, get paid.'],
]
// Same slots as AcquisitionLead::PHOTO_SLOTS on the backend: [key, label, required, max files, tip].
const SLOTS = [
  ['front', 'Front', true, 1, 'Whole car from the front, plate visible'],
  ['back', 'Back', true, 1, 'Whole car from behind'],
  ['left', 'Left side', true, 1, 'Full side, all wheels in frame'],
  ['right', 'Right side', true, 1, 'Full side, all wheels in frame'],
  ['odometer', 'Dashboard / odometer', true, 1, 'Engine on, mileage readable'],
  ['interior', 'Interior / seats', false, 1, 'Front seats and dashboard'],
  ['engine', 'Engine bay', false, 1, 'Hood open'],
  ['trunk', 'Trunk', false, 1, 'Trunk open'],
  ['damage', 'Dents or scratches', false, 4, 'Close-ups of any damage (up to 4)'],
]
const REQUIRED_SLOTS = SLOTS.filter((s) => s[2])
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs repair']
const THIS_YEAR = new Date().getFullYear()
// LTO registration is renewed yearly: newest first, back far enough to cover lapsed registrations.
const REG_YEARS = Array.from({ length: 14 }, (_, i) => THIS_YEAR + 3 - i)
const DRAFT_KEY = 'rdg.sell-draft'
const BLANK = { make: '', model: '', year: '', mileage: '', transmission: '', fuel_type: '', registered_until: '', color: '', condition: 'Good', asking_price: '', complete_papers: true, location: '', contact_number: '', condition_notes: '' }

/** "Sell Your Car" (Stories 13–14): open to everyone; guests sign in before submitting and keep their draft. */
export default function SellYourCar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState(() => {
    try { return { ...BLANK, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}') } } catch { return BLANK }
  })
  const [photos, setPhotos] = useState({}) // slot key => File[]
  const [error, setError] = useState(null)
  const [missing, setMissing] = useState([])
  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)) } catch { /* ignore */ } }, [form])

  const canSubmit = user && ['buyer', 'seller'].includes(user.role)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const requiredDone = REQUIRED_SLOTS.filter(([k]) => photos[k]?.length).length

  function setSlot(key, files) {
    setPhotos((p) => ({ ...p, [key]: files }))
    setMissing((m) => m.filter((k) => k !== key))
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!user) return navigate('/register?role=seller&next=/sell-your-car')
    const notYet = REQUIRED_SLOTS.filter(([k]) => !photos[k]?.length).map(([k]) => k)
    if (notYet.length) {
      setMissing(notYet)
      document.getElementById('photos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return setError(`Add the required photos: ${REQUIRED_SLOTS.filter(([k]) => notYet.includes(k)).map(([, l]) => l).join(', ')}.`)
    }
    if (Number(form.asking_price) < 10000) return setError('Enter your full asking price in pesos, e.g. 450,000.')
    const data = new FormData()
    Object.entries(form).forEach(([key, value]) => data.append(key, key === 'complete_papers' ? (value ? '1' : '0') : value))
    SLOTS.forEach(([key, , , max]) => (photos[key] ?? []).forEach((file) => data.append(max > 1 ? `photos[${key}][]` : `photos[${key}]`, file)))
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
          <p className="flex-1 text-sm"><strong>You’ll need a free account to submit</strong> so we can send you the offer. Fill in the form first; it’s saved while you sign up. (Photos need to be added again after signing up.)</p>
          <div className="flex gap-2">
            <Link to="/login" state={{ from: { pathname: '/sell-your-car' } }} className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold hover:bg-white/10"><LogIn size={15} /> Log in</Link>
            <Link to="/register?role=seller&next=/sell-your-car" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900"><UserPlus size={15} /> Sign up</Link>
          </div>
        </div>
      )}
      {user && !canSubmit && (
        <p className="mb-5 flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><Info size={16} className="mt-0.5 shrink-0" /> Staff accounts can’t submit cars. Log in with a buyer or seller account to try this out.</p>
      )}

      <RequiredNote className="mb-3" />
      <form onSubmit={submit} className="space-y-5">
        <section className="rdg-card p-6">
          <h2 className="mb-4 font-display text-xl font-bold uppercase italic tracking-wide">Your car</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Brand"><input required value={form.make} onChange={set('make')} placeholder="Toyota" className="w-full" /></Field>
            <Field label="Model"><input required value={form.model} onChange={set('model')} placeholder="Vios 1.3 E" className="w-full" /></Field>
            <Field label="Year"><input required type="number" inputMode="numeric" min="1980" max={new Date().getFullYear() + 1} value={form.year} onChange={set('year')} placeholder="2019" className="w-full" /></Field>
            <Field label="Mileage"><KmInput required value={form.mileage} onChange={(v) => setForm((f) => ({ ...f, mileage: v }))} placeholder="45,000" hint="short" max={1000000} /></Field>
            <Field label="Transmission">
              <Select required value={form.transmission} onChange={set('transmission')} className="w-full"><option value="">Choose</option><option>Automatic</option><option>Manual</option><option>CVT</option></Select>
            </Field>
            <Field label="Fuel">
              <Select required value={form.fuel_type} onChange={set('fuel_type')} className="w-full"><option value="">Choose</option><option>Gasoline</option><option>Diesel</option><option>Hybrid</option><option>Electric</option></Select>
            </Field>
            <Field label="Registered until" hint="Year on the latest OR">
              <Select required value={String(form.registered_until ?? '')} onChange={set('registered_until')} className="w-full">
                <option value="">Choose year</option>
                {REG_YEARS.map((y) => <option key={y} value={y}>{y}{y < THIS_YEAR ? ' (expired)' : ''}</option>)}
              </Select>
            </Field>
            <Field label="Color"><input value={form.color} onChange={set('color')} placeholder="Silver" className="w-full" /></Field>
          </div>

          <div className="mt-4">
            <span className="rdg-label is-required">Overall condition</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Overall condition">
              {CONDITIONS.map((c) => (
                <button type="button" role="radio" aria-checked={form.condition === c} key={c} onClick={() => setForm((f) => ({ ...f, condition: c }))}
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
          <h2 className="mb-1 font-display text-xl font-bold uppercase italic tracking-wide">Your asking price</h2>
          <p className="mb-4 text-sm text-slate-500">How much would you like for the car? Our offer is based on its condition and market prices.</p>
          <label className="block sm:max-w-sm">
            <span className="rdg-label">Asking price</span>
            <PesoInput required min={10000} max={50000000} value={form.asking_price} onChange={(v) => setForm((f) => ({ ...f, asking_price: v }))} placeholder="450,000" quick={[250000, 500000, 750000, 1000000, 1500000]} />
          </label>
        </section>

        <section id="photos" className="rdg-card scroll-mt-24 p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="mb-1 font-display text-xl font-bold uppercase italic tracking-wide">Photos</h2>
              <p className="text-sm text-slate-500">One photo per box. Shoot in daylight, the whole car in frame.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${requiredDone === REQUIRED_SLOTS.length ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {requiredDone} of {REQUIRED_SLOTS.length} required
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SLOTS.map(([key, label, required, max, tip]) => (
              <PhotoSlot key={key} label={label} required={required} max={max} tip={tip} files={photos[key] ?? []} missing={missing.includes(key)} onChange={(files) => setSlot(key, files)} />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Camera size={13} /> JPG or PNG, up to 10 MB each. On a phone, tapping a box opens the camera or gallery.</p>
        </section>

        <section className="rdg-card p-6">
          <h2 className="mb-4 font-display text-xl font-bold uppercase italic tracking-wide">How we reach you</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mobile number"><input required type="tel" inputMode="tel" value={form.contact_number} onChange={set('contact_number')} placeholder="0917 123 4567" className="w-full" /></Field>
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

/** One labelled upload box: empty → dashed "add" tile; filled → preview with replace/remove. */
function PhotoSlot({ label, required, max, tip, files, missing, onChange }) {
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])
  const multi = max > 1
  const add = (list) => onChange(multi ? [...files, ...list].slice(0, max) : list.slice(0, 1))

  return (
    <div className="min-w-0">
      <p className="mb-1 truncate text-xs font-bold text-slate-700" title={label}>
        {label}{required ? <span className="text-red-500"> *</span> : <span className="font-normal text-slate-400"> (optional)</span>}
      </p>
      {files.length > 0 ? (
        <div className="relative overflow-hidden rounded-xl ring-1 ring-slate-200">
          <img src={previews[0]} alt={label} className="aspect-[4/3] w-full object-cover" />
          {files.length > 1 && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">+{files.length - 1} more</span>}
          <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white"><Check size={12} strokeWidth={3} /></span>
          <div className="absolute right-1.5 top-1.5 flex gap-1">
            <label className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80" title={multi && files.length < max ? 'Add another' : 'Replace'}>
              {multi && files.length < max ? <ImagePlus size={14} /> : <RefreshCw size={13} />}
              <input type="file" accept="image/*" multiple={multi} className="sr-only" onChange={(e) => { add(Array.from(e.target.files)); e.target.value = '' }} />
            </label>
            <button type="button" aria-label={`Remove ${label} photo`} onClick={() => onChange([])} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"><X size={14} /></button>
          </div>
        </div>
      ) : (
        <label className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-2 text-center transition ${missing ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-900 hover:text-slate-900'}`}>
          <ImagePlus size={20} />
          <span className="text-[11px] leading-tight">{missing ? 'Required' : tip}</span>
          <input type="file" accept="image/*" multiple={multi} className="sr-only" onChange={(e) => { add(Array.from(e.target.files)); e.target.value = '' }} />
        </label>
      )}
    </div>
  )
}
