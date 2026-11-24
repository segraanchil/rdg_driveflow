import { useEffect, useState } from 'react'
import { FileText, FileSignature, Receipt, RefreshCw, Download } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import { formatDateTime } from '../../lib/format'
import { toast } from '../../lib/toast'

export const DOC_TYPES = {
  invoice: { label: 'Invoice', icon: FileText, endpoint: (id) => `/admin/sales/${id}/invoice`, body: {} },
  deed_of_sale: { label: 'Deed of Sale', icon: FileSignature, endpoint: (id) => `/admin/sales/${id}/legal-documents`, body: { doc_type: 'deed_of_sale' } },
  official_receipt: { label: 'Official Receipt', icon: Receipt, endpoint: (id) => `/admin/sales/${id}/legal-documents`, body: { doc_type: 'official_receipt' } },
}

/** Generate / open / regenerate buttons for a sale's documents. */
export default function DocumentButtons({ sale, types = Object.keys(DOC_TYPES), onChange, compact = false }) {
  const [docs, setDocs] = useState(sale.legal_documents ?? [])
  useEffect(() => { setDocs(sale.legal_documents ?? []) }, [sale.legal_documents]) // e.g. regenerated after the owner changed

  async function generate(type, open) {
    const def = DOC_TYPES[type]
    // Open the tab first (synchronously) so the browser doesn't block it as a pop-up.
    const win = open ? window.open('', '_blank') : null
    try {
      const { data } = await apiClient.post(def.endpoint(sale.id), def.body, { loadingText: `Generating ${def.label}…` })
      const next = [...docs.filter((d) => d.doc_type !== type), data]
      setDocs(next)
      onChange?.(next)
      const url = backendUrl(`/storage/${data.file_path}?v=${Date.now()}`)
      if (win) win.location.href = url
      toast.success(`${def.label} ready`)
    } catch {
      win?.close()
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'justify-end'}`}>
      {types.map((type) => {
        const def = DOC_TYPES[type]
        const doc = docs.find((d) => d.doc_type === type)
        const Icon = def.icon
        return doc ? (
          <span key={type} className="inline-flex overflow-hidden rounded-lg ring-1 ring-emerald-200">
            <a href={backendUrl(`/storage/${doc.file_path}`)} target="_blank" rel="noreferrer" title={`Generated ${formatDateTime(doc.generated_at)}`}
              className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
              <Download size={13} /> {def.label}
            </a>
            <button onClick={() => generate(type, false)} title={`Regenerate ${def.label} with the latest details`} aria-label={`Regenerate ${def.label}`}
              className="border-l border-emerald-200 bg-white px-2 text-emerald-700 hover:bg-emerald-50"><RefreshCw size={12} /></button>
          </span>
        ) : (
          <button key={type} onClick={() => generate(type, true)} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300 hover:text-emerald-700 hover:ring-emerald-400">
            <Icon size={13} /> Generate {def.label}
          </button>
        )
      })}
    </div>
  )
}
