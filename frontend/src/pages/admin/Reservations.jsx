import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Check, X, ZoomIn, ClipboardCheck, Receipt, Mail, CarFront } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import { Modal, useConfirm } from '../../components/ui/Modal'
import { Chip, EmptyState, ListSkeleton, PageHeader, StatusBadge, Tabs } from '../../components/ui/kit'
import { formatDateTime, peso, vehicleName } from '../../lib/format'
import { toast } from '../../lib/toast'

const HOLD_MS = 48 * 3_600_000
const CHANNEL = { gcash: 'GCash', bank_transfer: 'Bank transfer' }

/** Reservation & payment proof verification queue, with the live 48-hour hold timer (Stories 18–19). */
export default function Reservations() {
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState(null)
  const [counts, setCounts] = useState({})
  const [proof, setProof] = useState(null)
  const [confirm, confirmUi] = useConfirm()
  const now = useNow()

  const load = useCallback(() => {
    apiClient.get('/admin/reservations', { params: { status: tab } }).then(({ data }) => {
      setRows(data.data ?? [])
      setCounts(data.counts ?? {})
    })
  }, [tab])

  useEffect(() => {
    setRows(null)
    load()
  }, [load])

  async function verify(r) {
    const ok = await confirm({
      title: 'Verify this payment?',
      message: <>Confirm you received the reservation payment from <strong>{r.buyer?.name}</strong>. The buyer is emailed that the {vehicleName(r.vehicle)} is reserved for them.</>,
      confirmLabel: 'Verify payment',
    })
    if (!ok) return
    await apiClient.post(`/admin/reservations/${r.id}/verify`)
    toast.success('Payment verified. The buyer has been notified.')
    setProof(null)
    load()
  }

  async function reject(r) {
    const result = await confirm({
      title: 'Reject this reservation?',
      message: <>The {vehicleName(r.vehicle)} goes back on sale and <strong>{r.buyer?.name}</strong> is emailed. Add a reason so they know what to fix.</>,
      confirmLabel: 'Reject and release car',
      tone: 'danger',
      input: 'Reason, e.g. “Receipt is unreadable” (optional)',
    })
    if (!result) return
    await apiClient.post(`/admin/reservations/${r.id}/reject`, { reason: result.value || undefined })
    toast.success('Reservation rejected. The car is available again.')
    setProof(null)
    load()
  }

  return (
    <div>
      <PageHeader title="Reservations" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'pending', label: 'To verify', count: counts.pending },
          { key: 'verified', label: 'Verified', count: counts.verified },
          { key: 'closed', label: 'Closed' },
          { key: 'all', label: 'All' },
        ]}
      />

      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={tab === 'pending' ? 'No payments to verify' : 'Nothing here'} text={tab === 'pending' ? 'New reservations appear here as soon as a buyer uploads a receipt.' : undefined} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const cover = r.vehicle?.media?.[0]
            const left = new Date(r.expires_at).getTime() - now
            const urgent = r.status === 'pending' && left < 6 * 3_600_000
            return (
              <li key={r.id} className={`rdg-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${urgent ? 'ring-2 ring-red-200' : ''}`}>
                <button onClick={() => setProof(r)} className="group relative h-20 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-28" title="View proof of payment">
                  {r.payment_proof_path ? (
                    <>
                      <img src={backendUrl(`/storage/${r.payment_proof_path}`)} alt="Proof of payment" className="h-full w-full object-cover" loading="lazy" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100"><ZoomIn size={20} /></span>
                    </>
                  ) : <span className="flex h-full items-center justify-center text-xs text-slate-400">No receipt</span>}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{vehicleName(r.vehicle)}</p>
                    <StatusBadge kind="reservation" status={r.status} />
                    <Chip tone={r.payment_method === 'financing' ? 'blue' : 'slate'}>{r.payment_method === 'financing' ? 'Bank financing' : 'Straight cash'}</Chip>
                    {r.payment_channel && <Chip tone="violet">Paid via {CHANNEL[r.payment_channel] ?? r.payment_channel}</Chip>}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                    <span>{r.buyer?.name}</span>
                    <a href={`mailto:${r.buyer?.email}`} className="flex items-center gap-1 hover:text-emerald-700"><Mail size={13} /> {r.buyer?.email}</a>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Submitted {formatDateTime(r.created_at)} · Fee {r.fee_amount ? peso(r.fee_amount) : '—'}{r.payment_reference ? ` · Ref. ${r.payment_reference}` : ''} · Car price {peso(r.vehicle?.selling_price)}
                  </p>
                </div>

                {r.status === 'pending' && <HoldTimer left={left} />}

                <div className="flex shrink-0 gap-2">
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => verify(r)} className="rdg-btn px-3 py-2"><Check size={16} /> Verify</button>
                      <button onClick={() => reject(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><X size={16} /> Reject</button>
                    </>
                  )}
                  {r.status === 'verified' && !r.sale && r.vehicle?.status !== 'sold' && (
                    <>
                      <Link to={`/admin/sales?reservation=${r.id}`} className="rdg-btn px-3 py-2"><Receipt size={16} /> Record sale</Link>
                      <button onClick={() => reject(r)} className="rdg-btn-ghost px-3 py-2 text-red-600">Cancel</button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={Boolean(proof)}
        onClose={() => setProof(null)}
        size="lg"
        title={proof ? `Proof of payment · ${vehicleName(proof.vehicle)}` : ''}
        footer={proof?.status === 'pending' && (
          <>
            <button onClick={() => reject(proof)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><X size={16} /> Reject</button>
            <button onClick={() => verify(proof)} className="rdg-btn"><Check size={16} /> Verify payment</button>
          </>
        )}
      >
        {proof && (
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
            {proof.payment_proof_path ? (
              <a href={backendUrl(`/storage/${proof.payment_proof_path}`)} target="_blank" rel="noreferrer">
                <img src={backendUrl(`/storage/${proof.payment_proof_path}`)} alt="Proof of payment" className="max-h-[60vh] w-full rounded-xl bg-slate-100 object-contain" />
              </a>
            ) : <div className="flex h-40 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><CarFront /></div>}
            <dl className="space-y-3 text-sm">
              <Info label="Buyer" value={<>{proof.buyer?.name}<br /><span className="text-slate-500">{proof.buyer?.email}</span></>} />
              <Info label="Expected fee" value={proof.fee_amount ? peso(proof.fee_amount) : '—'} />
              <Info label="Payment path" value={proof.payment_method === 'financing' ? 'Bank financing' : 'Straight cash'} />
              <Info label="Paid via" value={CHANNEL[proof.payment_channel] ?? 'Not specified'} />
              {proof.payment_reference && <Info label="Reference no." value={<span className="font-mono font-bold">{proof.payment_reference}</span>} />}
              <Info label="Submitted" value={formatDateTime(proof.created_at)} />
              {proof.status === 'pending' && <Info label="Hold ends" value={<span className="font-bold text-amber-700">{formatDateTime(proof.expires_at)}</span>} />}
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Open the {CHANNEL[proof.payment_channel] ?? 'GCash or bank'} app and confirm the amount, date and reference number reached our account before verifying.</p>
            </dl>
          </div>
        )}
      </Modal>
      {confirmUi}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  )
}

function HoldTimer({ left }) {
  const ms = Math.max(0, left)
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const pct = Math.min(100, (ms / HOLD_MS) * 100)
  const tone = ms < 6 * 3_600_000 ? 'text-red-600' : ms < 24 * 3_600_000 ? 'text-amber-600' : 'text-emerald-600'
  const bar = ms < 6 * 3_600_000 ? 'bg-red-500' : ms < 24 * 3_600_000 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="w-full shrink-0 sm:w-36" title="Time left before the car is released automatically">
      <p className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wide ${tone}`}><Clock size={13} /> Hold</p>
      <p className={`font-mono text-lg font-extrabold tabular-nums ${tone}`}>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function useNow() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}
