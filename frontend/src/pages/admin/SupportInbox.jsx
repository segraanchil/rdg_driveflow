import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Send, Phone, Mail, UserRound, Lock, Unlock, MessagesSquare, Globe, Headset, Search, Bot } from 'lucide-react'
import apiClient from '../../api/client'
import { PageHeader } from '../../components/ui/kit'
import { useConfirm } from '../../components/ui/Modal'
import { toast } from '../../lib/toast'
import { listen } from '../../lib/live'

const FILTERS = [['open', 'Open'], ['closed', 'Closed'], ['all', 'All']]
const QUICK = [
  'Hi! Thanks for reaching out. How can I help you today?',
  'The car is still available. Would you like to book a test drive?',
  'You can reserve it online from the car’s page. The reservation fee is paid by GCash or bank transfer.',
  'Our showroom is open Monday to Saturday, 9 AM to 6 PM.',
]

/** Appends new messages, skipping any already shown (two overlapping polls can return the same ones). */
export function mergeById(list, incoming) {
  const seen = new Set(list.map((m) => m.id))
  return [...list, ...incoming.filter((m) => !seen.has(m.id))]
}

function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

/**
 * Support Chat (Admin + CEO): the staff side of the chat widget's "Talk to a person".
 * Left: conversations (newest first, unanswered ones flagged). Right: the chat, refreshed every 4 s.
 * On phones the two panes become two screens with a back button.
 */
