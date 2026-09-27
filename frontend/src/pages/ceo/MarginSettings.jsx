import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

/** Global profit margin setting (10-18%). */
export default function MarginSettings() {
  const [margin, setMargin] = useState(12)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    apiClient.get('/ceo/margin-setting').then(({ data }) => setMargin(data.margin_percent))
  }, [])

  async function save() {
    await apiClient.put('/ceo/margin-setting', { margin_percent: margin })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-2xl font-bold text-brand">Global Margin Setting</h1>
      <label className="block text-sm">
        Margin: {margin}%
        <input
          type="range"
          min={10}
          max={18}
          step={0.5}
          value={margin}
          onChange={(e) => setMargin(Number(e.target.value))}
          className="mt-2 w-full"
        />
      </label>
      <button onClick={save} className="mt-4 rounded bg-brand px-4 py-2 text-white">
        Save
      </button>
      {saved && <p className="mt-2 text-sm text-green-600">Saved.</p>}
    </div>
  )
}
