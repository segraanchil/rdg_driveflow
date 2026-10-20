import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ClipboardCheck, Landmark, ShieldCheck, CalendarClock, Users, MessageCircle, CheckCheck } from 'lucide-react'
import apiClient from '../../api/client'

const ICONS = {
  reservation: [ClipboardCheck, 'bg-amber-100 text-amber-600'],
  financing: [Landmark, 'bg-blue-100 text-blue-600'],
  warranty: [ShieldCheck, 'bg-red-100 text-red-600'],
  test_drive: [CalendarClock, 'bg-violet-100 text-violet-600'],
  lead: [Users, 'bg-emerald-100 text-emerald-600'],
  chat: [MessageCircle, 'bg-pink-100 text-pink-600'],
}

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return new Date(iso).toLocaleDateString()
}

/** Staff alerts ("notifies Admin" in the backlog). Checks quietly every 45 s while the tab is open. */
export default function NotificationBell({ tone = 'dark' }) {
  const [data, setData] = useState({ unread: 0, items: [] })
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    if (document.hidden) return
    apiClient.get('/shared/notifications', { silent: true }).then(({ data }) => setData(data)).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 45000)
    document.addEventListener('visibilitychange', load)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', load) }
  }, [load])

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function openItem(n) {
    setOpen(false)
    if (!n.read_at) apiClient.post(`/shared/notifications/${n.id}/read`, {}, { silent: true }).then(load)
    if (n.link) navigate(n.link)
  }
  async function readAll() {
    await apiClient.post('/shared/notifications/read-all', {}, { silent: true })
    load()
  }

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ''}`}
        className={`relative rounded-lg p-2 ${tone === 'dark' ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
      >
        <Bell size={20} />
        {data.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {data.unread > 99 ? '99+' : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-rdg-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lift">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-bold text-slate-900">Notifications</p>
            {data.unread > 0 && (
              <button onClick={readAll} className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"><CheckCheck size={14} /> Mark all read</button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {data.items.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">You&apos;re all caught up.</li>}
            {data.items.map((n) => {
              const [Icon, cls] = ICONS[n.type] ?? ICONS.lead
              return (
                <li key={n.id}>
                  <button onClick={() => openItem(n)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.read_at ? '' : 'bg-emerald-50/50'}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cls}`}><Icon size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        {n.title}
                        {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                      </span>
                      {n.body && <span className="mt-0.5 block text-xs text-slate-500">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
