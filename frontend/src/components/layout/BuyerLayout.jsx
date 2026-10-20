import { Link, Outlet, useLocation } from 'react-router-dom'
import { Car, MapPin, Clock, ShieldCheck } from 'lucide-react'
import Navbar from './Navbar'
import ChatWidget from '../chatbot/ChatWidget'

export default function BuyerLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      {/* The home page draws its own full-width hero; every other page sits on a soft dotted backdrop. */}
      <main className={isHome ? 'flex-1' : 'rdg-pattern flex-1'}>
        <div className={isHome ? '' : 'mx-auto max-w-6xl animate-rdg-fade-up px-4 py-8'}>
          <Outlet />
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <Link to="/" className="flex items-center gap-2 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500"><Car size={17} /></span>
              <span className="font-extrabold">RDG DriveFlow</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed">Quality secondhand vehicles with transparent pricing, inspected and ready to drive.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-bold uppercase tracking-wider text-slate-300 text-xs">Visit us</p>
            <p className="flex items-center gap-2"><MapPin size={15} className="text-emerald-400" /> Quezon City, Philippines</p>
            <p className="flex items-center gap-2"><Clock size={15} className="text-emerald-400" /> Mon–Sat, 9:00 AM – 6:00 PM</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-bold uppercase tracking-wider text-slate-300 text-xs">Shop with confidence</p>
            <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-400" /> 1-month money-back guarantee</p>
            <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-400" /> Bank financing assistance</p>
          </div>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} RDG Car Deals &amp; Services</p>
      </footer>
      <ChatWidget />
    </div>
  )
}
