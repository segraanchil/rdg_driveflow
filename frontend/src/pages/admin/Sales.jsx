import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Receipt, CheckCircle2, Store, ClipboardCheck, IdCard } from 'lucide-react'
import apiClient from '../../api/client'
import { Modal } from '../../components/ui/Modal'
import { Chip, EmptyState, Field, ListSkeleton, PageHeader, SearchInput, StatusBadge } from '../../components/ui/kit'
import DocumentButtons from '../../components/admin/DocumentButtons'
import OwnerModal from '../../components/admin/OwnerModal'
import { apiError, formatDate, peso, vehicleName } from '../../lib/format'
import { toast } from '../../lib/toast'
import Select from '../../components/ui/Select'
import PesoInput from '../../components/ui/PesoInput'

/**
 * "Record Sale": turns a verified reservation (or a walk-in deal) into the official sale that
 * invoices and legal documents attach to, and marks the car Sold.
 */
export default function Sales() {
  const [params, setParams] = useSearchParams()
  const [sales, setSales] = useState(null)
  const [options, setOptions] = useState({ reservations: [], vehicles: [], buyers: [] })
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState(null) // { reservation? } | { walkIn: true }
  const [ownerFor, setOwnerFor] = useState(null) // reservation or sale whose Deed of Sale name is being set

  const loadSales = useCallback(() => {
    apiClient.get('/admin/sales', { params: { q: q || undefined }, silent: sales !== null }).then(({ data }) => setSales(data.data ?? []))
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadOptions = useCallback(() => {
    apiClient.get('/admin/sales/create-options', { silent: true }).then(({ data }) => setOptions(data))
  }, [])

  useEffect(() => {
    const id = setTimeout(loadSales, 250)
    return () => clearTimeout(id)
  }, [loadSales])
  useEffect(loadOptions, [loadOptions])

  // Deep link from Reservations/Overview: ?reservation=<id> opens the form for it.
  useEffect(() => {
    const id = params.get('reservation')
    const r = id && options.reservations.find((x) => String(x.id) === id)
    if (!r) return
    if (r.intended_owner?.status === 'pending') setOwnerFor(r) // has to be validated before the sale
    else setDraft({ reservation: r })
  }, [params, options.reservations])

  function close() {
    setDraft(null)
    if (params.get('reservation')) setParams({}, { replace: true })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales"
        actions={<button onClick={() => setDraft({ walkIn: true })} className="rdg-btn-ghost"><Store size={16} /> Walk-in sale</button>}
      />

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500"><ClipboardCheck size={15} /> Ready to finalize ({options.reservations.length})</h2>
        {options.reservations.length === 0 ? (
          <p className="rdg-card p-5 text-sm text-slate-500">No verified reservations are waiting. Verified reservations from the Reservations page show up here.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {options.reservations.map((r) => (
              <div key={r.id} className="rdg-card flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{vehicleName(r.vehicle)}</p>
                    <p className="text-sm text-slate-500">{r.buyer?.name}</p>
                  </div>
                  <Chip tone={r.payment_method === 'financing' ? 'blue' : 'green'}>{r.payment_method === 'financing' ? 'Financing' : 'Cash'}</Chip>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-400">Price</dt><dd className="font-bold text-slate-800">{peso(r.vehicle?.selling_price)}</dd></div>
                  <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-400">Reservation paid</dt><dd className="font-bold text-slate-800">{r.fee_amount ? peso(r.fee_amount) : '—'}</dd></div>
                </dl>
                <DeedName record={r} onEdit={() => setOwnerFor(r)} className="mb-3 mt-3" />
                {r.intended_owner?.status === 'pending'
                  ? <button onClick={() => setOwnerFor(r)} className="rdg-btn mt-auto"><IdCard size={16} /> Validate owner first</button>
                  : <button onClick={() => setDraft({ reservation: r })} className="rdg-btn mt-auto"><Receipt size={16} /> Record sale</button>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Recorded sales</h2>
          <SearchInput value={q} onChange={setQ} placeholder="Search buyer or car…" />
        </div>
        {sales === null ? (
          <ListSkeleton />
        ) : sales.length === 0 ? (
          <EmptyState icon={Receipt} title={q ? 'No sales match' : 'No sales yet'} text={q ? 'Try a different name.' : 'Sales you record appear here with their documents.'} />
        ) : (
          <table>
            <thead><tr><th>Sale</th><th>Buyer</th><th>Payment</th><th className="text-right">Amount</th><th>Date</th><th className="text-right">Documents</th></tr></thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td><p className="font-semibold text-slate-900">{vehicleName(s.vehicle)}</p><p className="font-mono text-[11px] text-slate-400">INV-{String(s.id).padStart(6, '0')}</p></td>
                  <td>{s.buyer?.name}<p className="text-xs text-slate-400">{s.buyer?.email}</p><DeedName record={s} onEdit={() => setOwnerFor(s)} className="mt-1" compact /></td>
                  <td><Chip tone={s.payment_type === 'financing' ? 'blue' : 'green'}>{s.payment_type === 'financing' ? 'Bank financing' : 'Straight cash'}</Chip></td>
                  <td className="text-right font-bold tabular-nums">{peso(s.total_amount)}</td>
                  <td className="text-sm text-slate-500">{formatDate(s.sale_date)}</td>
                  <td><DocumentButtons sale={s} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {draft && (
        <RecordSaleModal
          draft={draft}
          options={options}
          onClose={close}
          onSaved={() => {
            close()
            loadSales()
            loadOptions()
          }}
        />
      )}

      {ownerFor && (
        <OwnerModal
          owner={ownerFor.intended_owner ? { ...ownerFor.intended_owner, buyer: ownerFor.buyer, vehicle: ownerFor.vehicle } : null}
          target={ownerFor}
          onClose={() => setOwnerFor(null)}
          onSaved={() => {
            setOwnerFor(null)
            loadSales()
            loadOptions()
          }}
        />
      )}
    </div>
  )
}

/** Who the Deed of Sale names for a reservation or sale, with a button to change it. */
function DeedName({ record, onEdit, compact, className = '' }) {
  const o = record.intended_owner
  const inBuyerName = !o || o.status === 'rejected'
  return (
    <div className={`flex items-center justify-between gap-2 text-xs ${compact ? '' : 'rounded-lg bg-slate-50 p-2'} ${className}`}>
      <span className="min-w-0 text-slate-500">Deed of Sale: <strong className="text-slate-800">{inBuyerName ? 'buyer’s name' : o.full_name}</strong>{o && o.status !== 'approved' && <StatusBadge kind="owner" status={o.status} className="ml-1.5" />}</span>
      <button type="button" onClick={onEdit} className="shrink-0 font-bold text-slate-900 underline underline-offset-2">{o?.status === 'pending' ? 'Validate' : 'Change'}</button>
    </div>
  )
}

function RecordSaleModal({ draft, options, onClose, onSaved }) {
  const r = draft.reservation
  const [form, setForm] = useState({
    vehicle_id: r?.vehicle_id ?? '',
    buyer_id: r?.buyer_id ?? '',
    payment_type: r?.payment_method === 'financing' ? 'financing' : 'cash',
    total_amount: r?.vehicle?.selling_price ? Number(r.vehicle.selling_price) : '',
  })
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const vehicle = r?.vehicle ?? options.vehicles.find((v) => String(v.id) === String(form.vehicle_id))
  const fee = Number(r?.fee_amount ?? 0)
  const down = form.payment_type === 'financing' ? Number(r?.down_payment ?? 0) : 0
  const total = Number(form.total_amount) || 0
  const balance = useMemo(() => (form.payment_type === 'financing' ? Math.max(0, down - fee) : Math.max(0, total - fee)), [form.payment_type, down, fee, total])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      const body = r ? { reservation_id: r.id, payment_type: form.payment_type, total_amount: form.total_amount } : form
      const { data } = await apiClient.post('/admin/sales', body, { loadingText: 'Recording sale…', quietErrors: true })
      setDone(data)
      toast.success(`${vehicleName(data.vehicle)} marked as sold`)
    } catch (err) {
      setError(apiError(err, 'Could not record that sale.'))
    }
  }

  if (done) {
    return (
      <Modal open onClose={onSaved} title="Sale recorded" size="md" footer={<button onClick={onSaved} className="rdg-btn">Done</button>}>
        <div className="text-center">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
          <p className="mt-3 text-lg font-extrabold text-slate-900">{vehicleName(done.vehicle)}</p>
          <p className="text-sm text-slate-500">sold to {done.buyer?.name} for {peso(done.total_amount)}</p>
          <p className="mb-3 mt-5 text-sm font-semibold text-slate-700">Generate the documents now:</p>
          <div className="flex justify-center"><DocumentButtons sale={done} compact /></div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={r ? 'Record sale from reservation' : 'Record a walk-in sale'}
      footer={
        <>
          <button onClick={onClose} className="rdg-btn-ghost">Cancel</button>
          <button type="submit" form="sale-form" className="rdg-btn"><Receipt size={16} /> Record sale</button>
        </>
      }
    >
      <form id="sale-form" onSubmit={submit} className="space-y-4">
        {r ? (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="font-bold text-slate-900">{vehicleName(r.vehicle)}</p>
            <p className="text-sm text-slate-500">{r.buyer?.name} · {r.buyer?.email}</p>
            <p className="mt-1 text-sm text-slate-500">Deed of Sale: <strong className="text-slate-800">{r.intended_owner?.status === 'approved' ? r.intended_owner.full_name : r.buyer?.name}</strong></p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vehicle">
              <Select required value={form.vehicle_id} className="w-full"
                onChange={(e) => {
                  const v = options.vehicles.find((x) => String(x.id) === e.target.value)
                  setForm((f) => ({ ...f, vehicle_id: e.target.value, total_amount: v ? Number(v.selling_price) : f.total_amount }))
                }}>
                <option value="" disabled>Choose an available car</option>
                {options.vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleName(v)} · {peso(v.selling_price)}</option>)}
              </Select>
            </Field>
            <Field label="Buyer" hint="The buyer needs an account so they can see their documents.">
              <Select required value={form.buyer_id} onChange={(e) => setForm((f) => ({ ...f, buyer_id: e.target.value }))} className="w-full">
                <option value="" disabled>Choose a buyer</option>
                {options.buyers.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.email}</option>)}
              </Select>
            </Field>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="rdg-label is-required">Final payment type</span>
            <div className="grid grid-cols-2 gap-2">
              {[['cash', 'Straight cash'], ['financing', 'Bank financing']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setForm((f) => ({ ...f, payment_type: key }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${form.payment_type === key ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-600'}`}>{label}</button>
              ))}
            </div>
          </div>
          <Field label="Total amount" hint={vehicle ? `Listed price ${peso(vehicle.selling_price)}` : undefined}>
            <PesoInput required value={form.total_amount} onChange={(v) => setForm((f) => ({ ...f, total_amount: v }))} />
          </Field>
        </div>

        <dl className="space-y-1.5 rounded-xl border border-slate-200 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Vehicle price</dt><dd className="tabular-nums">{peso(total)}</dd></div>
          {form.payment_type === 'financing' && (
            <>
              <div className="flex justify-between"><dt className="text-slate-500">Down payment {r?.down_payment == null && '(no application on file)'}</dt><dd className="tabular-nums">{peso(down)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Financed by the bank</dt><dd className="tabular-nums">{peso(Math.max(0, total - down))}</dd></div>
            </>
          )}
          {fee > 0 && <div className="flex justify-between text-red-600"><dt>Less: reservation fee paid</dt><dd className="tabular-nums">− {peso(fee)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-extrabold text-slate-900"><dt>{form.payment_type === 'financing' ? 'Down payment balance due' : 'Balance due'}</dt><dd className="tabular-nums">{peso(balance)}</dd></div>
        </dl>
        <p className="text-xs text-slate-500">These figures are printed on the invoice. Recording the sale marks the car as Sold and adds this sale to the Expansion Fund.</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </form>
    </Modal>
  )
}
