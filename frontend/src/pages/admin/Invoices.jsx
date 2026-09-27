import { useEffect, useState } from 'react'
import apiClient, { backendUrl } from '../../api/client'

/** Invoice generation (PDF) per completed sale. */
export default function Invoices() {
  const [sales, setSales] = useState([])
  const [generated, setGenerated] = useState({})

  useEffect(() => {
    apiClient.get('/admin/sales').then(({ data }) => setSales(data.data ?? []))
  }, [])

  async function generateInvoice(saleId) {
    const { data } = await apiClient.post(`/admin/sales/${saleId}/invoice`)
    setGenerated((g) => ({ ...g, [saleId]: data.file_path }))
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-brand">Invoices</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2">Sale</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-b">
              <td className="py-2">{sale.vehicle?.year} {sale.vehicle?.make} {sale.vehicle?.model} — {sale.buyer?.name}</td>
              <td>₱{Number(sale.total_amount).toLocaleString()}</td>
              <td>
                {generated[sale.id] ? (
                  <a href={backendUrl(`/storage/${generated[sale.id]}`)} target="_blank" rel="noreferrer" className="text-brand underline">
                    View PDF
                  </a>
                ) : (
                  <button onClick={() => generateInvoice(sale.id)} className="rounded bg-brand px-3 py-1 text-white">
                    Generate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
