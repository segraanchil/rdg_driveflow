import { createPortal } from 'react-dom'
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
      <div className="relative mt-10 flex h-12 w-64 items-center justify-center overflow-hidden" aria-hidden>
        {done ? (
          // The finished state replaces the road: one check mark, centred in the same box by flexbox
          // (no translate tricks, which the pop animation's transform would override).
          <span className="flex h-12 w-12 animate-rdg-pop items-center justify-center rounded-full bg-green-500 text-slate-900 shadow-[0_0_0_6px_rgba(34,197,94,.18)]">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="24" className="animate-rdg-draw" />
            </svg>
          </span>
        ) : (
          <>
          <span className="absolute bottom-2 left-0 right-0 border-b-2 border-dashed border-white/25" />
          <svg viewBox="0 0 48 20" className="absolute bottom-2.5 h-6 w-14 animate-rdg-road fill-white">
            <path d="M6 13c0-1.2.6-2.2 1.6-2.7L14 7c2-1.5 4.6-2.4 7.4-2.4h7c2.6 0 5 1 6.8 2.8l2.6 2.6 3.3.6c1.6.3 2.9 1.7 2.9 3.4V15H40.6a3.6 3.6 0 0 0-7.2 0H15.6a3.6 3.6 0 0 0-7.2 0H6v-2zm19-6.4v3.6h9.4l-1.6-1.6a6.4 6.4 0 0 0-4.5-2h-3.3zm-2 0h-1.6c-2 0-3.9.6-5.5 1.7l-2.7 1.9H23V6.6z" />
            <circle cx="12" cy="15.4" r="2.6" /><circle cx="37" cy="15.4" r="2.6" />
          </svg>
          </>
        )}
      </div>
      <p className="mt-6 font-display text-2xl font-bold uppercase italic tracking-wide">{title}</p>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-slate-400">{subtitle}</p>}
    </div>,
    document.body,
  )
}
