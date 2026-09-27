import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

/** Warranty claim submission — 1-month money-back guarantee, with evidence upload. */
export default function WarrantyClaim() {
  const [sales, setSales] = useState([])
  const [saleId, setSaleId] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [evidence, setEvidence] = useState([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    apiClient.get('/buyer/sales').then(({ data }) => setSales(data))
  }, [])

  async function submit(e) {
    e.preventDefault()
    const form = new FormData()
    form.append('sale_id', saleId)
    form.append('issue_description', issueDescription)
    evidence.forEach((file) => form.append('evidence[]', file))

    await apiClient.post('/buyer/warranty-claims', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold text-brand">Claim submitted</h1>
        <p className="text-slate-500">Our team will review your warranty claim shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold text-brand">Warranty Claim</h1>

      <label className="block text-sm">
        Which purchase?
        {sales.length === 0 ? (
          <p className="mt-1 text-sm text-slate-400">
            No purchases on file yet — a warranty claim can only be filed against a completed sale.
          </p>
        ) : (
          <select
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="" disabled>Select a vehicle you purchased</option>
            {sales.map((sale) => (
              <option key={sale.id} value={sale.id}>
                {sale.vehicle?.year} {sale.vehicle?.make} {sale.vehicle?.model} — purchased {sale.sale_date}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="block text-sm">
        Describe the issue
        <textarea
          value={issueDescription}
          onChange={(e) => setIssueDescription(e.target.value)}
          required
          rows={4}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        Evidence (photos/videos)
        <input
          type="file"
          multiple
          onChange={(e) => setEvidence(Array.from(e.target.files))}
          className="mt-1 block"
        />
      </label>

      <button type="submit" disabled={!saleId} className="rounded bg-brand px-4 py-2 text-white disabled:opacity-50">
        Submit Claim
      </button>
    </form>
  )
}
