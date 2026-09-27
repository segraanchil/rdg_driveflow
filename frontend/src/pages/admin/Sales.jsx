import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

/**
 * Records the completed sale that turns a verified reservation (or a
 * walk-in cash deal) into a real transaction — the step Invoices and
 * Legal Documents both depend on but that nothing else in the admin UI
 * creates.
 */
export default function Sales() {
  const [sales, setSales] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [buyers, setBuyers] = useState([])
  const [form, setForm] = useState({ vehicle_id: '', buyer_id: '', payment_type: 'cash', total_amount: '' })
  const [error, setError] = useState(null)

  function loadSales() {
    apiClient.get('/admin/sales').then(({ data }) => setSales(data.data ?? []))
  }

  function loadOptions() {
    apiClient.get('/admin/sales/create-options').then(({ data }) => {
      setVehicles(data.vehicles ?? [])
      setBuyers(data.buyers ?? [])
    })
  }

  useEffect(() => {
    loadSales()
    loadOptions()
  }, [])

  function onVehicleChange(vehicleId) {
    const vehicle = vehicles.find((v) => String(v.id) === vehicleId)
    setForm((f) => ({
      ...f,
      vehicle_id: vehicleId,
      total_amount: vehicle ? vehicle.selling_price : f.total_amount,
    }))
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      await apiClient.post('/admin/sales', form)
      setForm({ vehicle_id: '', buyer_id: '', payment_type: 'cash', total_amount: '' })
      loadSales()
      loadOptions() // the sold vehicle drops out of the eligible list
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not record that sale.')
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-brand">Sales</h1>

      <form onSubmit={submit} className="mb-6 grid grid-cols-2 gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-4">
        <select
          required
          value={form.vehicle_id}
          onChange={(e) => onVehicleChange(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>Vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.year} {v.make} {v.model} ({v.status})
            </option>
          ))}
        </select>

        <select
          required
          value={form.buyer_id}
          onChange={(e) => setForm((f) => ({ ...f, buyer_id: e.target.value }))}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>Buyer</option>
          {buyers.map((b) => (
            <option key={b.id} value={b.id}>{b.name} — {b.email}</option>
          ))}
        </select>

        <select
          value={form.payment_type}
          onChange={(e) => setForm((f) => ({ ...f, payment_type: e.target.value }))}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="cash">Straight Cash</option>
          <option value="financing">Bank Financing</option>
        </select>

        <input
          required
          type="number"
          step="0.01"
          placeholder="Total amount"
          value={form.total_amount}
          onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />

        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}

        <button type="submit" className="col-span-full rounded bg-brand px-4 py-2 text-white md:col-span-4">
          Record Sale
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2">Vehicle</th>
            <th>Buyer</th>
            <th>Payment</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-b">
              <td className="py-2">{sale.vehicle?.year} {sale.vehicle?.make} {sale.vehicle?.model}</td>
              <td>{sale.buyer?.name}</td>
              <td className="capitalize">{sale.payment_type}</td>
              <td>₱{Number(sale.total_amount).toLocaleString()}</td>
              <td>{sale.sale_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
