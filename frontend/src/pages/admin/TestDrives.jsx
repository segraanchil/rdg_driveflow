import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, Check, X, Flag, Mail, MessageSquareText } from 'lucide-react'
import apiClient from '../../api/client'
import { useConfirm } from '../../components/ui/Modal'
import { EmptyState, ListSkeleton, PageHeader, StatusBadge, Tabs } from '../../components/ui/kit'
import { formatDate, formatTime, vehicleName } from '../../lib/format'
import { toast } from '../../lib/toast'

/** Test drive requests, grouped by day. Confirming never reserves the car. */
export default function TestDrives() {
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState(null)
  const [confirm, confirmUi] = useConfirm()

  const load = useCallback(() => {
    apiClient.get('/admin/test-drives', { silent: rows !== null }).then(({ data }) => setRows(data.data ?? []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(load, [load])

  const filtered = (rows ?? []).filter((t) =>
    tab === 'pending' ? t.status === 'pending' : tab === 'upcoming' ? t.status === 'confirmed' : !['pending', 'confirmed'].includes(t.status))

  const groups = useMemo(() => {
    const map = new Map()
    filtered.forEach((t) => {
      const key = formatDate(t.preferred_at, { weekday: 'long' })
      map.set(key, [...(map.get(key) ?? []), t])
    })
    return [...map.entries()]
  }, [filtered])

  async function decide(t, action) {
    const result = await confirm({
      title: action === 'confirm' ? 'Confirm this test drive?' : 'Decline this request?',
      message: <>{t.buyer?.name} · {vehicleName(t.vehicle)} · {formatDate(t.preferred_at, { weekday: 'short' })}, {formatTime(t.preferred_at)}. The buyer is emailed.</>,
      confirmLabel: action === 'confirm' ? 'Confirm' : 'Decline',
      tone: action === 'confirm' ? undefined : 'danger',
      input: action === 'confirm' ? 'Note for the buyer, e.g. “Ask for Mark at the front desk” (optional)' : 'Reason or another time to suggest (optional)',
    })
    if (!result) return
    await apiClient.patch(`/admin/test-drives/${t.id}/${action}`, { admin_notes: result.value || undefined })
    toast.success(action === 'confirm' ? 'Test drive confirmed' : 'Request declined')
    load()
  }

  async function complete(t) {
    await apiClient.patch(`/admin/test-drives/${t.id}/complete`)
    toast.success('Marked as done')
    load()
  }

  const count = (s) => (rows ?? []).filter((t) => t.status === s).length

  return (
    <div>
      <PageHeader title="Test Drives" />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'pending', label: 'Requests', count: count('pending') },
        { key: 'upcoming', label: 'Confirmed', count: count('confirmed') },
        { key: 'records', label: 'Records' },
      ]} />

      {rows === null ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState icon={CalendarClock} title={tab === 'pending' ? 'No new requests' : tab === 'records' ? 'No records yet' : 'Nothing here'} text="Buyers request test drives from a car’s page." />
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{day}</h2>
              <ul className="space-y-2">
                {items.map((t) => (
                  <li key={t.id} className="rdg-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-900 text-white">
                      <span className="text-sm font-extrabold">{formatTime(t.preferred_at)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{vehicleName(t.vehicle)}</p>
                        <StatusBadge kind="test_drive" status={t.status} />
                        {t.vehicle?.status && t.vehicle.status !== 'available' && <StatusBadge kind="vehicle" status={t.vehicle.status} />}
                      </div>
                      <p className="flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                        {t.buyer?.name}
                        <a href={`mailto:${t.buyer?.email}`} className="flex items-center gap-1 hover:text-emerald-700"><Mail size={13} /> {t.buyer?.email}</a>
                      </p>
                      {t.note && <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500"><MessageSquareText size={13} className="mt-0.5 shrink-0" /> “{t.note}”</p>}
                      {t.admin_notes && <p className="mt-1 text-xs text-slate-400">Staff note: {t.admin_notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {t.status === 'pending' && (
                        <>
                          <button onClick={() => decide(t, 'confirm')} className="rdg-btn px-3 py-2"><Check size={16} /> Confirm</button>
                          <button onClick={() => decide(t, 'decline')} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><X size={16} /> Decline</button>
                        </>
                      )}
                      {t.status === 'confirmed' && new Date(t.preferred_at) <= new Date() && (
                        <button onClick={() => complete(t)} className="rdg-btn-ghost px-3 py-2"><Flag size={15} /> Mark done</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {confirmUi}
    </div>
  )
}
