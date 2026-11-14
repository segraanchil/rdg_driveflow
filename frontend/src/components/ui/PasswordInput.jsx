import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

/**
 * Password field with a lock icon and a show/hide toggle.
 * The icons are centred with flexbox, not transforms: the global "button press" effect
 * (translateY on :active) would otherwise override the centring and make the eye jump.
 */
export default function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Lock size={16} /></span>
      <input {...props} type={show ? 'text' : 'password'} className={`rdg-password w-full pl-9 pr-11 ${className}`} />
      <span className="absolute inset-y-0 right-1.5 flex items-center">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} title={show ? 'Hide password' : 'Show password'}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:!transform-none">
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </span>
  )
}
