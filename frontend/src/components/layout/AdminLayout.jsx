import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Car,
  ClipboardCheck,
  CalendarClock,
  Landmark,
  Receipt,
  FileText,
  FileSignature,
  ShieldCheck,
  Users,
  LayoutDashboard,
  TrendingUp,
  Percent,
  UserCog,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const ADMIN_SECTIONS = [
  {
    label: 'Main Menu',
    links: [
      { to: '/admin/inventory', label: 'Inventory', icon: Car },
      { to: '/admin/reservations', label: 'Reservations', icon: ClipboardCheck, badgeKey: 'reservations' },
      { to: '/admin/test-drives', label: 'Test Drives', icon: CalendarClock, badgeKey: 'testDrives' },
    ],
  },
  {
    label: 'Operations',
    links: [
      { to: '/admin/financing', label: 'Financing', icon: Landmark },
      { to: '/admin/sales', label: 'Sales', icon: Receipt },
      { to: '/admin/invoices', label: 'Invoices', icon: FileText },
      { to: '/admin/legal-documents', label: 'Legal Documents', icon: FileSignature },
      { to: '/admin/warranty-claims', label: 'Warranty Claims', icon: ShieldCheck },
      { to: '/admin/acquisition-leads', label: 'Acquisitions', icon: Users, badgeKey: 'leads', badgeType: 'new' },
    ],
  },
]

const CEO_SECTIONS = [
  {
    label: 'Main Menu',
    links: [
      { to: '/ceo/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/ceo/expansion-fund', label: 'Expansion Fund', icon: TrendingUp },
      { to: '/ceo/margin-settings', label: 'Margin Settings', icon: Percent },
      { to: '/ceo/staff', label: 'Manage Admins', icon: UserCog },
    ],
  },
  {
    label: 'Operations',
    links: [
      { to: '/admin/acquisition-leads', label: 'Acquisitions', icon: Users, badgeKey: 'leads', badgeType: 'new' },
    ],
  },
]

/** Live badge counts — real pending/needs-review counts, not decoration. */
function useSidebarCounts(isCeo) {
  const [counts, setCounts] = useState({ reservations: 0, testDrives: 0, leads: 0 })

  useEffect(() => {
    // Reservations/test-drives are role:admin-only routes — CEO's session
    // would just get a 403, and CEO's sidebar doesn't show those links anyway.
    if (!isCeo) {
      apiClient
        .get('/admin/reservations')
        .then(({ data }) => setCounts((c) => ({ ...c, reservations: data.total ?? 0 })))
        .catch(() => {})

      apiClient
        .get('/admin/test-drives')
        .then(({ data }) => {
          const pending = (data.data ?? []).filter((t) => t.status === 'pending').length
          setCounts((c) => ({ ...c, testDrives: pending }))
        })
        .catch(() => {})
    }

    apiClient
      .get('/shared/acquisition-leads')
      .then(({ data }) => {
        const submitted = (data.data ?? []).filter((l) => l.status === 'submitted').length
        setCounts((c) => ({ ...c, leads: submitted }))
      })
      .catch(() => {})
  }, [isCeo])

  return counts
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const isCeo = user?.role === 'ceo'
  const sections = isCeo ? CEO_SECTIONS : ADMIN_SECTIONS
  const counts = useSidebarCounts(isCeo)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMenuOpen(false), [pathname])

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Phones: the sidebar slides in over the page. Sized to the visible screen (100dvh) so the
          account row at the bottom is never hidden behind the browser's address bar. */}
      {menuOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-64 flex-shrink-0 flex-col bg-slate-900 text-slate-300 shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:shadow-none ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <Car size={18} />
          </span>
          <span className="text-base font-bold text-white">RDG {isCeo ? 'Executive' : 'Admin'}</span>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="ml-auto rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.links.map((link) => {
                  const Icon = link.icon
                  const badgeValue = link.badgeKey ? counts[link.badgeKey] : 0

                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-900/30'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={17} strokeWidth={2} />
                        {link.label}
                      </span>
                      {badgeValue > 0 && link.badgeType === 'new' && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          New
                        </span>
                      )}
                      {badgeValue > 0 && link.badgeType !== 'new' && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
                          {badgeValue}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{isCeo ? 'CEO' : 'Admin'}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="flex-shrink-0 rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-slate-900 px-4 py-3 text-white lg:hidden">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 hover:bg-white/10"><Menu size={22} /></button>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500"><Car size={15} /></span>
          <span className="font-bold">RDG {isCeo ? 'Executive' : 'Admin'}</span>
        </div>
        <main className="rdg-pattern min-w-0 flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8">
          <div className="animate-rdg-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
