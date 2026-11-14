import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'

/** Page title + subtitle + right-side actions, used by every page. */
export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back}
        <h1>{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

// [label, tone] per status, per record type. Same status words mean different things per type.
const STATUS = {
  vehicle: { available: ['Available', 'green'], reserved: ['Reserved', 'amber'], sold: ['Sold', 'slate'], under_repair: ['In repair', 'violet'] },
  reservation: { pending: ['Awaiting verification', 'amber'], verified: ['Verified', 'green'], rejected: ['Rejected', 'red'], expired: ['Expired', 'slate'], completed: ['Sold', 'blue'] },
  test_drive: { pending: ['Awaiting confirmation', 'amber'], confirmed: ['Confirmed', 'green'], declined: ['Declined', 'red'], completed: ['Done', 'blue'], cancelled: ['Cancelled', 'slate'] },
  financing: { pending: ['Submitted', 'amber'], documents_review: ['With the bank', 'blue'], approved: ['Approved', 'green'], rejected: ['Not approved', 'red'] },
  warranty: { submitted: ['Submitted', 'amber'], under_review: ['Under review', 'blue'], approved: ['Approved', 'green'], rejected: ['Not approved', 'red'], refunded: ['Refunded', 'violet'] },
  lead: { submitted: ['New', 'amber'], under_appraisal: ['Under appraisal', 'blue'], offer_made: ['Offer made', 'violet'], accepted: ['Accepted', 'green'], declined: ['Declined', 'slate'] },
}

export function statusLabel(kind, status) {
  return STATUS[kind]?.[status]?.[0] ?? String(status ?? '').replace(/_/g, ' ')
}

export function StatusBadge({ kind, status, className = '' }) {
  const [label, tone] = STATUS[kind]?.[status] ?? [String(status ?? '—').replace(/_/g, ' '), 'slate']
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${TONES[tone]} ${className}`}>{label}</span>
}

export function Chip({ tone = 'slate', children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${TONES[tone]} ${className}`}>{children}</span>
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="rdg-card flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon size={26} /></span>
      <p className="mt-4 font-bold text-slate-800">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Segmented tabs with optional counts: [{ key, label, count }]. */
export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`-mx-1 mb-5 flex gap-1 overflow-x-auto px-1 pb-1 ${className}`} role="tablist">
      {tabs.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold ${active ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900'}`}
          >
            {t.label}
            {t.count > 0 && <span className={`rounded-full px-1.5 text-[11px] font-bold ${active ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-700'}`}>{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** KPI tile. `to` makes it a link. */
export function StatTile({ icon: Icon, label, value, hint, tone = 'emerald', to }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={18} /></span>}
      </div>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </>
  )
  const cls = 'rdg-card block p-4 transition'
  return to ? <Link to={to} className={`${cls} hover:-translate-y-0.5 hover:shadow-lift`}>{body}</Link> : <div className={cls}>{body}</div>
}

/** Labeled form field. */
export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="rdg-label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full text-sm sm:w-64 ${className}`} />
  )
}

/** Skeleton rows while a list loads. */
export function ListSkeleton({ rows = 4 }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <div key={i} className="rdg-skeleton h-20 rounded-2xl" />)}</div>
}
