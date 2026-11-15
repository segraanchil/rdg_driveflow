import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, Receipt, CalendarClock, Landmark, ShieldCheck, Users, ArrowRight, ImageOff, Clock, CheckCircle2, Plus, PartyPopper, MessagesSquare, SearchCheck } from 'lucide-react'
import apiClient from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime, pesoCompact, timeLeft, vehicleName } from '../../lib/format'

/**
 * Admin landing page, kept calm on purpose: one to-do list (only things that need action),
 * what's coming up next, and a single line of numbers. Everything else lives on its own page.
 */
export default function Overview() {
  const { user } = useAuth()
  const [data, setData] = useState(null)

  useEffect(() => {
    apiClient.get('/admin/overview').then(({ data }) => setData(data))
  }, [])

  if (!data) return <PageLoader rows={2} />
  const c = data.counts
  const inv = data.inventory ?? {}
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const todos = [
    [c.chats_waiting, MessagesSquare, 'chat', 'waiting for a reply', '/admin/support', 'Reply'],
    [c.pending_reservations, ClipboardCheck, 'reservation payment', 'to verify', '/admin/reservations', 'Verify'],
    [c.cars_to_inspect, SearchCheck, 'car bought from a seller', 'to inspect and publish', '/admin/inventory?status=for_inspection', 'Inspect'],
    [c.ready_to_sell, Receipt, 'verified reservation', 'ready to record as sold', '/admin/sales', 'Record sale'],
    [c.pending_test_drives, CalendarClock, 'test drive request', 'to confirm', '/admin/test-drives', 'Review'],
    [c.documents_to_verify, Landmark, 'financing document', 'to check', '/admin/financing', 'Check'],
    [c.open_claims, ShieldCheck, 'warranty claim', 'open', '/admin/warranty-claims', 'Open'],
    [c.new_leads, Users, 'car', 'offered to us for appraisal', '/admin/acquisition-leads', 'Appraise'],
    [data.cars_without_photos.length, ImageOff, 'car on sale', 'without real photos', '/admin/inventory', 'Add photos'],
  ].filter(([n]) => n > 0)

  const upcoming = [
    ...data.pending_reservations.map((r) => ({ key: `r${r.id}`, at: r.expires_at, icon: Clock, title: `Hold ends · ${vehicleName(r.vehicle)}`, sub: `${r.buyer?.name} · ${timeLeft(r.expires_at)}`, to: '/admin/reservations', urgent: new Date(r.expires_at) - Date.now() < 6 * 3_600_000 })),
    ...data.upcoming_test_drives.map((t) => ({ key: `t${t.id}`, at: t.preferred_at, icon: CalendarClock, title: `Test drive · ${vehicleName(t.vehicle)}`, sub: `${t.buyer?.name} · ${formatDateTime(t.preferred_at)}${t.status === 'pending' ? ' · not confirmed yet' : ''}`, to: '/admin/test-drives' })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at)).slice(0, 5)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{greeting}, {user?.name?.split(' ')[0] ?? 'there'}</h1>
          <p className="mt-1 text-sm text-slate-500">{todos.length === 0 ? 'Nothing needs your attention right now.' : `${todos.length} thing${todos.length === 1 ? '' : 's'} to take care of today.`}</p>
        </div>
        <Link to="/admin/inventory?new=1" className="rdg-btn"><Plus size={16} /> Add vehicle</Link>
      </div>

      <section className="rdg-card overflow-hidden">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-slate-500">To do</h2>
        {todos.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-8 text-slate-600">
            <PartyPopper size={22} className="text-slate-900" /> You’re all caught up. New reservations, requests and leads will show up here.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todos.map(([n, Icon, noun, what, to, action]) => (
              <li key={to + noun}>
                <Link to={to} className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900"><Icon size={19} /></span>
                  <span className="min-w-0 flex-1 text-slate-700">
                    <strong className="text-lg text-slate-900">{n}</strong> {noun}{n === 1 ? '' : 's'} {what}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-900">{action} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rdg-card overflow-hidden">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-slate-500">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500"><CheckCircle2 size={16} /> No holds expiring or test drives scheduled.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map(({ key, icon: Icon, title, sub, to, urgent }) => (
              <li key={key}>
                <Link to={to} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  <Icon size={17} className={urgent ? 'text-red-600' : 'text-slate-400'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{title}</span>
                    <span className={`block truncate text-xs ${urgent ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{sub}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-white px-5 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
        <span><strong className="text-slate-900">{inv.available ?? 0}</strong> available</span>
        <span><strong className="text-slate-900">{inv.reserved ?? 0}</strong> reserved</span>
        {inv.under_repair > 0 && <span><strong className="text-slate-900">{inv.under_repair}</strong> in repair</span>}
        <span className="ml-auto">This month: <strong className="text-slate-900">{c.sales_this_month} sold</strong> · <strong className="text-slate-900">{pesoCompact(c.revenue_this_month)}</strong></span>
      </p>
    </div>
  )
}
