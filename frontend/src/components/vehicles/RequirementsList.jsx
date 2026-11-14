import { useEffect, useState } from 'react'
import { FileText, CheckCircle2 } from 'lucide-react'
import apiClient from '../../api/client'
import { PROFILE_LABELS } from '../../lib/format'

const cache = {}

/** Fetches the requirement list for an employment profile: [{ key, label, quantity, details[] }]. */
export function useRequirements(profile) {
  const [items, setItems] = useState(cache[profile] ?? null)
  useEffect(() => {
    if (!profile) return setItems(null)
    if (cache[profile]) return setItems(cache[profile])
    let alive = true
    apiClient.get(`/financing/checklist/${profile}`, { silent: true }).then(({ data }) => {
      cache[profile] = data.requirements ?? []
      if (alive) setItems(cache[profile])
    }).catch(() => alive && setItems([]))
    return () => { alive = false }
  }, [profile])
  return items
}

/** What exactly to prepare for a bank auto loan, per employment profile (Story 07). */
export default function RequirementsList({ profile, compact = false }) {
  const items = useRequirements(profile)
  if (!profile) return null
  if (!items) return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="rdg-skeleton h-14 rounded-xl" />)}</div>

  return (
    <div className="animate-rdg-fade-up">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><FileText size={16} /> Requirements for {PROFILE_LABELS[profile]} applicants</p>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={item.key} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="flex items-start gap-2 text-sm font-semibold text-slate-900">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{i + 1}</span>
                {item.label}
              </p>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">{item.quantity}</span>
            </div>
            {!compact && (
              <ul className="mt-2 space-y-1 pl-7 text-xs leading-relaxed text-slate-600">
                {item.details.map((d) => <li key={d} className="flex gap-1.5"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-slate-400" /> {d}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-slate-500">Clear photos or scans (PDF, JPG or PNG) are fine for the online application. The partner bank may ask to see the originals.</p>
    </div>
  )
}
