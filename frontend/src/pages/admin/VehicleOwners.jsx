import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, IdCard, Mail } from 'lucide-react'
import apiClient from '../../api/client'
import OwnerModal from '../../components/admin/OwnerModal'
import { EmptyState, ListSkeleton, PageHeader, StatusBadge, Tabs } from '../../components/ui/kit'
import { RELATIONSHIP_LABELS, formatDate, vehicleName } from '../../lib/format'

/** People buyers want named on the Deed of Sale: validate their driver's license and details. */
export default function VehicleOwners() {
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState(null)
  const [pending, setPending] = useState(0)
  const [open, setOpen] = useState(null)

  const load = useCallback(() => {
    apiClient.get('/admin/intended-owners', { params: { status: tab } }).then(({ data }) => {
      setRows(data.data ?? [])
      setPending(data.counts?.pending ?? 0)
    })
  }, [tab])

  useEffect(() => {
    setRows(null)
    load()
  }, [load])

  return (
    <div>
      <PageHeader title="Vehicle Owners" />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'pending', label: 'To validate', count: pending },
        { key: 'approved', label: 'Validated' },
        { key: 'rejected', label: 'Rejected' },
      ]} />

      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={IdCard} title={tab === 'pending' ? 'No owners to validate' : 'Nothing here'} text={tab === 'pending' ? 'When a buyer names the car to someone else, their driver’s license appears here.' : undefined} />
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => (
            <li key={o.id} className="rdg-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><IdCard size={22} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">{o.full_name}</p>
                  <StatusBadge kind="owner" status={o.status} />
                </div>
                <p className="text-sm text-slate-500">{RELATIONSHIP_LABELS[o.relationship] ?? 'Other'} · {o.age} years old · {vehicleName(o.vehicle)}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                  <span>Buyer: {o.buyer?.name}</span>
                  <a href={`mailto:${o.buyer?.email}`} className="flex items-center gap-1 hover:text-slate-700"><Mail size={12} /> {o.buyer?.email}</a>
                  <span>{o.status === 'pending' ? 'Sent' : 'Reviewed'} {formatDate(o.status === 'pending' ? o.updated_at : o.reviewed_at)}</span>
                </p>
                {o.status === 'rejected' && <p className="mt-1 text-xs text-red-700">Reason: {o.rejection_reason}</p>}
              </div>
              <button type="button" onClick={() => setOpen(o)} className={o.status === 'pending' ? 'rdg-btn' : 'rdg-btn-ghost'}>{o.status === 'pending' ? 'Validate' : 'Open'} <ArrowRight size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      {open && <OwnerModal owner={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load() }} />}
    </div>
  )
}
