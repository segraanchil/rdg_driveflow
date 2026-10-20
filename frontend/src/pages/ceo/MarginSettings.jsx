import { useEffect, useState } from 'react'
import { Percent, Info } from 'lucide-react'
import apiClient from '../../api/client'

/** Global profit margin setting (10–18%), applied to every car still for sale. */
export default function MarginSettings() {
  const [margin, setMargin] = useState(12)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiClient.get('/ceo/margin-setting').then(({ data }) => setMargin(Number(data.margin_percent)))
  }, [])

  async function save() {
    setError(null)
    try {
      const { data } = await apiClient.put('/ceo/margin-setting', { margin_percent: margin }, { loadingText: 'Updating prices…' })
      setResult(data.repriced)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not save the margin.')
    }
  }

  const example = 500000

  return (
    <div className="max-w-xl">
      <h1 className="mb-1">Global Margin Setting</h1>
      <p className="mb-6 text-sm text-slate-500">The dealership&apos;s profit on top of acquisition cost and repairs. Must be between 10% and 18%.</p>
      <div className="rdg-card p-6">
        <div className="flex items-end justify-between">
          <span className="rdg-label flex items-center gap-1"><Percent size={13} /> Margin</span>
          <span className="text-4xl font-extrabold text-emerald-600">{margin}%</span>
        </div>
        <input type="range" min={10} max={18} step={0.5} value={margin} onChange={(e) => { setMargin(Number(e.target.value)); setResult(null) }} className="mt-3 w-full" />
        <div className="flex justify-between text-xs text-slate-400"><span>10%</span><span>18%</span></div>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          Example: a car costing ₱{example.toLocaleString()} (purchase + repairs) sells for{' '}
          <strong className="text-slate-900">₱{Math.round(example * (1 + margin / 100)).toLocaleString()}</strong>.
        </p>
        <p className="mt-3 flex gap-2 text-xs text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>Saving re-prices every <strong>available</strong> car. Reserved and sold cars keep the price the buyer agreed to. New cars use this margin by default.</span>
        </p>
        <button onClick={save} className="rdg-btn mt-5 w-full py-3">Save and apply</button>
        {result !== null && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved. {result} available car{result === 1 ? ' was' : 's were'} re-priced.</p>}
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  )
}
