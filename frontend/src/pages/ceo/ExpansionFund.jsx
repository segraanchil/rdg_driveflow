import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

/** Expansion Fund balance tracker. */
export default function ExpansionFund() {
  const [fund, setFund] = useState(null)

  useEffect(() => {
    apiClient.get('/ceo/expansion-fund').then(({ data }) => setFund(data))
  }, [])

  if (!fund) return <p className="text-slate-400">Loading…</p>

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-brand">Expansion Fund</h1>
      <p className="mb-6 text-3xl font-bold text-brand-accent">
        ₱{Number(fund.current_balance).toLocaleString()}
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2">Date</th>
            <th>Amount</th>
            <th>Running Balance</th>
          </tr>
        </thead>
        <tbody>
          {(fund.entries?.data ?? []).map((entry) => (
            <tr key={entry.id} className="border-b">
              <td className="py-2">{entry.entry_date}</td>
              <td>₱{Number(entry.amount).toLocaleString()}</td>
              <td>₱{Number(entry.running_balance).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
