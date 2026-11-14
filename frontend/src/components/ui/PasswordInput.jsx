import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

/** Password field with a lock icon and a show/hide toggle. */
export default function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative block">
      <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input {...props} type={show ? 'text' : 'password'} className={`w-full pl-9 pr-11 ${className}`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  )
}
