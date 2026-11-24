import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail, BadgeCheck, CalendarDays, AlertCircle, Heart, ClipboardCheck, CalendarClock, Landmark, Receipt, ShieldCheck, Download, Clock, CarFront, ArrowRight,
} from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { StatusBadge, Tabs } from '../../components/ui/kit'
import { useAuth } from '../../context/AuthContext'
import { docLabel, formatDate, formatDateTime, initials, peso, timeLeft, vehicleName } from '../../lib/format'
import { DeedOwnerCard } from '../../components/vehicles/DeedOwner'
import { toast } from '../../lib/toast'

/** "My Garage": saved cars, reservations, test drives, financing, purchases & documents, warranty claims. */
export default function MyGarage() {
  const { user } = useAuth()
  const [garage, setGarage] = useState(null)
  const [sales, setSales] = useState([])
  const [claims, setClaims] = useState([])
  const [testDrives, setTestDrives] = useState([])
  const [tab, setTab] = useState('activity')
  const [, tick] = useState(0)

  function loadGarage() {
    apiClient.get('/buyer/garage').then(({ data }) => setGarage(data))
  }

  useEffect(() => {
    loadGarage()
    apiClient.get('/buyer/sales', { silent: true }).then(({ data }) => setSales(data))
    apiClient.get('/buyer/warranty-claims', { silent: true }).then(({ data }) => setClaims(data))
    apiClient.get('/buyer/test-drives', { silent: true }).then(({ data }) => setTestDrives(data))
    const id = setInterval(() => tick((n) => n + 1), 30000) // keep hold countdowns fresh
    return () => clearInterval(id)
  }, [])

  async function unsave(vehicleId) {
    await apiClient.delete(`/buyer/saved-vehicles/${vehicleId}`, { silent: true })
    toast.success('Removed from saved cars')
    loadGarage()
  }

  if (!garage) return <PageLoader />

  const ownerOf = (vehicleId) => garage.intended_owners?.[vehicleId] ?? null
  const upcomingDrives = testDrives.filter((t) => ['pending', 'confirmed'].includes(t.status))
  const openLoans = garage.loan_history.filter((l) => l.status !== 'rejected')
  const nothingActive = garage.active_reservations.length + upcomingDrives.length + openLoans.length === 0

  return (
    <div className="space-y-6">
      <section className="rdg-card flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-extrabold text-white">{initials(user?.name)}</span>
        <div className="min-w-0 flex-1">
          <h1 className="no-bar block text-xl">{user?.name}</h1>
          <p className="flex items-center gap-1.5 truncate text-sm text-slate-500"><Mail size={14} /> {user?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {user?.email_verified_at
            ? <span className="rdg-chip bg-emerald-50 text-emerald-700"><BadgeCheck size={13} /> Email verified</span>
            : <span className="rdg-chip bg-amber-50 text-amber-700"><AlertCircle size={13} /> Email not verified yet</span>}
          {user?.created_at && <span className="rdg-chip bg-slate-100 text-slate-600"><CalendarDays size={13} /> Member since {formatDate(user.created_at, { day: undefined })}</span>}
        </div>
      </section>

      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'activity', label: 'Activity', count: garage.active_reservations.length + upcomingDrives.length },
        { key: 'saved', label: `Saved (${garage.saved_vehicles.length})` },
        { key: 'purchases', label: `Purchases (${sales.length})` },
        { key: 'claims', label: `Warranty (${claims.length})` },
      ]} />

      {tab === 'activity' && (
        <div className="space-y-6">
          {nothingActive && (
            <div className="rdg-card flex flex-col items-center p-10 text-center">
              <CarFront size={36} className="text-emerald-500" />
              <p className="mt-3 font-bold text-slate-900">Nothing in progress</p>
              <p className="mt-1 text-sm text-slate-500">Reserve a car, book a test drive or apply for financing and you can follow it here.</p>
              <Link to="/inventory" className="rdg-btn mt-5">Browse cars</Link>
            </div>
          )}

          {garage.active_reservations.length > 0 && (
            <Section icon={ClipboardCheck} title="Reservations">
              {garage.active_reservations.map((r) => (
                <Card key={r.id} vehicle={r.vehicle} badge={<StatusBadge kind="reservation" status={r.status} />}>
                  {r.status === 'pending' ? (
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700"><Clock size={14} /> Car held for you: {timeLeft(r.expires_at)}. We’re verifying your payment.</p>
                  ) : (
                    <p className="text-sm text-emerald-700">Payment verified. The car is reserved for you. Our staff will contact you about the balance and release.</p>
                  )}
                  <p className="text-xs text-slate-400">Reservation fee {r.fee_amount ? peso(r.fee_amount) : ''} · {r.payment_method === 'financing' ? 'Bank financing' : 'Straight cash'} · submitted {formatDateTime(r.created_at)}</p>
                  <DeedOwnerCard vehicleId={r.vehicle_id} owner={ownerOf(r.vehicle_id)} onChanged={loadGarage} className="border-t border-slate-100 pt-2" />
                </Card>
              ))}
            </Section>
          )}

          {upcomingDrives.length > 0 && (
            <Section icon={CalendarClock} title="Test drives">
              {upcomingDrives.map((t) => (
                <Card key={t.id} vehicle={t.vehicle} badge={<StatusBadge kind="test_drive" status={t.status} />}>
                  <p className="text-sm font-semibold text-slate-700">{formatDate(t.preferred_at, { weekday: 'long' })}, {new Date(t.preferred_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</p>
                  {t.admin_notes && <p className="text-xs text-slate-500">From our staff: {t.admin_notes}</p>}
                </Card>
              ))}
            </Section>
          )}

          {garage.loan_history.length > 0 && (
            <Section icon={Landmark} title="Financing applications">
              {garage.loan_history.map((l) => {
                const required = l.required_documents ?? []
                const have = new Set((l.documents ?? []).map((d) => d.doc_type))
                const missing = required.filter((d) => !have.has(d))
                return (
                  <Card key={l.id} vehicle={l.vehicle} badge={<StatusBadge kind="financing" status={l.status} />}>
                    <p className="text-sm text-slate-600">{l.term_months} months · {peso(l.down_payment)} down · est. {peso(l.monthly_amortization)}/mo</p>
                    {l.status === 'pending' && missing.length > 0 ? (
                      <Link to={`/financing-application?vehicle_id=${l.vehicle_id}`} className="inline-flex items-center gap-1 text-sm font-bold text-amber-700 hover:underline">
                        {missing.length} document{missing.length === 1 ? '' : 's'} still needed: {missing.map(docLabel).join(', ')} <ArrowRight size={14} />
                      </Link>
                    ) : <p className="text-xs text-slate-400">All {required.length} documents uploaded</p>}
                    {/* Already shown on the reservation card when the car is also reserved. */}
                    {l.status !== 'rejected' && l.vehicle?.status !== 'sold' && !garage.active_reservations.some((r) => r.vehicle_id === l.vehicle_id) && (
                      <DeedOwnerCard vehicleId={l.vehicle_id} owner={ownerOf(l.vehicle_id)} onChanged={loadGarage} className="border-t border-slate-100 pt-2" />
                    )}
                  </Card>
                )
              })}
            </Section>
          )}

          {garage.past_reservations?.length > 0 && (
            <details className="rdg-card p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-slate-600">Past reservations ({garage.past_reservations.length})</summary>
              <ul className="mt-3 space-y-2">
                {garage.past_reservations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2"><span>{vehicleName(r.vehicle)} · {formatDate(r.created_at)}</span><StatusBadge kind="reservation" status={r.status} /></li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {tab === 'saved' && (
        garage.saved_vehicles.length === 0 ? (
          <Empty icon={Heart} text="Tap the heart on any car to save it here." />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {garage.saved_vehicles.map((v) => (
              <div key={v.id} className="rdg-card overflow-hidden">
                <Link to={`/inventory/${v.id}`} className="block">
                  <div className="aspect-video bg-slate-100">{v.media?.[0] && <img src={backendUrl(`/storage/${v.media[0].file_path}`)} alt="" className="h-full w-full object-cover" loading="lazy" />}</div>
                  <div className="p-3">
                    <p className="truncate text-sm font-bold text-slate-900">{vehicleName(v)}</p>
                    <p className="text-sm font-extrabold text-emerald-700">{peso(v.selling_price)}</p>
                    {v.status !== 'available' && <StatusBadge kind="vehicle" status={v.status} className="mt-1" />}
                  </div>
                </Link>
                <button onClick={() => unsave(v.id)} className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-2 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Heart size={13} /> Remove</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'purchases' && (
        sales.length === 0 ? <Empty icon={Receipt} text="Your purchases and their documents will appear here." /> : (
          <div className="space-y-3">
            {sales.map((s) => {
              const deadline = new Date(`${s.sale_date}T23:59:59`)
              deadline.setMonth(deadline.getMonth() + 1)
              const warrantyOpen = deadline > new Date()
              return (
                <Card key={s.id} vehicle={s.vehicle} badge={<span className="text-sm font-extrabold text-slate-900">{peso(s.total_amount)}</span>}>
                  <p className="text-sm text-slate-500">Bought {formatDate(s.sale_date)} · {s.payment_type === 'financing' ? 'Bank financing' : 'Straight cash'}</p>
                  {(s.legal_documents ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {s.legal_documents.map((d) => (
                        <a key={d.id} href={backendUrl(`/storage/${d.file_path}`)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"><Download size={13} /> {docLabel(d.doc_type)}</a>
                      ))}
                    </div>
                  )}
                  <p className="pt-1 text-xs">
                    <ShieldCheck size={13} className="mr-1 inline text-emerald-600" />
                    {warrantyOpen
                      ? <>Money-back guarantee until {formatDate(deadline)}. <Link to={`/warranty-claim?sale_id=${s.id}`} className="font-bold text-emerald-700 hover:underline">Report a problem</Link></>
                      : <span className="text-slate-400">Money-back guarantee ended {formatDate(deadline)}</span>}
                  </p>
                </Card>
              )
            })}
          </div>
        )
      )}

      {tab === 'claims' && (
        claims.length === 0 ? <Empty icon={ShieldCheck} text="No warranty claims filed." /> : (
          <ul className="space-y-3">
            {claims.map((c) => (
              <li key={c.id} className="rdg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-700">{c.ticket_number}</span>
                  <StatusBadge kind="warranty" status={c.status} />
                  <span className="text-xs text-slate-400">filed {formatDate(c.created_at)}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-700">{c.issue_description}</p>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500"><Icon size={15} /> {title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Card({ vehicle, badge, children }) {
  const thumb = vehicle?.media?.[0]?.file_path
  return (
    <div className="rdg-card flex gap-4 p-4">
      <Link to={vehicle ? `/inventory/${vehicle.id}` : '#'} className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {thumb ? <img src={backendUrl(`/storage/${thumb}`)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="flex h-full items-center justify-center text-slate-300"><CarFront size={22} /></span>}
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold text-slate-900">{vehicleName(vehicle)}</p>
          {badge}
        </div>
        {children}
      </div>
    </div>
  )
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="rdg-card flex flex-col items-center p-10 text-center">
      <Icon size={32} className="text-emerald-500" />
      <p className="mt-3 text-sm text-slate-500">{text}</p>
      <Link to="/inventory" className="rdg-btn mt-5">Browse cars</Link>
    </div>
  )
}
