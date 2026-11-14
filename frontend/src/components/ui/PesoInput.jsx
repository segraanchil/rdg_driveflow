/** "₱1.25 million", "₱450 thousand", "₱950". */
export function pesoInWords(n) {
  const v = Number(n)
  if (!v) return ''
  const trim = (x) => String(Number(x.toFixed(2)))
  if (v >= 1_000_000) return `₱${trim(v / 1_000_000)} million`
  if (v >= 1_000) return `₱${trim(v / 1_000)} thousand`
  return `₱${v}`
}

/**
 * Peso amount field: shows commas while typing (1,250,000), a ₱ prefix, and a plain-words
 * reading underneath ("₱1.25 million") so a missing or extra zero is easy to spot.
 * `value` and `onChange(value)` use a plain digit string, e.g. "1250000".
 */
export default function PesoInput({ value, onChange, required, placeholder = '0', className = '', hint = true, min, max, id, name, 'aria-label': ariaLabel, quick }) {
  // Accepts "1250000", 1250000 or an API decimal such as "1250000.00" (whole pesos only).
  const digits = value === '' || value === null || value === undefined ? '' : String(Math.round(Number(String(value).replace(/,/g, '')) || 0))
  const shown = digits ? Number(digits).toLocaleString('en-PH') : ''
  const n = Number(digits)
  const tooLow = digits && min !== undefined && n < min
  const tooHigh = digits && max !== undefined && n > max

  return (
    <span className="block">
      <span className="relative block">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-slate-500">₱</span>
        <input
          id={id}
          name={name}
          aria-label={ariaLabel}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          value={shown}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 10))}
          className={`w-full pl-7 font-semibold tabular-nums ${className}`}
        />
      </span>
      {hint && (
        <span className={`mt-1 block text-xs ${tooLow || tooHigh ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
          {!digits ? 'Type the full amount, e.g. 450000 for ₱450 thousand.' : tooLow ? `${pesoInWords(n)}? That looks too low. Check the zeros.` : tooHigh ? `${pesoInWords(n)}? That looks too high. Check the zeros.` : <>Reads as <strong className="text-slate-800">{pesoInWords(n)}</strong></>}
        </span>
      )}
      {quick && (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => onChange(String(q))}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${n === q ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {pesoInWords(q).replace(' thousand', 'K').replace(' million', 'M')}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
