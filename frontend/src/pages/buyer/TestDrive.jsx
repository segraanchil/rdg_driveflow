import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiClient from '../../api/client'

export default function TestDrive() {
  const [searchParams] = useSearchParams()
  const vehicleId = searchParams.get('vehicle_id')
  const [preferredAt, setPreferredAt] = useState('')
  const [note, setNote] = useState('')
  const [testDrive, setTestDrive] = useState(null)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)

    try {
      const { data } = await apiClient.post('/buyer/test-drives', {
        vehicle_id: vehicleId,
        preferred_at: preferredAt,
        note: note || undefined,
      })
      setTestDrive(data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not submit your test drive request.')
    }
  }

  if (testDrive) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold text-brand">Test drive requested</h1>
        <p className="text-slate-500">
          We'll email you once Admin confirms or declines your preferred time.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-bold text-brand">Schedule Test Drive #{vehicleId}</h1>
      <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        Scheduling a test drive does <strong>not</strong> reserve this vehicle — it can still be
        reserved or sold to another buyer before your scheduled time.
      </p>
      <form onSubmit={submit}>
        <label className="mb-4 block text-sm">
          Preferred date &amp; time
          <input
            type="datetime-local"
            value={preferredAt}
            onChange={(e) => setPreferredAt(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            required
          />
        </label>
        <label className="mb-4 block text-sm">
          Note (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            rows={3}
            maxLength={500}
          />
        </label>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-brand px-4 py-2 text-white">
          Request Test Drive
        </button>
      </form>
    </div>
  )
}
