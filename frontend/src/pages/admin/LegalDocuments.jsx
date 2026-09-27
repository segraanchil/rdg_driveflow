import { useEffect, useState } from 'react'
import apiClient, { backendUrl } from '../../api/client'

const DOC_TYPES = [
  { value: 'deed_of_sale', label: 'Deed of Sale' },
  { value: 'official_receipt', label: 'Official Receipt' },
]

/** Legal document generation (Deed of Sale, Official Receipt) as PDF. */
export default function LegalDocuments() {
  const [sales, setSales] = useState([])

  useEffect(() => {
    apiClient.get('/admin/sales').then(({ data }) => setSales(data.data ?? []))
  }, [])

  async function generate(saleId, docType) {
    const { data } = await apiClient.post(`/admin/sales/${saleId}/legal-documents`, { doc_type: docType })
    window.open(backendUrl(`/storage/${data.file_path}`), '_blank')
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-brand">Legal Documents</h1>
      <div className="space-y-3">
        {sales.map((sale) => (
          <div key={sale.id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 text-sm">
            <span>{sale.vehicle?.year} {sale.vehicle?.make} {sale.vehicle?.model} — {sale.buyer?.name}</span>
            <span className="flex gap-2">
              {DOC_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => generate(sale.id, type.value)}
                  className="rounded border border-brand px-2 py-1 text-brand"
                >
                  {type.label}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
