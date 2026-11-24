import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Info } from 'lucide-react'
import apiClient from '../../api/client'
import { EmptyState, ListSkeleton, PageHeader, SearchInput, Tabs } from '../ui/kit'
import DocumentButtons from './DocumentButtons'
import { formatDate, peso, vehicleName } from '../../lib/format'

/** Shared list for the Invoices and Legal Documents pages: every sale + its documents of `types`. */
export default function SaleDocumentsPage({ title, types, tip }) {
  const [sales, setSales] = useState(null)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('missing')

  const load = useCallback(() => {
    apiClient.get('/admin/sales', { params: { q: q || undefined }, silent: sales !== null }).then(({ data }) => setSales(data.data ?? []))
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setTimeout(load, 250)
    return () => clearTimeout(id)
  }, [load])

  const isComplete = (s) => types.every((t) => (s.legal_documents ?? []).some((d) => d.doc_type === t))
  const missing = (sales ?? []).filter((s) => !isComplete(s))
  const shown = tab === 'missing' ? missing : sales ?? []

  return (
    <div>
      <PageHeader title={title} actions={<SearchInput value={q} onChange={setQ} placeholder="Search buyer or car…" />} />
      {tip && <p className="mb-5 flex gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-800"><Info size={16} className="mt-0.5 shrink-0" /> {tip}</p>}
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'missing', label: 'To generate', count: missing.length }, { key: 'all', label: 'All sales' }]} />

      {sales === null ? (
        <ListSkeleton />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={tab === 'missing' && sales.length ? 'All documents are generated' : 'No sales yet'}
          text={tab === 'missing' && sales.length ? 'Switch to “All sales” to open or regenerate one.' : 'Documents are created from a recorded sale.'}
          action={!sales.length && <Link to="/admin/sales" className="rdg-btn">Go to Sales</Link>}
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((s) => (
            <li key={s.id} className="rdg-card flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900">{vehicleName(s.vehicle)}</p>
                <p className="text-sm text-slate-500">{s.buyer?.name} · {peso(s.total_amount)} · {s.payment_type === 'financing' ? 'Bank financing' : 'Straight cash'} · sold {formatDate(s.sale_date)}</p>
                {s.intended_owner && <p className="mt-0.5 text-xs font-semibold text-slate-700">Named to {s.intended_owner.full_name}</p>}
              </div>
              <DocumentButtons sale={s} types={types} onChange={(docs) => setSales((all) => all.map((x) => (x.id === s.id ? { ...x, legal_documents: docs } : x)))} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
