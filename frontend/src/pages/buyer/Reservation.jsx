import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiClient from '../../api/client'

export default function Reservation() {
  const [searchParams] = useSearchParams()
  const vehicleId = searchParams.get('vehicle_id')
  const [file, setFile] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)

    const form = new FormData()
    form.append('vehicle_id', vehicleId)
    form.append('payment_proof', file)

    try {
      const { data } = await apiClient.post('/buyer/reservations', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setReservation(data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Reservation failed.')
    }
  }

  if (reservation) {
    return <CountdownTimer reservation={reservation} />
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold text-brand">Reserve Vehicle #{vehicleId}</h1>
      <form onSubmit={submit}>
        <label className="mb-4 block text-sm">
          Proof of payment
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="mt-1 block"
            required
          />
        </label>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-brand px-4 py-2 text-white">
          Submit Reservation
        </button>
      </form>
    </div>
  )
}

function CountdownTimer({ reservation }) {
  const expiresAt = new Date(reservation.expires_at).getTime()
  const remainingMs = Math.max(0, expiresAt - Date.now())
  const hours = Math.floor(remainingMs / 3_600_000)
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000)

  // TODO: tick this live with a setInterval instead of a static render.
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-2 text-2xl font-bold text-brand">Reservation submitted</h1>
      <p className="text-slate-500">Awaiting admin verification of your payment proof.</p>
      <p className="mt-4 text-3xl font-bold text-brand-accent">
        {hours}h {minutes}m remaining
      </p>
    </div>
  )
}
