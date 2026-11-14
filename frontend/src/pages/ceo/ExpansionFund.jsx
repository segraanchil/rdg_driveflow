import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Target, Percent, CalendarPlus } from 'lucide-react'
import apiClient from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { EmptyState, PageHeader, StatTile } from '../../components/ui/kit'
import { formatDate, peso, pesoCompact, vehicleName } from '../../lib/format'

/** Expansion Fund (Story 26): running balance toward the Service Center, one entry per sale. */
export default function ExpansionFund() {
  const [fund, setFund] = useState(null)

  useEffect(() => {
    apiClient.get('/ceo/expansion-fund').then(({ data }) => setFund(data))
  }, [])

  if (!fund) return <PageLoader />
  const entries = fund.entries?.data ?? []
  const remaining = Math.max(0, fund.goal - fund.current_balance)

  return (
    <div className="space-y-6">
      <PageHeader title="Expansion Fund" subtitle="Capital set aside from every sale for the 2026 Service Center."
        actions={<Link to="/ceo/settings?tab=fund" className="rdg-btn-ghost"><Percent size={15} /> Change % or goal</Link>} />

      <div className="rdg-card overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Current balance</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums">{peso(fund.current_balance, { decimals: 2 })}</p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${fund.percent_to_goal}%` }} /></div>
          <div className="mt-2 flex justify-between text-sm text-slate-300"><span>{fund.percent_to_goal}% of goal</span><span>{peso(remaining)} to go</span></div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <StatTile icon={Target} tone="violet" label="Goal" value={pesoCompact(fund.goal)} />
          <StatTile icon={Percent} tone="blue" label="Contribution" value={`${fund.contribution_percent}%`} hint="of every sale" />
          <StatTile icon={CalendarPlus} label="Added this month" value={pesoCompact(fund.this_month)} />
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No contributions yet" text="Every recorded sale adds its share here automatically." />
      ) : (
        <table>
          <thead><tr><th>Date</th><th>From sale</th><th className="text-right">Sale amount</th><th className="text-right">Added</th><th className="text-right">Balance</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="text-slate-500">{formatDate(e.entry_date)}</td>
                <td><span className="font-semibold text-slate-800">{vehicleName(e.sale?.vehicle)}</span><span className="block text-xs text-slate-400">{e.sale?.buyer?.name}</span></td>
                <td className="text-right tabular-nums text-slate-500">{peso(e.sale?.total_amount)}</td>
                <td className="text-right font-semibold tabular-nums text-emerald-700">+ {peso(e.amount, { decimals: 2 })}</td>
                <td className="text-right font-bold tabular-nums">{peso(e.running_balance, { decimals: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
