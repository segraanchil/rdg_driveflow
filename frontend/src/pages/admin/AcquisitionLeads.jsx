import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Gauge, CalendarDays, UserRound, Mail, ImageOff, X, ChevronLeft, ChevronRight, StickyNote, CarFront, Check,
  Search, Send, ThumbsUp, Ban, Lock, Hourglass, Phone, Expand, ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import apiClient, { backendUrl } from '../../api/client'
import { useConfirm } from '../../components/ui/Modal'
import { ProgressSteps } from '../../components/ui/kit'
import PesoInput, { pesoInWords } from '../../components/ui/PesoInput'
import { toast } from '../../lib/toast'

const STATUS = {
  submitted: { label: 'New', chip: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  under_appraisal: { label: 'Appraising', chip: 'bg-sky-50 text-sky-700 ring-sky-600/20' },
  offer_made: { label: 'Offer sent', chip: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
  accepted: { label: 'Accepted', chip: 'bg-green-50 text-green-700 ring-green-600/20' },
  declined: { label: 'Declined', chip: 'bg-slate-100 text-slate-500 ring-slate-500/20' },
}
const FILTERS = ['all', 'submitted', 'under_appraisal', 'offer_made', 'accepted', 'declined']
const STEPS = [['submitted', 'Received'], ['under_appraisal', 'Appraising'], ['offer_made', 'Offer sent'], ['accepted', 'Deal']]
const peso = (n) => `₱${Number(n).toLocaleString()}`

/** Acquisition lead review: shared screen, reachable by Admin and CEO ("Evaluate Acquisition Leads"). */
export default function AcquisitionLeads() {
  const [leads, setLeads] = useState(null)
  const [filter, setFilter] = useState('all')
  const [viewer, setViewer] = useState(null) // { photos, labels, index }

  function load() {
    apiClient.get('/shared/acquisition-leads', { silent: leads !== null }).then(({ data }) => setLeads(data.data ?? []))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { all: leads?.length ?? 0 }
    for (const l of leads ?? []) c[l.status] = (c[l.status] ?? 0) + 1
    return c
  }, [leads])
  const shown = (leads ?? []).filter((l) => filter === 'all' || l.status === filter)

  return (
    <div>
      <h1 className="mb-1">Acquisition Leads</h1>
      <p className="mb-4 text-sm text-slate-500">Cars sellers offered through &ldquo;Sell Your Car&rdquo;. Each card shows the one next step to take.</p>

      <ol className="mb-5 grid gap-2 rounded-2xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200 sm:grid-cols-4">
        {[
          [Search, '1. Start appraisal', 'You’re checking the photos or inspecting the car.'],
          [Send, '2. Send offer', 'Emails your price. The seller accepts or declines online.'],
          [ThumbsUp, '3. Accepted', 'Automatic when the seller accepts (or “said yes by phone”). The car is added to Inventory as “For inspection”.'],
          [Lock, 'Closed', 'Accepted or declined leads are locked.'],
        ].map(([Icon, t, d]) => (
          <li key={t} className="flex gap-2"><Icon size={15} className="mt-0.5 shrink-0 text-slate-900" /><span><strong className="block text-slate-900">{t}</strong>{d}</span></li>
        ))}
      </ol>

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ${filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400'}`}>
            {f === 'all' ? 'All' : STATUS[f].label} <span className="opacity-60">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {leads === null ? (
        <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="rdg-skeleton h-56 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rdg-card flex flex-col items-center p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><CarFront size={28} /></span>
          <p className="mt-4 font-bold text-slate-800">No leads here yet</p>
          <p className="mt-1 text-sm text-slate-500">New submissions appear here and in the notification bell.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {shown.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onSaved={load}
              onPhoto={(i) => setViewer({ photos: lead.photos_path ?? [], labels: lead.photo_labels ?? [], index: i })} />
          ))}
        </div>
      )}

      {viewer && <PhotoViewer {...viewer} onClose={() => setViewer(null)} onIndex={(index) => setViewer((v) => ({ ...v, index }))} />}
    </div>
  )
}

