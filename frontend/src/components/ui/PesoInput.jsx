const trim = (x) => String(Number(x.toFixed(2)))

/** "1.25 million", "450 thousand", "950". */
export function amountInWords(n) {
  const v = Number(n)
  if (!v) return ''
  if (v >= 1_000_000) return `${trim(v / 1_000_000)} million`
  if (v >= 1_000) return `${trim(v / 1_000)} thousand`
  return String(v)
}

/** "₱1.25 million", "₱450 thousand", "₱950". */
export function pesoInWords(n) {
  const words = amountInWords(n)
  return words ? `₱${words}` : ''
}

const UNITS = {
  peso: { prefix: '₱', words: pesoInWords, example: 'e.g. 450000 for ₱450 thousand', short: (q) => pesoInWords(q).replace(' thousand', 'K').replace(' million', 'M') },
  km: { suffix: 'km', words: (n) => `${amountInWords(n)} km`, example: 'e.g. 45000 for 45 thousand km', short: (q) => `${amountInWords(q).replace(' thousand', 'K').replace(' million', 'M')} km` },
}

/**
 * Whole-number amount field: commas while typing (1,250,000), a ₱ prefix or "km" suffix, and a
 * plain-words reading underneath ("₱1.25 million", "45 thousand km") so a missing or extra zero is
 * easy to spot. `value`/`onChange(value)` use a plain digit string, e.g. "1250000".
 *   hint: true (example + reading) | 'short' (reading only, once typed) | false
 */
export function AmountInput({ unit = 'peso', value, onChange, required, placeholder = '0', className = '', hint = true, min, max, id, name, disabled, 'aria-label': ariaLabel, quick }) {
  const u = UNITS[unit]
  // Accepts "1250000", 1250000 or an API decimal such as "1250000.00" (whole numbers only).
  const digits = value === '' || value === null || value === undefined ? '' : String(Math.round(Number(String(value).replace(/,/g, '')) || 0))
  const shown = digits ? Number(digits).toLocaleString('en-PH') : ''
  const n = Number(digits)
  const tooLow = digits && min !== undefined && n < min
  const tooHigh = digits && max !== undefined && n > max

  let reading = null
  if (hint === true && !digits) reading = <>Type the full number, {u.example}.</>
  else if (digits && tooLow) reading = <>{u.words(n)}? That looks too low. Check the zeros.</>
  else if (digits && tooHigh) reading = <>{u.words(n)}? That looks too high. Check the zeros.</>
  else if (digits && hint) reading = <>Reads as <strong className="text-slate-800">{u.words(n)}</strong></>

  return (
    <span className="block">
      <span className="relative block">
        {u.prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-slate-500">{u.prefix}</span>}
        <input
          id={id}
          name={name}
          aria-label={ariaLabel}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          disabled={disabled}
          value={shown}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 10))}
          className={`w-full font-semibold tabular-nums ${u.prefix ? 'pl-7' : ''} ${u.suffix ? 'pr-11' : ''} ${className}`}
        />
        {u.suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-500">{u.suffix}</span>}
      </span>
      {reading && hint !== false && (
        <span className={`mt-1 block animate-rdg-fade-in text-xs ${tooLow || tooHigh ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>{reading}</span>
      )}
      {quick && (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => onChange(String(q))}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${n === q ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {u.short(q)}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

/** Peso amount (₱ prefix). */
export default function PesoInput(props) {
  return <AmountInput unit="peso" {...props} />
}

/** Distance in kilometres (km suffix). */
export function KmInput(props) {
  return <AmountInput unit="km" {...props} />
}
