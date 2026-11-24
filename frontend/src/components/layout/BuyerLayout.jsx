import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { MapPin, Clock, ShieldCheck, Phone, Mail, Landmark } from 'lucide-react'
import Navbar from './Navbar'
import ChatWidget from '../chatbot/ChatWidget'
import { CompareTray } from '../vehicles/CompareControls'
import { useSettings } from '../../lib/useSettings'
import Logo from '../ui/Logo'

export default function BuyerLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const s = useSettings()

  // New page → start at the top (React Router keeps the old scroll position otherwise).
  // Block body on purpose: newer Chromium returns a Promise from scrollTo, and an effect must not return one.
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className={isHome ? 'flex-1' : 'rdg-pattern flex-1'}>
        <div key={pathname} className={isHome ? '' : 'mx-auto max-w-6xl animate-rdg-fade-up px-4 py-8'}>
          <Outlet />
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="inline-block" aria-label="RDG Car Deals & Services home"><Logo onDark className="h-20" /></Link>
            <p className="mt-3 text-sm leading-relaxed">Quality secondhand vehicles with transparent pricing, inspected and ready to drive.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Shop</p>
            <FooterLink to="/inventory">Browse cars</FooterLink>
            <FooterLink to="/compare">Compare cars</FooterLink>
            <FooterLink to="/loan-calculator">Loan calculator</FooterLink>
            <FooterLink to="/sell-your-car">Sell your car</FooterLink>
            <FooterLink to="/garage">My Garage</FooterLink>
            <FooterLink to="/warranty-claim">File a warranty claim</FooterLink>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Visit us</p>
            <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-300" /> {s.business_address}</p>
            <p className="flex items-center gap-2"><Clock size={15} className="text-slate-300" /> {s.business_hours}</p>
            {s.business_phone && <a href={`tel:${s.business_phone}`} className="flex items-center gap-2 hover:text-white"><Phone size={15} className="text-slate-300" /> {s.business_phone}</a>}
            {s.business_email && <a href={`mailto:${s.business_email}`} className="flex items-center gap-2 hover:text-white"><Mail size={15} className="text-slate-300" /> {s.business_email}</a>}
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Shop with confidence</p>
            <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-slate-300" /> 1-month money-back guarantee</p>
            <p className="flex items-center gap-2"><Landmark size={15} className="text-slate-300" /> Bank financing assistance</p>
            <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-slate-300" /> Legal documents ready on sale</p>
          </div>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} RDG Car Deals &amp; Services</p>
      </footer>
      <CompareTray />
      <ChatWidget />
    </div>
  )
}

function FooterLink({ to, children }) {
  return <Link to={to} className="block hover:text-white">{children}</Link>
}
