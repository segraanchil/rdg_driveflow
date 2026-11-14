import { Check, X } from 'lucide-react'

/** Same policy as the backend (app/Support/PasswordRules.php). */
export const PASSWORD_RULES = [
  ['At least 8 characters', (p) => p.length >= 8],
  ['One uppercase letter', (p) => /[A-Z]/.test(p)],
  ['One lowercase letter', (p) => /[a-z]/.test(p)],
  ['One number', (p) => /\d/.test(p)],
]

export const passwordOk = (p) => PASSWORD_RULES.every(([, test]) => test(p))

/** Live checklist under a new-password field, plus a "passwords match" line when `confirm` is given. */
export default function PasswordRules({ password, confirm }) {
  const rows = [...PASSWORD_RULES.map(([label, test]) => [label, test(password)])]
  if (confirm !== undefined && confirm !== '') rows.push(['Both passwords match', password === confirm])
  return (
    <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2" aria-live="polite">
      {rows.map(([label, ok]) => (
        <li key={label} className={`flex items-center gap-1.5 ${ok ? 'text-green-700' : password ? 'text-slate-500' : 'text-slate-400'}`}>
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-green-100' : 'bg-slate-100'}`}>
            {ok ? <Check size={11} strokeWidth={3} /> : <X size={10} strokeWidth={3} className="opacity-60" />}
          </span>
          {label}
        </li>
      ))}
    </ul>
  )
}
