import { useCallback, useEffect, useState } from 'react'
import { Landmark, Download, CheckCircle2, Circle, Mail, Eye } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, Field, ListSkeleton, PageHeader, StatusBadge, Tabs } from '../../components/ui/kit'
import { PROFILE_LABELS, docLabel, formatDate, peso, vehicleName } from '../../lib/format'
import { toast } from '../../lib/toast'

/**
 * Financing applications: check each uploaded requirement against the profile's checklist,
 * download the packet for the partner bank (Story 20), and record the bank's decision.
 */
export default function Financing() {
  const [tab, setTab] = useState('')
  const [apps, setApps] = useState(null)
  const [deciding, setDeciding] = useState(null)

  const load = useCallback(() => {
    apiClient.get('/admin/financing-applications', { params: { status: tab || undefined }, silent: apps !== null }).then(({ data }) => setApps(data.data ?? []))
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(load, [load])

  async function verifyDocument(docId) {
    await apiClient.post(`/admin/financing-documents/${docId}/verify`)
    toast.success('Document verified')
    load()
  }

  return (
    <div>
      <PageHeader title="Financing" subtitle="Verify each buyer’s requirements, download them for the partner bank, then record the bank’s decision. The buyer is emailed when it’s approved or declined." />
      <Tabs value={tab} onChange={(k) => { setApps(null); setTab(k) }} tabs={[
        { key: '', label: 'All' },
        { key: 'pending', label: 'Collecting documents' },
        { key: 'documents_review', label: 'With the bank' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Not approved' },
      ]} />

      {apps === null ? (
        <ListSkeleton />
      ) : apps.length === 0 ? (
        <EmptyState icon={Landmark} title="No financing applications" text="Applications appear here when a buyer applies from a car’s page." />
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            const required = app.required_documents ?? []
            const docsByType = Object.fromEntries((app.documents ?? []).map((d) => [d.doc_type, d]))
            const uploaded = required.filter((t) => docsByType[t]).length
            const verified = required.filter((t) => docsByType[t]?.verified).length
            return (
              <div key={app.id} className="rdg-card overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{app.buyer?.name}</p>
                      <StatusBadge kind="financing" status={app.status} />
                    </div>
                    <p className="text-sm text-slate-500">{vehicleName(app.vehicle)} · {PROFILE_LABELS[app.employment_profile]} · applied {formatDate(app.created_at)}</p>
                    <a href={`mailto:${app.buyer?.email}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-700"><Mail size={12} /> {app.buyer?.email}</a>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <Stat label="Price" value={peso(app.vehicle?.selling_price)} />
                    <Stat label="Down payment" value={peso(app.down_payment)} />
                    <Stat label="Term" value={`${app.term_months} mo`} />
                    <Stat label="Est. monthly" value={app.monthly_amortization ? peso(app.monthly_amortization) : '—'} />
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Requirements · {uploaded}/{required.length} uploaded · {verified} verified</p>
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${required.length ? (verified / required.length) * 100 : 0}%` }} /></div>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {required.map((type) => {
                      const doc = docsByType[type]
                      return (
                        <li key={type} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${doc?.verified ? 'border-emerald-200 bg-emerald-50/50' : doc ? 'border-amber-200 bg-amber-50/40' : 'border-dashed border-slate-200'}`}>
                          {doc?.verified ? <CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> : <Circle size={18} className={`shrink-0 ${doc ? 'text-amber-500' : 'text-slate-300'}`} />}
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-slate-800">{docLabel(type)}</span>
                            <span className="text-xs text-slate-500">{doc ? (doc.verified ? 'Verified' : `Uploaded ${formatDate(doc.created_at)}, needs checking`) : 'Not uploaded yet'}</span>
                          </span>
                          {doc && (
                            <span className="flex shrink-0 gap-1">
                              <a href={backendUrl(`/storage/${doc.file_path}`)} target="_blank" rel="noreferrer" title="Open" className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-emerald-700"><Eye size={16} /></a>
                              <a href={backendUrl(`/api/admin/financing-documents/${doc.id}/download`)} title="Download" className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-emerald-700"><Download size={16} /></a>
                              {!doc.verified && <button onClick={() => verifyDocument(doc.id)} className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-600">Verify</button>}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  {app.admin_notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><strong className="text-slate-800">Notes:</strong> {app.admin_notes}</p>}
                  <div className="mt-3 flex justify-end">
                    <button onClick={() => setDeciding(app)} className="rdg-btn-dark">Update status</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deciding && <DecisionModal app={deciding} onClose={() => setDeciding(null)} onSaved={() => { setDeciding(null); load() }} />}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-bold tabular-nums text-slate-800">{value}</p>
    </div>
  )
}

function DecisionModal({ app, onClose, onSaved }) {
  const [status, setStatus] = useState(app.status)
  const [notes, setNotes] = useState(app.admin_notes ?? '')

  async function save() {
    await apiClient.patch(`/admin/financing-applications/${app.id}`, { status, admin_notes: notes || null })
    toast.success('Application updated')
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={`Financing · ${app.buyer?.name}`} footer={<><button onClick={onClose} className="rdg-btn-ghost">Cancel</button><button onClick={save} className="rdg-btn">Save</button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[['pending', 'Collecting documents'], ['documents_review', 'Sent to the bank'], ['approved', 'Approved by the bank'], ['rejected', 'Not approved']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setStatus(key)}
              className={`rounded-xl border p-3 text-left text-sm font-semibold ${status === key ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20' : 'border-slate-200 text-slate-600'}`}>{label}</button>
          ))}
        </div>
        <Field label="Internal notes" hint="Bank name, reference number, conditions…">
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" />
        </Field>
        {['approved', 'rejected'].includes(status) && status !== app.status && <p className="text-xs text-slate-500">The buyer will be emailed about this decision.</p>}
      </div>
    </Modal>
  )
}
