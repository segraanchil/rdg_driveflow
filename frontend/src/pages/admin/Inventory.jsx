import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

const BLANK_FORM = { make: '', model: '', year: '', mileage: '', acquisition_cost: '', repair_fees: '', margin_percent: 12 }

/** Inventory management with automated 10-18% margin calculation. */
export default function Inventory() {
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState(BLANK_FORM)
  const [photos, setPhotos] = useState([])
  const [editingId, setEditingId] = useState(null)

  function load() {
    apiClient.get('/admin/inventory').then(({ data }) => setVehicles(data.data ?? []))
  }

  useEffect(load, [])

  function startEdit(vehicle) {
    setEditingId(vehicle.id)
    setForm({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      mileage: vehicle.mileage,
      acquisition_cost: vehicle.acquisition_cost,
      repair_fees: vehicle.repair_fees,
      margin_percent: Number(vehicle.margin_percent),
    })
    setPhotos([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(BLANK_FORM)
    setPhotos([])
  }

  async function submit(e) {
    e.preventDefault()

    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => body.append(key, value))
    photos.forEach((file) => body.append('photos[]', file))

    if (editingId) {
      body.append('_method', 'PATCH') // multipart PATCH needs method-spoofing to reach $_FILES
      await apiClient.post(`/admin/inventory/${editingId}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } else {
      await apiClient.post('/admin/inventory', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }

    cancelEdit()
    load()
  }

  async function remove(id) {
    await apiClient.delete(`/admin/inventory/${id}`)
    load()
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-brand">Inventory Management</h1>

      <form onSubmit={submit} className="mb-6 grid grid-cols-2 gap-2 rounded border border-slate-200 bg-white p-4 md:grid-cols-4">
        {['make', 'model', 'year', 'mileage', 'acquisition_cost', 'repair_fees'].map((field) => (
          <input
            key={field}
            required
            placeholder={field.replace('_', ' ')}
            value={form[field]}
            onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
        ))}
        <label className="col-span-2 flex items-center gap-2 text-sm md:col-span-2">
          Margin %: {form.margin_percent}
          <input
            type="range"
            min={10}
            max={18}
            step={0.5}
            value={form.margin_percent}
            onChange={(e) => setForm((f) => ({ ...f, margin_percent: Number(e.target.value) }))}
            className="flex-1"
          />
        </label>
        <label className="col-span-2 text-sm md:col-span-4">
          360° photos {editingId && <span className="text-slate-400">(optional — adds to existing set)</span>}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files))}
            className="mt-1 block text-xs"
          />
        </label>
        <div className="col-span-2 flex gap-2 md:col-span-4">
          <button type="submit" className="flex-1 rounded bg-brand px-4 py-2 text-white">
            {editingId ? 'Update Vehicle' : 'Add Vehicle'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="rounded border border-slate-300 px-4 py-2">
              Cancel
            </button>
          )}
        </div>
      </form>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2">Vehicle</th>
            <th>Status</th>
            <th>Selling Price</th>
            <th>Photos</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id} className="border-b">
              <td className="py-2">{v.year} {v.make} {v.model}</td>
              <td>{v.status}</td>
              <td>₱{Number(v.selling_price).toLocaleString()}</td>
              <td>{v.media?.length ?? 0}</td>
              <td className="space-x-3">
                <button onClick={() => startEdit(v)} className="text-brand underline">Edit</button>
                <button onClick={() => remove(v.id)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
