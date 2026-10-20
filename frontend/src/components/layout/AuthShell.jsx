import { Link } from 'react-router-dom'
import { Car, Rotate3d, ShieldCheck, Landmark } from 'lucide-react'

/** Split-screen frame for the sign-in pages: RDG brand panel + the form card. */
export default function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="relative hidden w-[44%] overflow-hidden bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="rdg-pattern absolute inset-0 opacity-40" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-emerald-500/25 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500"><Car size={20} /></span>
          <span className="text-lg font-extrabold">RDG DriveFlow</span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-extrabold leading-tight">Your next car,<br />one sign-in away.</h2>
          <ul className="mt-6 space-y-3 text-sm text-slate-300">
            <li className="flex items-center gap-3"><Rotate3d size={18} className="text-emerald-400" /> 360° virtual showroom</li>
            <li className="flex items-center gap-3"><Landmark size={18} className="text-emerald-400" /> Online bank financing applications</li>
            <li className="flex items-center gap-3"><ShieldCheck size={18} className="text-emerald-400" /> Every sign-in protected by an emailed code</li>
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} RDG Car Deals &amp; Services</p>
      </aside>
      <div className="rdg-pattern flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm animate-rdg-fade-up">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white"><Car size={18} /></span>
            <span className="font-extrabold text-slate-900">RDG DriveFlow</span>
          </Link>
          <div className="rdg-card p-7">{children}</div>
        </div>
      </div>
    </div>
  )
}
