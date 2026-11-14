import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, TrendingUp, Wallet, Warehouse, FileSignature, Users, CalendarCheck, ArrowRight } from 'lucide-react'
import apiClient from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import BarChart from '../../components/ui/BarChart'
import { PageHeader, StatTile } from '../../components/ui/kit'
import { peso, pesoCompact, timeAgo } from '../../lib/format'

const ACTIVITY_ICON = {
  document: { Icon: FileSignature, className: 'bg-emerald-100 text-emerald-600' },
  lead: { Icon: Users, className: 'bg-sky-100 text-sky-600' },
  reservation: { Icon: CalendarCheck, className: 'bg-amber-100 text-amber-600' },
}

const STOCK = [
  ['available', 'Available', 'bg-emerald-500'],
  ['reserved', 'Reserved', 'bg-amber-500'],
  ['under_repair', 'In repair', 'bg-violet-500'],
]

/** Executive dashboard (Stories 25–26): monthly sales, stock, expansion fund, recent activity. */
export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    apiClient.get('/ceo/dashboard').then(({ data }) => setStats(data))
  }, [])

  if (!stats) return <PageLoader />

  const monthly = stats.monthly ?? []
  const thisMonth = monthly[monthly.length - 1] ?? { count: 0, revenue: 0, profit: 0 }
  const prev = monthly[monthly.length - 2]
  const delta = prev ? thisMonth.count - prev.count : 0
  const inv = stats.inventory
  const inStock = STOCK.reduce((sum, [k]) => sum + (inv[k] ?? 0), 0)
  const fund = stats.expansion_fund
  const monthName = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <PageHeader title="Executive Dashboard" subtitle="Live view of sales, stock and progress toward the Service Center expansion." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Car} label="Cars sold this month" value={thisMonth.count}
          hint={prev ? `${delta >= 0 ? '+' : ''}${delta} vs ${prev.label}` : undefined} />
        <StatTile icon={Wallet} tone="blue" label="Sales this month" value={pesoCompact(stats.sales.total_this_month)} hint={`Gross profit ${pesoCompact(stats.sales.gross_profit_this_month)}`} />
        <StatTile icon={Warehouse} tone="amber" label="Cars in stock" value={inStock} hint={`${pesoCompact(inv.stock_value)} at selling price`} />
        <StatTile icon={TrendingUp} tone="violet" label="Expansion Fund" value={pesoCompact(fund.current_balance)} hint={`${fund.percent_to_goal}% of ${pesoCompact(fund.goal)} goal`} to="/ceo/expansion-fund" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rdg-card p-5">
          <h2 className="font-bold">Cars sold per month</h2>
          <p className="mb-4 text-xs text-slate-500">Last 6 months</p>
          <BarChart label="Cars sold per month" integer
            data={monthly.map((m) => ({ key: m.month, label: m.label, tooltipLabel: monthName(m.month), value: m.count, extra: `${pesoCompact(m.revenue)} in sales` }))} />
        </div>
        <div className="rdg-card p-5">
          <h2 className="font-bold">Gross profit per month</h2>
          <p className="mb-4 text-xs text-slate-500">Selling price minus acquisition cost and repairs</p>
          <BarChart label="Gross profit per month" format={pesoCompact}
            data={monthly.map((m) => ({ key: m.month, label: m.label, tooltipLabel: monthName(m.month), value: Math.max(0, m.profit), extra: `${m.count} car${m.count === 1 ? '' : 's'} sold` }))} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rdg-card p-5">
          <h2 className="mb-4 font-bold">Stock on the lot</h2>
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-slate-100">
            {STOCK.map(([k, , color]) => inv[k] > 0 && <span key={k} className={color} style={{ width: `${(inv[k] / Math.max(1, inStock)) * 100}%` }} title={`${k}: ${inv[k]}`} />)}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {STOCK.map(([k, label, color]) => (
              <li key={k} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} /> {label}</span>
                <span className="font-bold tabular-nums text-slate-900">{inv[k] ?? 0}</span>
              </li>
            ))}
            <li className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-500"><span>Sold to date</span><span className="font-bold tabular-nums text-slate-700">{inv.sold}</span></li>
          </ul>
        </div>

        <div className="rdg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Expansion Fund</h2>
            <Link to="/ceo/expansion-fund" className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">Ledger <ArrowRight size={14} /></Link>
          </div>
          <p className="text-3xl font-extrabold tabular-nums text-slate-900">{peso(fund.current_balance)}</p>
          <p className="text-xs text-slate-500">of {peso(fund.goal)} goal · {fund.contribution_percent}% of every sale</p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${fund.percent_to_goal}%` }} /></div>
          <p className="mt-2 text-sm font-semibold text-emerald-700">{fund.percent_to_goal}% there</p>
        </div>

        <div className="rdg-card p-5">
          <h2 className="mb-4 font-bold">Best-selling makes</h2>
          {(stats.top_makes ?? []).length === 0 ? <p className="text-sm text-slate-400">No sales in the last 6 months.</p> : (
            <ul className="space-y-2.5">
              {stats.top_makes.map((m) => (
                <li key={m.make} className="text-sm">
                  <div className="flex justify-between"><span className="font-semibold text-slate-700">{m.make}</span><span className="tabular-nums text-slate-500">{m.total} sold</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${(m.total / stats.top_makes[0].total) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rdg-card p-5">
        <h2 className="mb-4 font-bold">Recent activity</h2>
        {stats.recent_activity.length === 0 ? (
          <p className="text-sm text-slate-400">No recent activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {stats.recent_activity.map((item, i) => {
              const { Icon, className } = ACTIVITY_ICON[item.type] ?? ACTIVITY_ICON.reservation
              return (
                <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${className}`}><Icon size={15} /></span>
                  <span className="flex-1 text-slate-700">{item.label}</span>
                  <span className="flex-shrink-0 text-xs text-slate-400">{timeAgo(item.at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
