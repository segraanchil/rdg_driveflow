import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardCheck, Receipt, CalendarClock, Landmark, ShieldCheck, Users, ArrowRight, Car, ImageOff, Clock, CheckCircle2, Plus,
} from 'lucide-react'
import apiClient from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { PageHeader, StatTile, StatusBadge } from '../../components/ui/kit'
import { formatDate, formatDateTime, peso, pesoCompact, timeLeft, vehicleName } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'

/** Admin landing page: today's to-dos first, then the lot and recent sales. */
export default function Overview() {
  const { user } = useAuth()
  const [data, setData] = useState(null)

  useEffect(() => {
    apiClient.get('/admin/overview').then(({ data }) => setData(data))
  }, [])

  if (!data) return <PageLoader />
  const c = data.counts
  const inv = data.inventory ?? {}
  const todo = c.pending_reservations + c.ready_to_sell + c.pending_test_drives + c.documents_to_verify + c.open_claims + c.new_leads
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.name?.split(' ')[0] ?? 'there'}`}
        subtitle={todo === 0 ? 'Everything is up to date. Nice work!' : `You have ${todo} item${todo === 1 ? '' : 's'} waiting for you today.`}
        actions={<Link to="/admin/inventory?new=1" className="rdg-btn"><Plus size={16} /> Add vehicle</Link>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile icon={ClipboardCheck} tone="amber" label="To verify" value={c.pending_reservations} hint="Reservation payments" to="/admin/reservations" />
        <StatTile icon={Receipt} tone="emerald" label="Ready to sell" value={c.ready_to_sell} hint="Verified reservations" to="/admin/sales" />
        <StatTile icon={CalendarClock} tone="violet" label="Test drives" value={c.pending_test_drives} hint="Awaiting confirmation" to="/admin/test-drives" />
        <StatTile icon={Landmark} tone="blue" label="Documents" value={c.documents_to_verify} hint="Financing files to check" to="/admin/financing" />
        <StatTile icon={ShieldCheck} tone="red" label="Claims" value={c.open_claims} hint="Open warranty tickets" to="/admin/warranty-claims" />
        <StatTile icon={Users} tone="slate" label="New leads" value={c.new_leads} hint="Cars offered to us" to="/admin/acquisition-leads" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Payments to verify" to="/admin/reservations" empty="No reservations waiting for verification.">
          {data.pending_reservations.map((r) => (
            <Row key={r.id} to="/admin/reservations" title={vehicleName(r.vehicle)} sub={`${r.buyer?.name} · ${r.payment_method === 'financing' ? 'Bank financing' : 'Straight cash'}`}>
              <span className={`flex items-center gap-1 text-xs font-bold ${new Date(r.expires_at) - Date.now() < 6 * 3_600_000 ? 'text-red-600' : 'text-amber-600'}`}>
                <Clock size={13} /> {timeLeft(r.expires_at)}
              </span>
            </Row>
          ))}
        </Panel>

        <Panel title="Ready to record as sold" to="/admin/sales" empty="No verified reservations waiting for a sale.">
          {data.ready_to_sell.map((r) => (
            <Row key={r.id} to={`/admin/sales?reservation=${r.id}`} title={vehicleName(r.vehicle)} sub={`${r.buyer?.name} · ${peso(r.vehicle?.selling_price)}`}>
              <span className="rdg-btn px-3 py-1.5 text-xs">Record sale</span>
            </Row>
          ))}
        </Panel>

        <Panel title="Upcoming test drives" to="/admin/test-drives" empty="No test drives scheduled.">
          {data.upcoming_test_drives.map((t) => (
            <Row key={t.id} to="/admin/test-drives" title={vehicleName(t.vehicle)} sub={`${t.buyer?.name} · ${formatDateTime(t.preferred_at)}`}>
              <StatusBadge kind="test_drive" status={t.status} />
            </Row>
          ))}
        </Panel>

        <Panel title="Recent sales" to="/admin/sales" empty="No sales recorded yet.">
          {data.recent_sales.map((s) => {
            const docs = (s.legal_documents ?? []).length
            return (
              <Row key={s.id} to="/admin/sales" title={vehicleName(s.vehicle)} sub={`${s.buyer?.name} · ${formatDate(s.sale_date)}`}>
                <span className="text-right">
                  <span className="block text-sm font-bold text-slate-900">{peso(s.total_amount)}</span>
                  <span className={`text-[11px] font-semibold ${docs >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>{docs >= 3 ? 'All documents ready' : `${docs}/3 documents`}</span>
                </span>
              </Row>
            )
          })}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rdg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">The lot</h2>
            <Link to="/admin/inventory" className="flex items-center gap-1 text-sm font-bold text-emerald-700 hover:underline">Inventory <ArrowRight size={15} /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['available', 'Available', 'bg-emerald-500'],
              ['reserved', 'Reserved', 'bg-amber-500'],
              ['under_repair', 'In repair', 'bg-violet-500'],
              ['sold', 'Sold', 'bg-slate-500'],
            ].map(([key, label, dot]) => (
              <Link key={key} to={`/admin/inventory?status=${key}`} className="rounded-xl bg-slate-50 p-3 hover:bg-emerald-50">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><span className={`h-2 w-2 rounded-full ${dot}`} /> {label}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{inv[key] ?? 0}</p>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            This month: <strong className="text-slate-800">{c.sales_this_month} sold</strong> · <strong className="text-slate-800">{pesoCompact(c.revenue_this_month)}</strong> in sales
          </p>
        </div>

        <div className="rdg-card p-5">
          <h2 className="mb-3 font-bold">Needs photos</h2>
          {data.cars_without_photos.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={16} /> Every car on sale has photos.</p>
          ) : (
            <ul className="space-y-2">
              {data.cars_without_photos.map((v) => (
                <li key={v.id}>
                  <Link to={`/admin/inventory?edit=${v.id}`} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100">
                    <ImageOff size={15} /> {vehicleName(v)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">Cars without photos look empty in the showroom. Add a cover photo and a 360° set.</p>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, to, empty, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : []
  return (
    <div className="rdg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="font-bold">{title}</h2>
        <Link to={to} className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">View all <ArrowRight size={14} /></Link>
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-400"><Car size={16} /> {empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">{items}</ul>
      )}
    </div>
  )
}

function Row({ to, title, sub, children }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-5 py-3 hover:bg-emerald-50/40">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">{title}</span>
          <span className="block truncate text-xs text-slate-500">{sub}</span>
        </span>
        {children}
      </Link>
    </li>
  )
}
