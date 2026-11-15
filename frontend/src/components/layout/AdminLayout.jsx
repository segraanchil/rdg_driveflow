import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Car, ClipboardCheck, CalendarClock, Landmark, Receipt, FileText, FileSignature, ShieldCheck, Users,
  LayoutDashboard, TrendingUp, Settings, UserCog, LogOut, Menu, X, Gauge, ExternalLink, KeyRound, MessagesSquare,
} from 'lucide-react'
import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { initials } from '../../lib/format'
import NotificationBell from './NotificationBell'
import Logo from '../ui/Logo'

const ADMIN_SECTIONS = [
  {
    label: 'Main Menu',
    links: [
      { to: '/admin/overview', label: 'Overview', icon: Gauge },
      { to: '/admin/inventory', label: 'Inventory', icon: Car },
      { to: '/admin/reservations', label: 'Reservations', icon: ClipboardCheck, badgeKey: 'pending_reservations' },
      { to: '/admin/test-drives', label: 'Test Drives', icon: CalendarClock, badgeKey: 'pending_test_drives' },
    ],
  },
  {
    label: 'Sales & Documents',
    links: [
      { to: '/admin/sales', label: 'Sales', icon: Receipt, badgeKey: 'ready_to_sell' },
      { to: '/admin/invoices', label: 'Invoices', icon: FileText },
      { to: '/admin/legal-documents', label: 'Legal Documents', icon: FileSignature },
    ],
  },
  {
    label: 'Customer Care',
    links: [
      { to: '/admin/financing', label: 'Financing', icon: Landmark, badgeKey: 'documents_to_verify' },
      { to: '/admin/warranty-claims', label: 'Warranty Claims', icon: ShieldCheck, badgeKey: 'open_claims' },
      { to: '/admin/acquisition-leads', label: 'Acquisitions', icon: Users, badgeKey: 'new_leads', badgeType: 'new' },
      { to: '/admin/support', label: 'Support Chat', icon: MessagesSquare, badgeKey: 'chats_waiting' },
    ],
  },
]

const CEO_SECTIONS = [
  {
    label: 'Main Menu',
    links: [
      { to: '/ceo/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/ceo/expansion-fund', label: 'Expansion Fund', icon: TrendingUp },
      { to: '/admin/acquisition-leads', label: 'Acquisitions', icon: Users, badgeKey: 'new_leads', badgeType: 'new' },
      { to: '/admin/support', label: 'Support Chat', icon: MessagesSquare, badgeKey: 'chats_waiting' },
    ],
  },
  {
    label: 'Settings',
    links: [
      { to: '/ceo/settings', label: 'Business Settings', icon: Settings },
      { to: '/ceo/staff', label: 'Manage Admins', icon: UserCog },
    ],
  },
]

/** Live badge counts, refreshed on every page change: real to-dos, not decoration. */
function useSidebarCounts(isCeo, pathname) {
  const [counts, setCounts] = useState({})

  useEffect(() => {
    if (isCeo) {
      apiClient.get('/shared/acquisition-leads', { silent: true })
        .then(({ data }) => setCounts((c) => ({ ...c, new_leads: (data.data ?? []).filter((l) => l.status === 'submitted').length })))
        .catch(() => {})
      apiClient.get('/shared/support', { params: { status: 'open' }, silent: true })
        .then(({ data }) => setCounts((c) => ({ ...c, chats_waiting: data.counts?.waiting ?? 0 })))
        .catch(() => {})
    } else {
      apiClient.get('/admin/overview', { silent: true }).then(({ data }) => setCounts(data.counts ?? {})).catch(() => {})
    }
  }, [isCeo, pathname])

  return counts
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const isCeo = user?.role === 'ceo'
  const sections = isCeo ? CEO_SECTIONS : ADMIN_SECTIONS
  const { pathname } = useLocation()
  const counts = useSidebarCounts(isCeo, pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const current = sections.flatMap((s) => s.links).find((l) => pathname.startsWith(l.to)) ?? (pathname.endsWith('/account') ? { label: 'My Account' } : null)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {menuOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-64 flex-shrink-0 flex-col bg-slate-900 text-slate-300 shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:shadow-none ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Logo onDark className="h-14" />
          <span className="font-display text-sm font-bold uppercase italic leading-tight tracking-wider text-slate-300">{isCeo ? 'Executive' : 'Admin'}<br /><span className="text-slate-500">DriveFlow</span></span>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="ml-auto rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{section.label}</p>
              <div className="space-y-1">
                {section.links.map((link) => {
                  const Icon = link.icon
                  const badge = link.badgeKey ? counts[link.badgeKey] ?? 0 : 0
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <span className="flex items-center gap-3"><Icon size={17} strokeWidth={2} />{link.label}</span>
                      {badge > 0 && link.badgeType === 'new' && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">New</span>}
                      {badge > 0 && link.badgeType !== 'new' && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">{badge > 99 ? '99+' : badge}</span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <Link to="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
            <ExternalLink size={16} /> View public site
          </Link>
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <NavLink to={isCeo ? '/ceo/account' : '/admin/account'} title="My account · change password"
            className={({ isActive }) => `flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1.5 py-1.5 ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900">{initials(user?.name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{user?.name}</span>
              <span className="flex items-center gap-1 truncate text-xs text-slate-400"><KeyRound size={11} /> My account</span>
            </span>
          </NavLink>
          <button onClick={logout} title="Log out" aria-label="Log out" className="flex-shrink-0 rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><LogOut size={16} /></button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-slate-900 px-4 py-3 text-white lg:hidden">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 hover:bg-white/10"><Menu size={22} /></button>
          <Logo onDark className="h-8" />
          <span className="min-w-0 flex-1 truncate border-l border-white/15 pl-3 font-bold">{current?.label ?? (isCeo ? 'Executive' : 'Admin')}</span>
          <NotificationBell />
        </div>
        <div className="relative z-40 hidden items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-8 py-2.5 backdrop-blur lg:flex">
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Welcome back, <strong className="text-slate-800">{user?.name?.split(' ')[0]}</strong></span>
            <NotificationBell tone="light" />
          </div>
        </div>
        <main className="rdg-pattern min-w-0 flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8">
          <div key={pathname} className="mx-auto max-w-7xl animate-rdg-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
