import { useEffect, useState } from 'react'
import { LayoutDashboard, Car, TrendingUp, DollarSign, FileSignature, Users, CalendarCheck } from 'lucide-react'
import apiClient from '../../api/client'

const ACTIVITY_ICON = {
  document: { Icon: FileSignature, className: 'bg-emerald-100 text-emerald-600' },
  lead: { Icon: Users, className: 'bg-blue-100 text-blue-600' },
  reservation: { Icon: CalendarCheck, className: 'bg-amber-100 text-amber-600' },
}

/** Executive dashboard: sales volume, inventory KPIs, expansion fund, recent activity. */
export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    apiClient.get('/ceo/dashboard').then(({ data }) => setStats(data))
  }, [])

  if (!stats) return <p className="text-slate-400">Loading…</p>

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <LayoutDashboard className="text-emerald-500" size={22} />
        <h1 className="text-2xl font-bold text-slate-800">CEO Dashboard</h1>
      </div>
      <p className="-mt-4 mb-6 text-sm text-slate-500">
        Real-time overview of dealership performance and expansion goals.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={<Car size={20} />}
          iconWrap="bg-white/15 text-white"
          badge="MTD"
          badgeClass="bg-black/20 text-white"
          value={stats.sales.count_this_month}
          label="Total Cars Sold"
          className="bg-emerald-500 text-white"
          labelClass="text-emerald-50"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          iconWrap="bg-emerald-100 text-emerald-600"
          badge="+ this month"
          badgeClass="bg-emerald-50 text-emerald-600"
          value={`₱${formatCompact(stats.sales.gross_profit_this_month)}`}
          label="Est. Gross Profit"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          iconWrap="bg-blue-100 text-blue-600"
          badge={`${stats.expansion_fund.percent_to_goal}% of goal`}
          badgeClass="bg-blue-50 text-blue-600"
          value={`₱${formatCompact(stats.expansion_fund.current_balance)}`}
          label="Expansion Fund Balance"
          footer={
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${stats.expansion_fund.percent_to_goal}%` }}
              />
            </div>
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <MiniStat label="Available" value={stats.inventory.available} />
        <MiniStat label="Reserved" value={stats.inventory.reserved} />
        <MiniStat label="Sold" value={stats.inventory.sold} />
        <MiniStat label="Revenue (MTD)" value={`₱${formatCompact(stats.sales.total_this_month)}`} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Recent Activity</h2>
        {stats.recent_activity.length === 0 ? (
          <p className="text-sm text-slate-400">No recent activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {stats.recent_activity.map((item, i) => {
              const { Icon, className } = ACTIVITY_ICON[item.type] ?? ACTIVITY_ICON.reservation
              return (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${className}`}>
                    <Icon size={14} />
                  </span>
                  <span className="flex-1 text-slate-700">{item.label}</span>
                  <span className="flex-shrink-0 text-xs text-slate-400">{formatWhen(item.at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, iconWrap, badge, badgeClass, value, label, footer, className = 'bg-white', labelClass = 'text-slate-400' }) {
  return (
    <div className={`rounded-xl border border-slate-200 p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconWrap}`}>{icon}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>{badge}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className={`text-xs ${labelClass}`}>{label}</p>
      {footer}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

function formatCompact(n) {
  const num = Number(n) || 0
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

function formatWhen(iso) {
  const date = new Date(iso)
  const diffHours = (Date.now() - date.getTime()) / 3_600_000
  if (diffHours < 24) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (diffHours < 48) return 'Yesterday'
  return date.toLocaleDateString()
}