export default function SupportInbox() {
  const [params, setParams] = useSearchParams()
  const selected = Number(params.get('c')) || null
  const [filter, setFilter] = useState('open')
  const [q, setQ] = useState('')
  const [list, setList] = useState(null)

  const loadList = useCallback(() => {
    apiClient.get('/shared/support', { params: { status: filter, q: q || undefined }, silent: true }).then(({ data }) => setList(data)).catch(() => {})
  }, [filter, q])

  useEffect(() => {
    const first = setTimeout(loadList, q ? 250 : 0)
    const off = listen('support_feed', loadList) // instant with Firebase; the timer is the fallback
    const id = setInterval(() => { if (!document.hidden) loadList() }, off ? 30000 : 10000)
    return () => { clearTimeout(first); clearInterval(id); off?.() }
  }, [loadList, q])

  const select = (id) => setParams(id ? { c: String(id) } : {}, { replace: false })

  return (
    <div>
      <div className={selected ? 'hidden lg:block' : ''}>
        <PageHeader title="Support Chat" />
      </div>
      <div className="grid gap-4 lg:h-[calc(100dvh-13rem)] lg:min-h-[32rem] lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Conversation list */}
        <aside className={`rdg-card flex min-h-0 flex-col overflow-hidden ${selected ? 'hidden lg:flex' : 'flex'}`}>
          <div className="space-y-2 border-b border-slate-100 p-3">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-xs font-bold">
              {FILTERS.map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)} className={`rounded-md py-1.5 transition ${filter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  {label}{key !== 'all' && list?.counts ? ` (${list.counts[key] ?? 0})` : ''}
                </button>
              ))}
            </div>
            <span className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Search size={15} /></span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or contact" className="w-full py-1.5 pl-9 text-sm" />
            </span>
            {list?.counts?.waiting > 0 && <p className="text-xs font-semibold text-amber-700">{list.counts.waiting} waiting for a reply</p>}
          </div>
          <ul className="min-h-[12rem] flex-1 divide-y divide-slate-100 overflow-y-auto">
            {list === null && [0, 1, 2].map((i) => <li key={i} className="p-3"><div className="rdg-skeleton h-12" /></li>)}
            {list?.items.length === 0 && (
              <li className="flex flex-col items-center px-6 py-12 text-center">
                <MessagesSquare size={28} className="text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">No {filter === 'all' ? '' : filter} chats</p>
                <p className="text-xs text-slate-500">New ones also show up in the notification bell.</p>
              </li>
            )}
            {list?.items.map((c, i) => (
              <li key={c.id} style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }} className="animate-rdg-fade-in">
                <button onClick={() => select(c.id)} className={`flex w-full gap-3 px-3 py-3 text-left transition-colors ${selected === c.id ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {c.name.slice(0, 1).toUpperCase()}
                    {c.unread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-800'}`}>{c.name}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(c.last_message_at)}</span>
                    </span>
                    <span className={`block truncate text-xs ${c.unread ? 'text-slate-800' : 'text-slate-500'}`}>
                      {c.last_message?.sender === 'staff' ? 'You: ' : ''}{c.last_message?.body}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {c.waiting && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Waiting</span>}
                      {c.status === 'closed' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Closed</span>}
                      {c.source === 'assistant' && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700"><Bot size={10} /> High intent</span>}
                      {c.account && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold capitalize text-slate-600">{c.account.role}</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Conversation */}
        <section className={`rdg-card min-h-0 flex-col overflow-hidden ${selected ? 'flex h-[calc(100dvh-7.5rem)] lg:h-auto' : 'hidden lg:flex'}`}>
          {selected ? <Conversation key={selected} id={selected} onBack={() => select(null)} onChanged={loadList} /> : (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Headset size={26} /></span>
              <p className="mt-3 font-bold text-slate-800">Pick a chat</p>
              <p className="text-sm text-slate-500">Choose a conversation on the left to read and reply.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Conversation({ id, onBack, onChanged }) {
  const [conv, setConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const lastId = useRef(0)
  const listRef = useRef(null)
  const [confirm, confirmUi] = useConfirm()

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/shared/support/${id}`, { params: { after: lastId.current || undefined }, silent: true })
      setConv(data.conversation)
      if (data.messages.length) {
        lastId.current = data.messages[data.messages.length - 1].id
        setMessages((m) => mergeById(m, data.messages))
      }
    } catch { /* keep the last state */ }
  }, [id])

  useEffect(() => {
    load().then(onChanged)
    const off = listen('support_feed', load) // any new message: fetch what's new for this chat
    const t = setInterval(() => { if (!document.hidden) load() }, off ? 20000 : 4000)
    return () => { clearInterval(t); off?.() }
  }, [load]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [messages.length])

  async function send(e) {
    e?.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    try {
      await apiClient.post(`/shared/support/${id}/messages`, { body }, { silent: true })
      setText('')
      await load()
      onChanged()
    } catch {
      toast.error('Reply not sent. Try again.')
    } finally {
      setSending(false)
    }
  }

  async function setStatus(status) {
    if (status === 'closed') {
      const ok = await confirm({ title: 'Close this chat?', message: 'The visitor sees that the chat was closed. If they write again, it reopens here.', confirmLabel: 'Close chat' })
      if (!ok) return
    }
    await apiClient.patch(`/shared/support/${id}`, { status }, { silent: true })
    await load()
    onChanged()
    toast.success(status === 'closed' ? 'Chat closed' : 'Chat reopened')
  }

  if (!conv) return <div className="flex-1 p-6"><div className="rdg-skeleton h-full min-h-[12rem]" /></div>

  const contactIsEmail = conv.contact?.includes('@')

  return (
    <>
      <header className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 sm:px-4">
        <button onClick={onBack} aria-label="Back to chats" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"><ArrowLeft size={19} /></button>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white">{conv.name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-900">{conv.name}</p>
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
            {conv.contact && (
              <a href={contactIsEmail ? `mailto:${conv.contact}` : `tel:${conv.contact}`} className="inline-flex items-center gap-1 hover:text-slate-900 hover:underline">
                {contactIsEmail ? <Mail size={12} /> : <Phone size={12} />} {conv.contact}
              </a>
            )}
            {conv.account ? <span className="inline-flex items-center gap-1"><UserRound size={12} /> {conv.account.role} account</span> : <span>Guest</span>}
            {conv.source === 'assistant' && <span className="inline-flex items-center gap-1 font-semibold text-violet-700"><Bot size={12} /> Flagged by the assistant</span>}
            {conv.page && <span className="hidden items-center gap-1 sm:inline-flex"><Globe size={12} /> {conv.page}</span>}
          </p>
        </div>
        {conv.status === 'open'
          ? <button onClick={() => setStatus('closed')} className="rdg-btn-ghost shrink-0 px-3 py-1.5 text-xs"><Lock size={13} /> <span className="hidden sm:inline">Close</span></button>
          : <button onClick={() => setStatus('open')} className="rdg-btn-ghost shrink-0 px-3 py-1.5 text-xs"><Unlock size={13} /> <span className="hidden sm:inline">Reopen</span></button>}
      </header>

      <div ref={listRef} className="rdg-pattern min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm sm:p-4">
        {messages.map((m) => <StaffBubble key={m.id} m={m} />)}
        {conv.visitor_read_at && messages.some((m) => m.sender === 'staff') && (
          <p className="text-right text-[10px] text-slate-400">Seen by visitor {timeAgo(conv.visitor_read_at)} ago</p>
        )}
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {QUICK.map((qr) => (
            <button key={qr} onClick={() => setText(qr)} className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200" title={qr}>
              {qr.length > 34 ? `${qr.slice(0, 34)}…` : qr}
            </button>
          ))}
        </div>
        <form onSubmit={send} className="flex items-end gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Type a reply…  (Enter to send, Shift+Enter for a new line)"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} className="min-h-[2.75rem] flex-1 resize-none text-sm" aria-label="Reply" />
          <button disabled={!text.trim() || sending} className="rdg-btn h-11 px-4" aria-label="Send reply"><Send size={16} /></button>
        </form>
      </div>
      {confirmUi}
    </>
  )
}

function StaffBubble({ m }) {
  if (m.sender === 'system') {
    // The "Flagged as a high-intent buyer…" / "Buying signal…" notes stand out; other system lines stay quiet.
    const flag = /^(Flagged|Buying signal)/.test(m.body)
    return <p className={`mx-auto max-w-[85%] animate-rdg-fade-in rounded-lg px-3 py-1.5 text-center text-xs ${flag ? 'bg-violet-50 font-semibold text-violet-800 ring-1 ring-violet-200' : 'bg-white/80 text-slate-500 ring-1 ring-slate-200'}`}>{m.body}</p>
  }
  // Dealership side (staff and the assistant) on the right, the visitor on the left.
  const ours = m.sender === 'staff' || m.sender === 'bot'
  const bot = m.sender === 'bot'
  const time = new Date(m.at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  return (
    <div className={`flex animate-rdg-fade-up ${ours ? 'justify-end' : ''}`}>
      <div className={`max-w-[80%] ${ours ? 'text-right' : ''}`}>
        <p className={`inline-block whitespace-pre-line rounded-2xl px-3 py-2 text-left ${bot ? 'rounded-br-sm bg-slate-100 text-slate-700 ring-1 ring-slate-200' : ours ? 'rounded-br-sm bg-slate-900 text-white' : 'rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-100'}`}>{m.body}</p>
        <p className="mt-0.5 text-[10px] text-slate-400">{bot ? 'RDG assistant (automatic) · ' : ours ? `${m.staff_name ?? 'Staff'} · ` : ''}{time}</p>
      </div>
    </div>
  )
}
