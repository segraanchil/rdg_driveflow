import { Link } from 'react-router-dom'
import { Rotate3d, ShieldCheck, Landmark } from 'lucide-react'
import Logo from '../ui/Logo'

/** Split-screen frame for the sign-in pages: black brand panel with the RDG logo + the form card. */
export default function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen bg-brand-paper">
      <aside className="relative hidden w-[44%] overflow-hidden bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-[.07] [background-image:repeating-linear-gradient(135deg,#fff_0_1px,transparent_1px_14px)]" />
        <Link to="/" className="relative" aria-label="RDG Car Deals & Services home"><Logo onDark className="h-24" /></Link>
        <div className="relative">
          <h2 className="font-display text-5xl font-bold uppercase italic leading-[.95] tracking-wide">Your next car,<br />one sign-in away.</h2>
          <ul className="mt-6 space-y-3 text-sm text-slate-300">
            <li className="flex items-center gap-3"><Rotate3d size={18} className="text-white" /> 360° virtual showroom</li>
            <li className="flex items-center gap-3"><Landmark size={18} className="text-white" /> Online bank financing applications</li>
            <li className="flex items-center gap-3"><ShieldCheck size={18} className="text-white" /> Every sign-in protected by an emailed code</li>
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} RDG Car Deals &amp; Services</p>
      </aside>
      <div className="rdg-pattern flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm animate-rdg-fade-up">
          <Link to="/" className="mb-6 flex justify-center lg:hidden" aria-label="RDG Car Deals & Services home"><Logo className="h-20" /></Link>
          <div className="rdg-card p-7">{children}</div>
        </div>
      </div>
    </div>
  )
}
