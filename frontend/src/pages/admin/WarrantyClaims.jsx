import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Paperclip, Mail } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, Field, ListSkeleton, PageHeader, StatusBadge, Tabs } from '../../components/ui/kit'
import { formatDate, timeAgo, vehicleName } from '../../lib/format'
import { toast } from '../../lib/toast'

const STATUSES = [
  ['submitted', 'Submitted'],
  ['under_review', 'Under review'],
  ['approved', 'Approved'],
  ['rejected', 'Not approved'],
  ['refunded', 'Refunded'],
]

const isImage = (p) => /\.(jpe?g|png|webp|gif)$/i.test(p)

/** Warranty claim tickets (Story 22): track, update status, keep internal notes. */
export default function WarrantyClaims() {
  const [tab, setTab] = useState('open')
  const [claims, setClaims] = useState(null)
  const [open, setOpen] = useState(null)

  const load = useCallback(() => {
    apiClient.get('/admin/warranty-claims', { silent: claims !== null }).then(({ data }) => setClaims(data.data ?? []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(load, [load])

  const isOpen = (c) => ['submitted', 'under_review'].includes(c.status)
  const shown = (claims ?? []).filter((c) => (tab === 'open' ? isOpen(c) : tab === 'closed' ? !isOpen(c) : true))

  return (
    <div>
      <PageHeader title="Warranty Claims" subtitle="1-month money-back guarantee tickets. Changing the status emails the buyer; internal notes stay private." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'open', label: 'Open', count: (claims ?? []).filter(isOpen).length },
        { key: 'closed', label: 'Closed' },
        { key: 'all', label: 'All' },
      ]} />

      {claims === null ? (
        <ListSkeleton />
      ) : shown.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={tab === 'open' ? 'No open claims' : 'No claims here'} text="Buyers file claims from My Garage within a month of purchase." />
      ) : (
        <ul className="space-y-3">
          {shown.map((c) => (
            <li key={c.id}>
              <button onClick={() => setOpen(c)} className="rdg-card flex w-full flex-col gap-2 p-4 text-left transition hover:shadow-lift sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-700">{c.ticket_number}</span>
                    <StatusBadge kind="warranty" status={c.status} />
                    <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="mt-1 font-semibold text-slate-900">{vehicleName(c.sale?.vehicle)} · {c.sale?.buyer?.name}</p>
                  <p className="line-clamp-2 text-sm text-slate-500">{c.issue_description}</p>
                </div>
                {(c.evidence_path ?? []).length > 0 && <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-500"><Paperclip size={13} /> {c.evidence_path.length} file{c.evidence_path.length === 1 ? '' : 's'}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <ClaimModal claim={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load() }} />}
    </div>
  )
}

function ClaimModal({ claim, onClose, onSaved }) {
  const [status, setStatus] = useState(claim.status)
  const [notes, setNotes] = useState(claim.admin_notes ?? '')
  const daysSinceSale = Math.floor((Date.now() - new Date(`${claim.sale?.sale_date}T00:00:00`).getTime()) / 86_400_000)

  async function save() {
    await apiClient.patch(`/admin/warranty-claims/${claim.id}`, { status, admin_notes: notes || null })
    toast.success(status !== claim.status ? 'Claim updated. The buyer has been emailed.' : 'Notes saved')
    onSaved()
  }

  return (
    <Modal open size="lg" onClose={onClose} title={`Claim ${claim.ticket_number}`} footer={<><button onClick={onClose} className="rdg-btn-ghost">Close</button><button onClick={save} className="rdg-btn">Save</button></>}>
      <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div>
            <p className="rdg-label">Reported issue</p>
            <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{claim.issue_description}</p>
          </div>
          {(claim.evidence_path ?? []).length > 0 && (
            <div>
              <p className="rdg-label">Evidence</p>
              <div className="grid grid-cols-3 gap-2">
                {claim.evidence_path.map((p) => (
                  <a key={p} href={backendUrl(`/storage/${p}`)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                    {isImage(p) ? <img src={backendUrl(`/storage/${p}`)} alt="" className="aspect-square w-full object-cover" loading="lazy" /> : <span className="flex aspect-square items-center justify-center text-xs font-semibold text-slate-500"><Paperclip size={16} /> File</span>}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-3 text-sm">
            <p className="font-bold text-slate-900">{vehicleName(claim.sale?.vehicle)}</p>
            <p className="text-slate-500">{claim.sale?.buyer?.name}</p>
            <a href={`mailto:${claim.sale?.buyer?.email}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-700"><Mail size={12} /> {claim.sale?.buyer?.email}</a>
            <p className="mt-2 text-xs text-slate-500">Sold {formatDate(claim.sale?.sale_date)} · filed on day {Math.max(0, daysSinceSale)} of 30</p>
          </div>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
              {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Internal notes" hint="Inspection findings, category (mechanical, electrical…), actions taken.">
            <textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
