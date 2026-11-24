import { useEffect, useState } from 'react'
import Select from './Select'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n) => String(n).padStart(2, '0')
const split = (value) => {
  const [y = '', m = '', d = ''] = (value ?? '').split('-')
  return { y, m: m && String(Number(m)), d: d && String(Number(d)) }
}

/**
 * Month / day / year dropdowns in the site's own style (easier than a calendar for birthdates and
 * expiry dates). value and onChange use "YYYY-MM-DD"; it stays "" until all three are chosen.
 */
export default function DateSelect({ value, onChange, minYear, maxYear, newestFirst = true, required, label = 'Date' }) {
  const [parts, setParts] = useState(() => split(value))

  useEffect(() => { if (value) setParts(split(value)) }, [value])

  const days = new Date(Number(parts.y) || 2000, Number(parts.m) || 1, 0).getDate()
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => (newestFirst ? maxYear - i : minYear + i))

  function set(key, v) {
    const next = { ...parts, [key]: v }
    // Feb 30 → Feb 28/29 when the month or year changes.
    if (next.m && next.d) next.d = String(Math.min(Number(next.d), new Date(Number(next.y) || 2000, Number(next.m), 0).getDate()))
    setParts(next)
    onChange(next.y && next.m && next.d ? `${next.y}-${pad(next.m)}-${pad(next.d)}` : '')
  }

  return (
    <div className="grid grid-cols-[1.5fr_.9fr_1.1fr] gap-2" role="group" aria-label={label}>
      <Select value={parts.m} onChange={(e) => set('m', e.target.value)} required={required} placeholder="Month" aria-label={`${label}: month`} className="w-full text-sm" searchable={false}>
        {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
      </Select>
      <Select value={parts.d} onChange={(e) => set('d', e.target.value)} required={required} placeholder="Day" aria-label={`${label}: day`} className="w-full text-sm" searchable={false}>
        {Array.from({ length: days }, (_, i) => <option key={i + 1} value={String(i + 1)}>{String(i + 1)}</option>)}
      </Select>
      <Select value={parts.y} onChange={(e) => set('y', e.target.value)} required={required} placeholder="Year" aria-label={`${label}: year`} className="w-full text-sm">
        {years.map((y) => <option key={y} value={String(y)}>{String(y)}</option>)}
      </Select>
    </div>
  )
}
