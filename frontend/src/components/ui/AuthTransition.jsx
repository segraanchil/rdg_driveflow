import { createPortal } from 'react-dom'
import { CheckCircle2 } from 'lucide-react'
import Logo from './Logo'

/**
 * Full-screen branded loader for signing in, verifying the code and creating an account:
 * the RDG logo, a road line with a car driving across, and a short status message.
 * `done` swaps to a check mark for the "Welcome back" moment before redirecting.
 */
export default function AuthTransition({ open, title, subtitle, done = false }) {
  if (!open) return null
  return createPortal(
    <div role="status" aria-live="polite" className="fixed inset-0 z-[95] flex animate-rdg-fade-up flex-col items-center justify-center bg-slate-900 px-6 text-center text-white">
      <Logo onDark className="h-28 sm:h-32" />
      <div className="relative mt-10 h-10 w-64 overflow-hidden" aria-hidden>
        <span className="absolute bottom-2 left-0 right-0 border-b-2 border-dashed border-white/25" />
        {done ? (
          // Centred by a flex wrapper: the fade-up animation sets `transform`, which would cancel a translate-x centring.
          <span className="absolute inset-x-0 -top-1 flex justify-center">
            <span className="flex h-9 w-9 animate-rdg-fade-up items-center justify-center rounded-full bg-slate-900"><CheckCircle2 size={34} className="text-green-400" /></span>
          </span>
        ) : (
          <svg viewBox="0 0 48 20" className="absolute bottom-2.5 h-6 w-14 animate-rdg-road fill-white">
            <path d="M6 13c0-1.2.6-2.2 1.6-2.7L14 7c2-1.5 4.6-2.4 7.4-2.4h7c2.6 0 5 1 6.8 2.8l2.6 2.6 3.3.6c1.6.3 2.9 1.7 2.9 3.4V15H40.6a3.6 3.6 0 0 0-7.2 0H15.6a3.6 3.6 0 0 0-7.2 0H6v-2zm19-6.4v3.6h9.4l-1.6-1.6a6.4 6.4 0 0 0-4.5-2h-3.3zm-2 0h-1.6c-2 0-3.9.6-5.5 1.7l-2.7 1.9H23V6.6z" />
            <circle cx="12" cy="15.4" r="2.6" /><circle cx="37" cy="15.4" r="2.6" />
          </svg>
        )}
      </div>
      <p className="mt-6 font-display text-2xl font-bold uppercase italic tracking-wide">{title}</p>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-slate-400">{subtitle}</p>}
    </div>,
    document.body,
  )
}
