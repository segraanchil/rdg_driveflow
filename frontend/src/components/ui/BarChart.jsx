import { useState } from 'react'

/**
 * Single-series column chart (one hue, so no legend; the card title names the series).
 * Thin columns with a rounded data-end anchored to the baseline, a recessive grid, a hover/focus
 * tooltip on every column, the latest value labelled, and a table view for screen readers.
 */
export default function BarChart({ data, format = (v) => v, label, height = 180, integer = false }) {
  const [active, setActive] = useState(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  // Counts (cars sold) get whole-number ticks: the midpoint must not read "0.5 cars".
  const nice = integer ? Math.max(2, Math.ceil(niceMax(max) / 2) * 2) : niceMax(max)
  const ticks = [0, nice / 2, nice]
  const last = data.length - 1

  return (
    <figure className="m-0">
      <div className="relative flex gap-2" style={{ height }}>
        {/* y-axis ticks */}
        <div className="flex w-12 shrink-0 flex-col-reverse justify-between pb-6 text-right text-[10px] tabular-nums text-slate-400" aria-hidden>
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 leading-none">{format(t)}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 bottom-6 top-0 flex flex-col-reverse justify-between" aria-hidden>
            {ticks.map((t) => <span key={t} className={`border-t ${t === 0 ? 'border-slate-300' : 'border-dashed border-slate-200'}`} />)}
          </div>
          <div className="absolute inset-x-0 bottom-0 top-0 flex items-end gap-[2px]" aria-hidden>
            {data.map((d, i) => {
              const h = (d.value / nice) * (height - 24)
              const on = active === i
              return (
                <div
                  key={d.key ?? d.label}
                  className="group relative flex h-full flex-1 cursor-default flex-col items-center justify-end pb-6 outline-none"
                  tabIndex={0}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  {(i === last || on) && d.value > 0 && (
                    <span className="mb-1 whitespace-nowrap text-[11px] font-bold tabular-nums text-slate-700">{format(d.value)}</span>
                  )}
                  <span
                    className={`w-full max-w-[28px] rounded-t-[4px] transition-colors ${on ? 'bg-emerald-600' : i === last ? 'bg-emerald-500' : 'bg-emerald-400/80'}`}
                    style={{ height: Math.max(d.value > 0 ? 3 : 0, h) }}
                  />
                  <span className="absolute bottom-0 text-[11px] font-semibold text-slate-500">{d.label}</span>
                  {on && (
                    <span className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lift" style={{ bottom: Math.min(height - 30, h + 30) }}>
                      <span className="block font-semibold text-slate-300">{d.tooltipLabel ?? d.label}</span>
                      <span className="font-bold tabular-nums">{format(d.value)}</span>
                      {d.extra && <span className="block text-slate-300">{d.extra}</span>}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{data.map((d) => <tr key={d.key ?? d.label}><th>{d.tooltipLabel ?? d.label}</th><td>{format(d.value)}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}
