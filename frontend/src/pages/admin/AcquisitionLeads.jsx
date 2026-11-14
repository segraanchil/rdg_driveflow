import { useEffect, useMemo, useState } from 'react'
import { Gauge, CalendarDays, UserRound, Mail, ImageOff, X, ChevronLeft, ChevronRight, Banknote, StickyNote, CarFront } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'

const STATUS = {
  submitted: { label: 'Submitted', chip: 'bg-blue-50 text-blue-700' },
  under_appraisal: { label: 'Under appraisal', chip: 'bg-amber-50 text-amber-700' },
  offer_made: { label: 'Offer made', chip: 'bg-violet-50 text-violet-700' },
  accepted: { label: 'Accepted', chip: 'bg-green-50 text-green-700' },
  declined: { label: 'Declined', chip: 'bg-slate-100 text-slate-500' },
}
const FILTERS = ['all', 'submitted', 'under_appraisal', 'offer_made', 'accepted', 'declined']
const peso = (n) => `₱${Number(n).toLocaleString()}`

/** Acquisition lead review: shared screen, reachable by Admin and CEO ("Evaluate Acquisition Leads"). */
export default function AcquisitionLeads() {
  const [leads, setLeads] = useState(null)
  const [filter, setFilter] = useState('all')
  const [viewer, setViewer] = useState(null) // { photos, index }

  function load() {
    apiClient.get('/shared/acquisition-leads').then(({ data }) => setLeads(data.data ?? []))
  }
  useEffect(load, [])

  const counts = useMemo(() => {
    const c = { all: leads?.length ?? 0 }
    for (const l of leads ?? []) c[l.status] = (c[l.status] ?? 0) + 1
    return c
  }, [leads])
  const shown = (leads ?? []).filter((l) => filter === 'all' || l.status === filter)

  return (
    <div>
      <h1 className="mb-1">Acquisition Leads</h1>
      <p className="mb-6 text-sm text-slate-500">Cars submitted by sellers through &ldquo;Sell Your Car&rdquo;. Review the photos, record your offer, and decide.</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-400'}`}
          >
            {f === 'all' ? 'All' : STATUS[f].label} <span className="opacity-60">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {leads === null ? (
        <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="rdg-skeleton h-56 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rdg-card flex flex-col items-center p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CarFront size={28} /></span>
          <p className="mt-4 font-bold text-slate-800">No leads here yet</p>
          <p className="mt-1 text-sm text-slate-500">New submissions appear here and in the notification bell.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {shown.map((lead) => <LeadCard key={lead.id} lead={lead} onSaved={load} onPhoto={(i) => setViewer({ photos: lead.photos_path ?? [], index: i })} />)}
        </div>
      )}

      {viewer && <PhotoViewer {...viewer} onClose={() => setViewer(null)} onIndex={(index) => setViewer((v) => ({ ...v, index }))} />}
    </div>
  )
}

