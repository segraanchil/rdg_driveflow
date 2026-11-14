import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Car, Calculator, CarFront, Warehouse, ClipboardList, LogIn, LogOut, Menu, X, UserPlus, ChevronDown, LayoutDashboard, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { initials } from '../../lib/format'

/** Public/buyer/seller top bar: slate-900 with emerald highlights, account menu on the right. */
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
    ...(user?.role !== 'buyer' ? [{ to: user?.role === 'seller' ? '/my-leads' : '/sell-your-car', label: user?.role === 'seller' ? 'My Submissions' : 'Sell Your Car', icon: user?.role === 'seller' ? ClipboardList : CarFront }] : []),
    ...(user?.role === 'buyer' ? [{ to: '/garage', label: 'My Garage', icon: Warehouse }] : []),
  ]
  const accountLinks = [
    ...(isStaff ? [{ to: user.role === 'ceo' ? '/ceo/dashboard' : '/admin/overview', label: 'Staff dashboard', icon: LayoutDashboard }] : []),
    ...(user?.role === 'buyer' ? [{ to: '/garage', label: 'My Garage', icon: Warehouse }, { to: '/warranty-claim', label: 'File a warranty claim', icon: ShieldCheck }] : []),
    ...(user?.role === 'seller' ? [{ to: '/sell-your-car', label: 'Submit a car', icon: CarFront }, { to: '/my-leads', label: 'My submissions', icon: ClipboardList }] : []),
  ]

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/95 text-white backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-900/40"><Car size={19} /></span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight">RDG DriveFlow</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-300">Car Deals &amp; Services</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={linkClass}><Icon size={16} /> {label}</NavLink>)}
          <span className="mx-2 h-6 w-px bg-white/10" />
          {user ? (
            <div ref={menuRef} className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2.5 hover:bg-white/5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold">{initials(user.name)}</span>
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
              <Link to="/register" className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-900/30 hover:bg-emerald-600"><UserPlus size={16} /> Sign Up</Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="animate-rdg-fade-up border-t border-white/10 px-4 pb-4 pt-2 lg:hidden">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold">{initials(user.name)}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-bold">{user.name}</span><span className="block truncate text-xs text-slate-400">{user.email}</span></span>
            </div>
          )}
          <div className="space-y-1">
            {[...links, ...accountLinks.filter((a) => !links.some((l) => l.to === a.to))].map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}><Icon size={16} /> {label}</NavLink>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            {user ? (
              <button onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"><LogOut size={16} /> Log out</button>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}><LogIn size={16} /> Log In</NavLink>
                <Link to="/register" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white"><UserPlus size={16} /> Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
