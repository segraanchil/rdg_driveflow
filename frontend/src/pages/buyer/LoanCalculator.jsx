import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiClient from '../../api/client'
import { estimateMonthlyAmortization } from '../../lib/loanCalculator'

export default function LoanCalculator() {
  const [searchParams] = useSearchParams()
  const vehicleId = searchParams.get('vehicle_id')

  const [vehiclePrice, setVehiclePrice] = useState(800000)
  const [downPayment, setDownPayment] = useState(160000)
  const [termMonths, setTermMonths] = useState(36)
  const [serverAmount, setServerAmount] = useState(null)

  const estimate = estimateMonthlyAmortization({ vehiclePrice, downPayment, termMonths })

  async function confirmWithServer() {
    const { data } = await apiClient.post('/loan-calculator', {
      vehicle_price: vehiclePrice,
      down_payment: downPayment,
      term_months: termMonths,
    })
    setServerAmount(data.monthly_amortization)
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-bold text-brand">Auto-Loan Calculator</h1>
      {vehicleId && <p className="mb-4 text-sm text-slate-500">For vehicle #{vehicleId}</p>}

      <label className="mb-3 block text-sm">
        Vehicle Price
        <input
          type="number"
          value={vehiclePrice}
          onChange={(e) => setVehiclePrice(Number(e.target.value))}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="mb-3 block text-sm">
        Down Payment: ₱{downPayment.toLocaleString()}
        <input
          type="range"
          min={0}
          max={vehiclePrice}
          step={5000}
          value={downPayment}
          onChange={(e) => setDownPayment(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>

      <label className="mb-3 block text-sm">
        Term: {termMonths} months
        <input
          type="range"
          min={12}
          max={60}
          step={6}
          value={termMonths}
          onChange={(e) => setTermMonths(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>

      <p className="mt-4 text-lg">
        Estimated monthly amortization: <strong>₱{estimate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
      </p>

      <button onClick={confirmWithServer} className="mt-4 rounded bg-brand px-4 py-2 text-white">
        Confirm exact figure
      </button>

      {serverAmount !== null && (
        <p className="mt-2 text-sm text-slate-500">Server-confirmed: ₱{serverAmount.toLocaleString()}</p>
      )}
    </div>
  )
}