function LeadCard({ lead, onSaved, onPhoto }) {
  const specs = lead.vehicle_specs ?? {}
  const photos = lead.photos_path ?? []
  const [offer, setOffer] = useState(lead.offer_amount ?? '')
  const [notes, setNotes] = useState(lead.admin_notes ?? '')
  const [error, setError] = useState(null)
  const status = STATUS[lead.status] ?? { label: lead.status, chip: 'bg-slate-100 text-slate-600' }

  async function save(nextStatus) {
    setError(null)
    try {
      await apiClient.patch(`/shared/acquisition-leads/${lead.id}`, {
        status: nextStatus,
        offer_amount: offer === '' ? null : offer,
        admin_notes: notes || null,
      }, { loadingText: nextStatus === 'offer_made' ? 'Sending offer…' : 'Updating lead…' })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not update this lead.')
    }
  }

  return (
    <article className="rdg-card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Photos */}
        <div className="bg-slate-50 p-4">
          {photos.length === 0 ? (
            <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
              <ImageOff size={30} />
              <span className="mt-1 text-xs">The seller didn&apos;t upload photos</span>
            </div>
          ) : (
            <>
              <button onClick={() => onPhoto(0)} className="block w-full overflow-hidden rounded-xl">
                <img src={backendUrl(`/storage/${photos[0]}`)} alt="Main photo" className="aspect-video w-full object-cover transition hover:scale-[1.02]" />
              </button>
              {photos.length > 1 && (
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {photos.slice(1, 6).map((p, i) => (
                    <button key={p} onClick={() => onPhoto(i + 1)} className="relative overflow-hidden rounded-lg">
                      <img src={backendUrl(`/storage/${p}`)} alt={`Photo ${i + 2}`} loading="lazy" className="aspect-square w-full object-cover hover:opacity-90" />
                      {i === 4 && photos.length > 6 && (
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-sm font-bold text-white">+{photos.length - 6}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-slate-400">{photos.length} photo{photos.length === 1 ? '' : 's'}. Tap to enlarge.</p>
            </>
          )}
        </div>

        {/* Details + evaluation */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Lead #{lead.id}</p>
              <h2 className="text-xl font-extrabold text-slate-900">{specs.year} {specs.make} {specs.model}</h2>
            </div>
            <span className={`rdg-chip ${status.chip}`}>{status.label}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <p className="flex items-center gap-2 text-slate-600"><Gauge size={15} className="text-emerald-600" /> {Number(specs.mileage ?? 0).toLocaleString()} km</p>
            <p className="flex items-center gap-2 text-slate-600"><CalendarDays size={15} className="text-emerald-600" /> {new Date(lead.created_at).toLocaleDateString()}</p>
            <p className="flex items-center gap-2 text-slate-600"><UserRound size={15} className="text-emerald-600" /> {lead.seller?.name ?? '—'}</p>
            {lead.seller?.email && <a href={`mailto:${lead.seller.email}`} className="flex items-center gap-2 truncate text-emerald-700 hover:underline"><Mail size={15} /> {lead.seller.email}</a>}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {[
              ['Asking price', specs.asking_price ? peso(specs.asking_price) : '—'],
              ['Condition', specs.condition],
              ['Papers', specs.complete_papers === undefined ? null : specs.complete_papers ? 'Complete OR/CR' : 'Incomplete'],
              ['Transmission', specs.transmission],
              ['Fuel', specs.fuel_type],
              ['Color', specs.color],
              ['Location', specs.location],
              ['Mobile', specs.contact_number && <a href={`tel:${specs.contact_number}`} className="font-semibold underline">{specs.contact_number}</a>],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-50 px-2.5 py-2"><dt className="text-slate-400">{k}</dt><dd className="font-semibold text-slate-800">{v}</dd></div>
            ))}
          </dl>

          {specs.condition_notes && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Seller&apos;s notes</p>
              {specs.condition_notes}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr]">
            <label>
              <span className="rdg-label flex items-center gap-1"><Banknote size={13} /> Offer (₱)</span>
              <input type="number" min="0" value={offer} onChange={(e) => setOffer(e.target.value)} className="w-full text-sm" placeholder="e.g. 350000" />
            </label>
            <label>
              <span className="rdg-label flex items-center gap-1"><StickyNote size={13} /> Appraisal notes (seller can see)</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full text-sm" placeholder="Condition, inspection schedule…" />
            </label>
          </div>
          {lead.offer_amount && <p className="mt-2 text-xs text-slate-500">Current offer: <strong className="text-slate-800">{peso(lead.offer_amount)}</strong></p>}
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => save('under_appraisal')} className="rdg-btn-ghost px-3 py-2 text-xs">Start appraisal</button>
            <button onClick={() => save('offer_made')} className="rdg-btn px-3 py-2 text-xs">Send offer</button>
            <button onClick={() => save('accepted')} className="rdg-btn-dark px-3 py-2 text-xs">Mark accepted</button>
            <button onClick={() => save('declined')} className="inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Decline</button>
          </div>
        </div>
      </div>
    </article>
  )
}

function PhotoViewer({ photos, index, onClose, onIndex }) {
  const go = (d) => onIndex((index + d + photos.length) % photos.length)
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-4" onClick={onClose}>
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X size={22} /></button>
      {photos.length > 1 && <button onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Previous photo" className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ChevronLeft size={26} /></button>}
      <img src={backendUrl(`/storage/${photos[index]}`)} alt={`Photo ${index + 1}`} onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" />
      {photos.length > 1 && <button onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Next photo" className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ChevronRight size={26} /></button>}
      <p className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white">{index + 1} / {photos.length}</p>
    </div>
  )
}
