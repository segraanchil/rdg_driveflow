import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Car, Calculator, CarFront, Warehouse, ClipboardList, LogIn, LogOut, Menu, X, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/** Public/buyer/seller top bar in the admin panel's style: slate-900 with emerald highlights. */
export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  const links = [
    { to: '/inventory', label: 'Inventory', icon: Car },
    { to: '/loan-calculator', label: 'Loan Calculator', icon: Calculator },
    { to: '/sell-your-car', label: 'Sell Your Car', icon: CarFront },
    ...(user?.role === 'buyer' ? [{ to: '/garage', label: 'My Garage', icon: Warehouse }] : []),
    ...(user?.role === 'seller' ? [{ to: '/my-leads', label: 'My Submissions', icon: ClipboardList }] : []),
  ]

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
      isActive ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-900/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'
    }`

  const account = user ? (
    <button onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white">
      <LogOut size={16} /> Log out
    </button>
  ) : (
    <>
      <NavLink to="/login" className={linkClass}><LogIn size={16} /> Log In</NavLink>
      <Link to="/register" className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-900/30 hover:bg-emerald-600">
        <UserPlus size={16} /> Sign Up
      </Link>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/95 text-white backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-900/40">
            <Car size={19} />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight">RDG DriveFlow</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-300">Car Deals &amp; Services</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}><Icon size={16} /> {label}</NavLink>
          ))}
          <span className="mx-2 h-6 w-px bg-white/10" />
          {account}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="animate-rdg-fade-up border-t border-white/10 px-4 pb-4 pt-2 lg:hidden">
          <div className="space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}><Icon size={16} /> {label}</NavLink>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">{account}</div>
        </div>
      )}
    </header>
  )
}
