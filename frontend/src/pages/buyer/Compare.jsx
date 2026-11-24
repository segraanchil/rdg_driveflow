import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, CarFront, Check, Minus, Search, X } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import VehicleTags from '../../components/vehicles/VehicleTags'
import { StatusBadge } from '../../components/ui/kit'
import { estimateMonthlyAmortization } from '../../lib/loanCalculator'
import { useSettings } from '../../lib/useSettings'
import { compare, compareEntry, useCompare } from '../../lib/compare'
import { km, peso, vehicleName } from '../../lib/format'

const SLOTS = ['a', 'b']
const featureList = (v) => (v?.features ?? '').split('\n').map((f) => f.trim()).filter(Boolean)

/** Side-by-side spec comparison of two cars. The picked cars live in the URL so a comparison can be shared. */
export default function Compare() {
  const [params, setParams] = useSearchParams()
  const settings = useSettings()
  const picked = useCompare()
  const [cars, setCars] = useState({}) // id → vehicle, or null when it isn't listed anymore
  const [diffOnly, setDiffOnly] = useState(false)

  const ids = SLOTS.map((s) => params.get(s) || null)

  // Opened from the menu: start with the cars already picked while browsing.
  useEffect(() => {
    if (!ids[0] && !ids[1] && picked.length) {
      setParams(Object.fromEntries(picked.map((v, i) => [SLOTS[i], String(v.id)])), { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ids.filter((id) => id && cars[id] === undefined).forEach((id) => {
      apiClient.get(`/vehicles/${id}`)
        .then(({ data }) => setCars((c) => ({ ...c, [id]: data })))
        .catch(() => setCars((c) => ({ ...c, [id]: null })))
    })
  }, [ids.join()]) // eslint-disable-line react-hooks/exhaustive-deps

  const [left, right] = ids.map((id) => (id ? cars[id] : null))
  const both = Boolean(left && right)

  // Keep the Compare buttons on the other pages in step with what is shown here.
  useEffect(() => {
    if (ids.some(Boolean) && ids.every((id) => !id || cars[id] !== undefined)) {
      compare.set([left, right].filter(Boolean).map(compareEntry))
    }
  }, [left, right, ids.join()]) // eslint-disable-line react-hooks/exhaustive-deps

  function choose(slot, vehicle) {
    const next = new URLSearchParams(params)
    if (vehicle) next.set(slot, String(vehicle.id))
    else next.delete(slot)
    if (!SLOTS.some((s) => next.get(s))) compare.clear()
    setParams(next, { replace: true })
  }

  const groups = useMemo(() => buildGroups(left, right, settings), [left, right, settings])
  const shown = groups
    .map(([title, rows]) => [title, diffOnly && both ? rows.filter((r) => r.differs) : rows])
    .filter(([, rows]) => rows.length)

  return (
    <div>
      <h1 className="mb-1">Compare cars</h1>
      <p className="mb-6 text-sm text-slate-500">Pick two cars to see their price and specs side by side.</p>

      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {SLOTS.map((slot, i) => (
          <Slot key={slot} number={i + 1} loading={Boolean(ids[i]) && cars[ids[i]] === undefined} missing={Boolean(ids[i]) && cars[ids[i]] === null}
            vehicle={[left, right][i]} excludeId={ids[1 - i]} onChoose={(v) => choose(slot, v)} />
        ))}
      </div>

      {(left || right) && (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{both ? 'Rows with a shaded background are different.' : 'Add a second car to see the differences.'}</p>
            {both && (
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} className="h-4 w-4" /> Show differences only
              </label>
            )}
          </div>

          {shown.length === 0 ? (
            <p className="rdg-card p-6 text-center text-sm text-slate-500">These two cars have the same listed specs.</p>
          ) : (
            <table className="!table table-fixed !whitespace-normal">
              <colgroup><col className="w-[31%] sm:w-48" /><col /><col /></colgroup>
              <thead>
                <tr>
                  <th scope="col" className="px-3 sm:px-4">Spec</th>
                  {[left, right].map((v, i) => <th key={SLOTS[i]} scope="col" className="px-3 normal-case tracking-normal text-slate-800 sm:px-4">{v ? vehicleName(v) : '—'}</th>)}
                </tr>
              </thead>
              {shown.map(([title, rows]) => (
                <tbody key={title}>
                  <tr className="hover:bg-slate-900"><th colSpan={3} scope="colgroup" className="bg-slate-900 px-3 py-2 text-white sm:px-4">{title}</th></tr>
                  {rows.map((r) => (
                    <tr key={r.label} className={both && r.differs ? 'bg-amber-50/70' : ''}>
                      <th scope="row" className="break-words border-b border-slate-100 px-2 align-top text-[11px] normal-case tracking-normal text-slate-500 sm:px-4 sm:text-sm">{r.label}</th>
                      {r.cells.map((cell, i) => (
                        <td key={SLOTS[i]} className={`break-words px-2 align-top sm:px-4 ${r.strong ? 'text-base font-extrabold text-slate-900' : 'font-semibold text-slate-800'}`}>
                          {cell}
                          {r.best === i && <span className="ml-1.5 inline-block whitespace-nowrap rounded-full bg-green-50 px-1.5 py-0.5 align-middle text-[10px] font-bold text-green-700 ring-1 ring-inset ring-green-600/20">{r.bestLabel}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          )}
          <p className="mt-3 text-xs text-slate-400">Monthly estimates use 20% down over 60 months for employed applicants. “Ask us” means the detail isn’t listed yet.</p>
        </section>
      )}
    </div>
  )
}

/** [group title, [{ label, cells: [left, right], differs, best, bestLabel }]] */
function buildGroups(left, right, settings) {
  const pair = [left, right]
  const text = (v) => (v === null || v === undefined || v === '' ? null : String(v))
  const ask = <span className="font-normal text-slate-400">Ask us</span>
  const empty = <span className="text-slate-300">—</span>

  // `raw` is what is compared; `show` is what is displayed. `better`: 'low' or 'high' marks the better number.
  const row = (label, raw, { show, better, bestLabel, strong } = {}) => {
    const values = pair.map((v) => (v ? raw(v) : null))
    const numbers = values.map((n) => (n === null || n === '' ? NaN : Number(n)))
    let best
    if (left && right && better && numbers.every(Number.isFinite) && numbers[0] !== numbers[1]) {
      best = (better === 'low') === (numbers[0] < numbers[1]) ? 0 : 1
    }
    return {
      label,
      strong,
      best,
      bestLabel,
      differs: Boolean(left && right) && (text(values[0]) ?? '').toLowerCase() !== (text(values[1]) ?? '').toLowerCase(),
      cells: pair.map((v, i) => (!v ? empty : text(values[i]) === null ? ask : show ? show(values[i], v) : values[i])),
    }
  }

  const monthly = (v) => Math.round(estimateMonthlyAmortization({ vehiclePrice: Number(v.selling_price), downPayment: Number(v.selling_price) * 0.2, termMonths: 60, annualInterestRate: Number(settings.loan_rate_employed) }))
  const tagsOf = (v) => (v.tags ?? []).join(', ')
  const features = [...new Map(pair.filter(Boolean).flatMap(featureList).map((f) => [f.toLowerCase(), f])).values()]
  const has = (v, f) => featureList(v).some((x) => x.toLowerCase() === f.toLowerCase())

  return [
    ['Price', [
      row('Selling price', (v) => Number(v.selling_price), { show: (n) => peso(n), better: 'low', bestLabel: 'Lower', strong: true }),
      row('Est. monthly', monthly, { show: (n) => `${peso(n)}/mo`, better: 'low', bestLabel: 'Lower' }),
      row('Availability', (v) => v.status, { show: (s) => <StatusBadge kind="vehicle" status={s} /> }),
    ]],
    ['General', [
      row('Brand', (v) => v.make),
      row('Model', (v) => v.model),
      row('Year', (v) => v.year, { better: 'high', bestLabel: 'Newer' }),
      row('Mileage', (v) => v.mileage, { show: (n) => km(n), better: 'low', bestLabel: 'Lower' }),
      row('Body type', (v) => v.body_type),
      row('Color', (v) => v.color),
      row('Seats', (v) => v.seats, { show: (n) => `${n} seats` }),
    ]],
    ['Engine & drive', [
      row('Engine', (v) => v.engine),
      row('Fuel', (v) => v.fuel_type),
      row('Transmission', (v) => v.transmission),
      row('Drivetrain', (v) => v.drivetrain),
    ]],
    ...(pair.some((v) => v?.tags?.length) ? [['Highlights', [
      { ...row('Tags', tagsOf), cells: pair.map((v, i) => (v?.tags?.length ? <VehicleTags key={SLOTS[i]} tags={v.tags} /> : empty)) },
    ]]] : []),
    ...(features.length ? [['Features', features.map((f) => ({
      label: f,
      differs: Boolean(left && right) && has(left, f) !== has(right, f),
      cells: pair.map((v, i) => (!v ? empty : has(v, f)
        ? <Check key={SLOTS[i]} size={17} strokeWidth={3} className="text-green-600" aria-label="Yes" />
        : <Minus key={SLOTS[i]} size={17} className="text-slate-300" aria-label="Not listed" />)),
    }))]] : []),
  ]
}

function Slot({ number, vehicle, loading, missing, excludeId, onChoose }) {
  const thumb = vehicle?.media?.find((m) => m.type === 'photo')?.file_path ?? vehicle?.media?.find((m) => m.type === '360_frame')?.file_path
  return (
    <div className="rdg-card p-3 sm:p-4">
      <div className="mb-3"><VehiclePicker label={`Car ${number}`} excludeId={excludeId} onChoose={onChoose} /></div>
      {loading ? (
        <div className="rdg-skeleton aspect-video rounded-xl" />
      ) : vehicle ? (
        <>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100">
            {thumb ? <img src={backendUrl(`/storage/${thumb}`)} alt={vehicleName(vehicle)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><CarFront size={36} strokeWidth={1.4} /></div>}
            <button type="button" onClick={() => onChoose(null)} aria-label={`Remove ${vehicleName(vehicle)}`} className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black"><X size={14} /></button>
          </div>
          <p className="mt-3 text-sm font-extrabold leading-tight text-slate-900 sm:text-lg">{vehicleName(vehicle)}</p>
          <p className="text-base font-extrabold text-slate-900 sm:text-xl">{peso(vehicle.selling_price)}</p>
          <Link to={`/inventory/${vehicle.id}`} className="rdg-btn mt-3 w-full px-2">View car</Link>
        </>
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500 sm:text-sm">
          <ArrowLeftRight size={24} className="text-slate-400" />
          {missing ? 'That car isn’t listed anymore. Search for another.' : 'Search for a car above'}
        </div>
      )}
    </div>
  )
}

/** Search box with a result list (cars on the lot), like a spec-site "compare with" field. */
function VehiclePicker({ label, excludeId, onChoose }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState(null)
  const [active, setActive] = useState(0)
  const box = useRef(null)

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => {
      apiClient.get('/vehicles', { params: { q: q.trim() || undefined, per_page: 12 }, silent: true })
        .then(({ data }) => { setResults(data.data ?? []); setActive(0) }).catch(() => setResults([]))
    }, q ? 250 : 0)
    return () => clearTimeout(id)
  }, [q, open])

  useEffect(() => {
    if (!open) return
    const close = (e) => !box.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const list = (results ?? []).filter((v) => String(v.id) !== String(excludeId))

  function pick(v) {
    onChoose(v)
    setQ('')
    setOpen(false)
  }

  function onKey(e) {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(list.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && open && list[active]) { e.preventDefault(); pick(list[active]) }
  }

  return (
    <div ref={box} className="relative">
      <span className="rdg-label">{label}</span>
      <span className="relative block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          role="combobox" aria-expanded={open} aria-label={`Search ${label}`} placeholder="Search a car…" className="w-full py-2 pl-9 text-sm" />
      </span>
      {open && (
        <ul role="listbox" className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-80 min-w-[13rem] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift">
          {results === null && <li className="px-3 py-2.5 text-sm text-slate-400">Searching…</li>}
          {results !== null && list.length === 0 && <li className="px-3 py-2.5 text-sm text-slate-400">{q ? 'No cars match' : 'No other cars listed'}</li>}
          {list.map((v, i) => (
            <li key={v.id} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(v)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg p-2 ${i === active ? 'bg-slate-100' : ''}`}>
              <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-200 text-slate-400">
                {v.media?.[0] ? <img src={backendUrl(`/storage/${v.media[0].file_path}`)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <CarFront size={16} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight text-slate-900">{vehicleName(v)}</span>
                <span className="text-xs text-slate-500">{peso(v.selling_price)} · {km(v.mileage)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
