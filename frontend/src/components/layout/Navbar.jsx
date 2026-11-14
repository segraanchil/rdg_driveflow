import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Car, Calculator, CarFront, Warehouse, ClipboardList, LogIn, LogOut, Menu, X, UserPlus, ChevronDown, LayoutDashboard, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { initials } from '../../lib/format'
import Logo from '../ui/Logo'

/** Public/buyer/seller top bar: white with the black RDG logo (as the artwork is printed), black accents. */
export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)
  const location = useLocation()

  useEffect(() => { setOpen(false); setMenu(false) }, [location.pathname])
  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const isStaff = user?.role === 'admin' || user?.role === 'ceo'
  const links = [
    { to: '/inventory', label: 'Browse Cars', icon: Car },
    { to: '/loan-calculator', label: 'Loan Calculator', icon: Calculator },
    user?.role === 'seller' ? { to: '/my-leads', label: 'My Submissions', icon: ClipboardList } : { to: '/sell-your-car', label: 'Sell Your Car', icon: CarFront },
    ...(user?.role === 'buyer' ? [{ to: '/garage', label: 'My Garage', icon: Warehouse }] : []),
  ]
  const accountLinks = [
    ...(isStaff ? [{ to: user.role === 'ceo' ? '/ceo/dashboard' : '/admin/overview', label: 'Staff dashboard', icon: LayoutDashboard }] : []),
    ...(user?.role === 'buyer' ? [{ to: '/garage', label: 'My Garage', icon: Warehouse }, { to: '/my-leads', label: 'Cars I’m selling', icon: ClipboardList }, { to: '/warranty-claim', label: 'File a warranty claim', icon: ShieldCheck }] : []),
    ...(user?.role === 'seller' ? [{ to: '/sell-your-car', label: 'Submit a car', icon: CarFront }, { to: '/my-leads', label: 'My submissions', icon: ClipboardList }] : []),
  ]

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 text-slate-900 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Link to="/" className="flex items-center gap-3" aria-label="RDG Car Deals & Services home">
          <Logo className="h-12" />
          <span className="hidden border-l border-slate-200 pl-3 font-display text-lg font-bold uppercase italic leading-none tracking-wide text-slate-900 sm:block">Drive<span className="text-slate-400">Flow</span></span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={linkClass}><Icon size={16} /> {label}</NavLink>)}
          <span className="mx-2 h-6 w-px bg-slate-200" />
          {user ? (
            <div ref={menuRef} className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2.5 hover:bg-slate-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials(user.name)}</span>
                <span className="max-w-[9rem] truncate text-sm font-semibold">{user.name.split(' ')[0]}</span>
                <ChevronDown size={15} className="text-slate-400" />
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-60 animate-rdg-fade-up overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-lift">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  {accountLinks.map(({ to, label, icon: Icon }) => (
                    <Link key={to} to={to} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50"><Icon size={16} className="text-slate-400" /> {label}</Link>
                  ))}
                  <button onClick={logout} className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"><LogOut size={16} /> Log out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}><LogIn size={16} /> Log In</NavLink>
              <Link to="/register" className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-black"><UserPlus size={16} /> Sign Up</Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="animate-rdg-fade-up border-t border-slate-200 px-4 pb-4 pt-2 lg:hidden">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-100 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{initials(user.name)}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-bold">{user.name}</span><span className="block truncate text-xs text-slate-500">{user.email}</span></span>
            </div>
          )}
          <div className="space-y-1">
            {[...links, ...accountLinks.filter((a) => !links.some((l) => l.to === a.to))].map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}><Icon size={16} /> {label}</NavLink>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3">
            {user ? (
              <button onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"><LogOut size={16} /> Log out</button>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}><LogIn size={16} /> Log In</NavLink>
                <Link to="/register" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"><UserPlus size={16} /> Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
