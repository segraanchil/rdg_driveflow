import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, CarFront, Check, X } from 'lucide-react'
import { backendUrl } from '../../api/client'
import { MAX_COMPARE, compare, compareUrl, useCompare } from '../../lib/compare'
import { toast } from '../../lib/toast'

/** Adds/removes a car from the comparison. Picking the second car offers to open the comparison. */
export function CompareButton({ vehicle, className = '', size = 'sm' }) {
  const list = useCompare()
  const on = list.some((v) => v.id === vehicle.id)
  const navigate = useNavigate()

  function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    const result = compare.toggle(vehicle)
    if (result === 'full') toast.info('You can compare 2 cars at a time. Remove one first.')
    else if (result === 'added' && list.length + 1 === MAX_COMPARE) navigate(compareUrl([...list, vehicle]))
  }

  const look = size === 'sm'
    ? `rounded-full px-2.5 py-1 text-[11px] shadow-sm backdrop-blur ${on ? 'bg-slate-900 text-white' : 'bg-white/90 text-slate-800 hover:bg-white'}`
    : `rounded-lg border px-3 py-2 text-sm ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-900'}`

  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={`${on ? 'Remove from' : 'Add to'} comparison: ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      className={`inline-flex items-center justify-center gap-1.5 font-bold ${look} ${className}`}>
      {on ? <Check size={size === 'sm' ? 12 : 16} /> : <ArrowLeftRight size={size === 'sm' ? 12 : 16} />} {on ? 'Comparing' : 'Compare'}
    </button>
  )
}

/** Small tray while one or two cars are picked; shown on the browsing pages only. */
export function CompareTray() {
  const list = useCompare()
  const { pathname } = useLocation()
  const onDetail = /^\/inventory\/\d+/.test(pathname)
  if (list.length === 0 || !(pathname === '/' || pathname === '/inventory' || onDetail)) return null

  return (
    <div className={`fixed left-4 z-30 flex max-w-[calc(100vw-6.5rem)] animate-rdg-fade-up items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lift backdrop-blur ${onDetail ? 'bottom-24 lg:bottom-4' : 'bottom-4'}`}>
      {list.map((v) => (
        <span key={v.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-100 py-1 pl-1 pr-1.5">
          <span className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-200 text-slate-400">
            {v.thumb ? <img src={backendUrl(`/storage/${v.thumb}`)} alt="" className="h-full w-full object-cover" /> : <CarFront size={16} />}
          </span>
          <span className="hidden max-w-[9rem] truncate text-xs font-semibold text-slate-800 sm:block">{v.name}</span>
          <button type="button" onClick={() => compare.remove(v.id)} aria-label={`Remove ${v.name}`} className="rounded-full p-1 text-slate-500 hover:bg-white hover:text-slate-900"><X size={13} /></button>
        </span>
      ))}
      <Link to={compareUrl(list)} className="rdg-btn shrink-0 px-3 py-2"><ArrowLeftRight size={15} /> {list.length < MAX_COMPARE ? <span><span className="hidden sm:inline">Choose another</span><span className="sm:hidden">1 of 2</span></span> : 'Compare'}</Link>
    </div>
  )
}