function Stepper({ status }) {
  if (status === 'declined') return null
  return <ProgressSteps className="mt-4" size="sm" steps={STEPS} current={STEPS.findIndex(([k]) => k === status)} complete={status === 'accepted'} />
}

function LeadCard({ lead, onSaved, onPhoto }) {
  const specs = lead.vehicle_specs ?? {}
  const photos = lead.photos_path ?? []
  const labels = lead.photo_labels ?? []
  const [offer, setOffer] = useState(lead.offer_amount ? String(Math.round(lead.offer_amount)) : '')
  const [notes, setNotes] = useState(lead.admin_notes ?? '')
  const [revising, setRevising] = useState(false)
  const [error, setError] = useState(null)
  const [confirm, confirmUi] = useConfirm()
  const status = STATUS[lead.status] ?? { label: lead.status, chip: 'bg-slate-100 text-slate-600' }
  const closed = ['accepted', 'declined'].includes(lead.status)
  const carName = `${specs.year ?? ''} ${specs.make ?? ''} ${specs.model ?? ''}`.trim()

  async function save(nextStatus, extra = {}) {
    setError(null)
    try {
      await apiClient.patch(`/shared/acquisition-leads/${lead.id}`, {
        status: nextStatus,
        offer_amount: offer === '' ? null : offer,
        admin_notes: notes || null,
        ...extra,
      }, { loadingText: nextStatus === 'offer_made' ? 'Sending offer…' : 'Updating lead…', quietErrors: true })
      setRevising(false)
      onSaved()
      return true
    } catch (err) {
      setError(err.response?.data?.errors ? Object.values(err.response.data.errors)[0][0] : err.response?.data?.message ?? 'Could not update this lead.')
      return false
    }
  }

  async function sendOffer() {
    if (!offer || Number(offer) <= 0) return setError('Enter your offer amount first.')
    const ok = await confirm({
      title: `Send ${peso(offer)} offer?`,
      message: <>We’ll email <strong>{lead.seller?.name ?? 'the seller'}</strong> an offer of <strong>{peso(offer)}</strong> ({pesoInWords(offer)}) for the {carName}. They can accept or decline it online.</>,
      confirmLabel: 'Send offer',
    })
    if (ok && await save('offer_made')) toast.success('Offer sent to the seller')
  }

  async function markAccepted() {
    const ok = await confirm({
      title: 'Seller said yes outside the app?',
      message: <>Use this only if the seller accepted the <strong>{peso(lead.offer_amount)}</strong> offer by phone, text or in person. The lead will be closed and can’t be changed after.</>,
      confirmLabel: 'Mark accepted',
    })
    if (ok && await save('accepted')) toast.success('Lead marked accepted')
  }

  async function decline() {
    const result = await confirm({
      title: 'Decline this car?',
      message: 'The seller gets an email that we can’t buy the car. The lead will be closed and can’t be changed after.',
      confirmLabel: 'Decline lead',
      tone: 'danger',
      input: 'Reason for the seller (optional), e.g. “Mileage too high for our lot.”',
    })
    if (result && await save('declined', { admin_notes: result.value || notes || null })) toast.success('Lead declined')
  }

  return (
    <article className="rdg-card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Photos */}
        <div className="bg-slate-50 p-4">
          {photos.length === 0 ? (
            <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
              <ImageOff size={30} />
              <span className="mt-1 text-xs">The seller didn&apos;t upload photos</span>
            </div>
          ) : (
            <>
              <button onClick={() => onPhoto(0)} className="group relative block w-full overflow-hidden rounded-xl">
                <img src={backendUrl(`/storage/${photos[0]}`)} alt={labels[0] ?? 'Main photo'} className="aspect-video w-full object-cover transition group-hover:scale-[1.02]" />
                {labels[0] && <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2.5 py-0.5 text-[11px] font-semibold text-white">{labels[0]}</span>}
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white"><Expand size={12} /> View {photos.length}</span>
              </button>
              {photos.length > 1 && (
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {photos.slice(1, 6).map((p, i) => (
                    <button key={p} onClick={() => onPhoto(i + 1)} className="relative overflow-hidden rounded-lg" title={labels[i + 1]}>
                      <img src={backendUrl(`/storage/${p}`)} alt={labels[i + 1] ?? `Photo ${i + 2}`} loading="lazy" className="aspect-square w-full object-cover hover:opacity-90" />
                      {i === 4 && photos.length > 6 && <span className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-sm font-bold text-white">+{photos.length - 6}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Details + next step */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Lead #{lead.id}</p>
              <h2 className="text-xl font-extrabold text-slate-900">{carName}</h2>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${status.chip}`}>{closed && <Lock size={11} />}{status.label}</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
            <p className="flex items-center gap-2 text-slate-600"><Gauge size={15} className="text-slate-400" /> {Number(specs.mileage ?? 0).toLocaleString()} km</p>
            <p className="flex items-center gap-2 text-slate-600"><CalendarDays size={15} className="text-slate-400" /> Sent {new Date(lead.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <p className="flex items-center gap-2 text-slate-600"><UserRound size={15} className="text-slate-400" /> {lead.seller?.name ?? '—'}</p>
            {lead.seller?.email && <a href={`mailto:${lead.seller.email}`} className="flex min-w-0 items-center gap-2 text-slate-700 hover:underline"><Mail size={15} className="shrink-0 text-slate-400" /> <span className="truncate">{lead.seller.email}</span></a>}
            {specs.contact_number && <a href={`tel:${specs.contact_number}`} className="flex items-center gap-2 font-semibold text-slate-800 hover:underline"><Phone size={15} className="text-slate-400" /> {specs.contact_number}</a>}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {[
              ['Asking price', specs.asking_price ? peso(specs.asking_price) : '—'],
              ['Condition', specs.condition],
              ['Papers', specs.complete_papers === undefined ? null : specs.complete_papers ? 'Complete OR/CR' : 'Incomplete'],
              ['Registered until', specs.registered_until ? `${specs.registered_until}${Number(specs.registered_until) < new Date().getFullYear() ? ' (expired)' : ''}` : null],
              ['Transmission', specs.transmission],
              ['Fuel', specs.fuel_type],
              ['Color', specs.color],
              ['Location', specs.location],
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

          <Stepper status={lead.status} />

          {/* Next step */}
          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            {closed ? (
              <div className="flex gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${lead.status === 'accepted' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{lead.status === 'accepted' ? <ThumbsUp size={17} /> : <Ban size={17} />}</span>
                <div className="text-sm">
                  <p className="font-bold text-slate-900">
                    {lead.status === 'accepted'
                      ? `${{ seller: 'The seller accepted', staff: 'Marked accepted by staff' }[lead.closed_by] ?? 'Accepted'} · ${peso(lead.offer_amount)}`
                      : { seller: `The seller declined the ${peso(lead.offer_amount)} offer`, staff: 'Declined by staff' }[lead.closed_by] ?? 'Declined'}
                  </p>
                  <p className="text-slate-500">{lead.status === 'accepted' ? 'Call the seller to schedule the inspection and hand-over.' : 'This lead is closed.'} <span className="inline-flex items-center gap-1 text-slate-400"><Lock size={12} /> Can’t be edited anymore.</span></p>
                  {lead.status === 'accepted' && (
                    <Link to="/admin/inventory?status=for_inspection" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-black">
                      <CarFront size={13} /> In Inventory as “For inspection” <ArrowRight size={13} />
                    </Link>
                  )}
                  {lead.admin_notes && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600"><StickyNote size={12} className="mr-1 inline" />{lead.admin_notes}</p>}
                </div>
              </div>
            ) : lead.status === 'offer_made' && !revising ? (
              <>
                <div className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700"><Hourglass size={17} /></span>
                  <div className="text-sm">
                    <p className="font-bold text-slate-900">Waiting for the seller · offer {peso(lead.offer_amount)}</p>
                    <p className="text-slate-500">The seller was emailed and can accept or decline on their submission page. You’ll get a notification.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={markAccepted} className="rdg-btn px-3 py-2 text-sm"><ThumbsUp size={15} /> Seller said yes by phone</button>
                  <button onClick={() => setRevising(true)} className="rdg-btn-ghost px-3 py-2 text-sm"><Send size={15} /> Change offer</button>
                  <button onClick={decline} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Ban size={15} /> Decline</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Next step</p>
                {lead.status === 'submitted' && !revising ? (
                  <>
                    <p className="mt-1 text-sm text-slate-600">New submission. Start the appraisal so the seller sees you’re on it, or send an offer right away.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={async () => (await save('under_appraisal')) && toast.success('Appraisal started')} className="rdg-btn px-3 py-2 text-sm"><Search size={15} /> Start appraisal</button>
                      <button onClick={() => setRevising(true)} className="rdg-btn-ghost px-3 py-2 text-sm"><Send size={15} /> Make an offer now</button>
                      <button onClick={decline} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Ban size={15} /> Not interested</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-slate-600">{revising && lead.status === 'offer_made' ? 'Send the seller a new amount. They’ll get another email.' : 'Enter your offer. The seller is emailed and answers online.'}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="rdg-label">Your offer</span>
                        <PesoInput required min={10000} value={offer} onChange={setOffer} placeholder="350,000" />
                        {specs.asking_price && <span className="mt-0.5 block text-xs text-slate-400">Seller asks {peso(specs.asking_price)}</span>}
                      </label>
                      <label className="block">
                        <span className="rdg-label">Note for the seller (optional)</span>
                        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full text-sm" placeholder="e.g. Price assumes the scratches on the rear bumper." />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={sendOffer} className="rdg-btn px-3 py-2 text-sm"><Send size={15} /> {lead.status === 'offer_made' ? 'Send new offer' : 'Send offer to seller'}</button>
                      {revising && <button onClick={() => setRevising(false)} className="rdg-btn-ghost px-3 py-2 text-sm">Cancel</button>}
                      {!revising && <button onClick={decline} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Ban size={15} /> Decline</button>}
                    </div>
                  </>
                )}
              </>
            )}
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
        </div>
      </div>
      {confirmUi}
    </article>
  )
}

/**
 * Full-screen photo viewer. Portalled to <body> so the page's animated wrapper can't trap it
 * (that is what broke it on phones). Swipe, arrow keys, thumbnails and the photo's label.
 */
function PhotoViewer({ photos, labels, index, onClose, onIndex }) {
  const go = (d) => onIndex((index + d + photos.length) % photos.length)
  const touch = useRef(null)
  const strip = useRef(null)

  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  useEffect(() => { strip.current?.querySelector(`[data-i="${index}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) }, [index])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photos" className="fixed inset-0 z-[110] flex flex-col bg-slate-950/95 text-white">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="min-w-0 truncate text-sm"><strong>{labels[index] ?? `Photo ${index + 1}`}</strong> <span className="text-white/60">· {index + 1} of {photos.length}</span></p>
        <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X size={22} /></button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 sm:px-16"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touch.current === null) return
          const dx = e.changedTouches[0].clientX - touch.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touch.current = null
        }}
      >
        <img key={photos[index]} src={backendUrl(`/storage/${photos[index]}`)} alt={labels[index] ?? `Photo ${index + 1}`} className="max-h-full max-w-full animate-rdg-fade-up select-none rounded-lg object-contain shadow-2xl" draggable={false} />
        {photos.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 hover:bg-white/20 active:!-translate-y-1/2 sm:left-4"><ChevronLeft size={26} /></button>
            <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 hover:bg-white/20 active:!-translate-y-1/2 sm:right-4"><ChevronRight size={26} /></button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div ref={strip} className="flex gap-2 overflow-x-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {photos.map((p, i) => (
            <button key={p} data-i={i} onClick={() => onIndex(i)} className={`shrink-0 overflow-hidden rounded-lg ring-2 ${i === index ? 'ring-white' : 'opacity-60 ring-transparent hover:opacity-100'}`}>
              <img src={backendUrl(`/storage/${p}`)} alt={labels[i] ?? ''} className="h-14 w-20 object-cover" loading="lazy" />
              <span className="block w-20 truncate bg-black/60 px-1 py-0.5 text-[10px]">{labels[i] ?? `Photo ${i + 1}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
