import { useEffect, useState } from 'react'
import apiClient from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'

/** Expansion Fund balance tracker. */
export default function ExpansionFund() {
  const [fund, setFund] = useState(null)

  useEffect(() => {
    apiClient.get('/ceo/expansion-fund').then(({ data }) => setFund(data))
  }, [])

  if (!fund) return <PageLoader />

  return (
    <div>
      <h1 className="mb-4">Expansion Fund</h1>
      <p className="mb-6 text-3xl font-bold text-brand-accent">
        ₱{Number(fund.current_balance).toLocaleString()}
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
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
