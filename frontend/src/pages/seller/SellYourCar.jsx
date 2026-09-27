import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'

/** "Sell Your Car" submission portal — specs + photos. */
export default function SellYourCar() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ make: '', model: '', year: '', mileage: '', condition_notes: '' })
  const [photos, setPhotos] = useState([])

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    const data = new FormData()
    Object.entries(form).forEach(([key, value]) => data.append(key, value))
    photos.forEach((file) => data.append('photos[]', file))

    const { data: lead } = await apiClient.post('/seller/acquisition-leads', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    navigate(`/appraisal-status/${lead.id}`)
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-brand">Sell Your Car</h1>

      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="Make"
          required
          value={form.make}
          onChange={(e) => setField('make', e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <input
          placeholder="Model"
          required
          value={form.model}
          onChange={(e) => setField('model', e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <input
          placeholder="Year"
          type="number"
          required
          value={form.year}
          onChange={(e) => setField('year', e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <input
          placeholder="Mileage (km)"
          type="number"
          required
          value={form.mileage}
          onChange={(e) => setField('mileage', e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        />
      </div>

      <textarea
        placeholder="Condition notes"
        rows={3}
        value={form.condition_notes}
        onChange={(e) => setField('condition_notes', e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2"
      />

      <label className="block text-sm">
        Photos
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setPhotos(Array.from(e.target.files))}
          className="mt-1 block"
        />
      </label>

      <button type="submit" className="rounded bg-brand px-4 py-2 text-white">
        Submit for Appraisal
      </button>
    </form>
  )
}
