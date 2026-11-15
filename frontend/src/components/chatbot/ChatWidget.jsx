import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { MessageCircle, X, Send, UserRound, Bot, ArrowRight, Headset } from 'lucide-react'
import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { chatKey, readJson, supportKey, writeJson } from '../../lib/chatStorage'

const SUGGESTIONS = ['What cars do you have?', 'Cars under ₱600K', 'Financing requirements', 'How do I reserve?', 'Where are you located?']
const WELCOME = { sender: 'bot', text: 'Hi! I’m the RDG assistant. Ask me about our cars, prices, financing, reservations or test drives, any time of day.' }

/** The assistant chat of one owner ("u<id>" or "guest"); a fresh one when there is none. owner null = not known yet. */
function restore(owner) {
  const saved = owner ? readJson(chatKey(owner)) : null
  if (saved?.sessionId) return { ...saved, owner }
  return { owner, sessionId: crypto.randomUUID(), messages: [WELCOME] }
}
function mergeById(list, incoming) {
  const seen = new Set(list.map((m) => m.id))
  return [...list, ...incoming.filter((m) => !seen.has(m.id))]
}
const readSupport = (owner) => (owner ? readJson(supportKey(owner)) : null)

/**
 * Chat widget with two modes:
 *  - Assistant (Story 11): instant answers from the live inventory, 24/7.
 *  - Staff chat ("Talk to a person", Story 17): a live conversation with Admin/CEO, who answer from
 *    the Support Chat inbox. Stored in MySQL; the widget checks for replies every few seconds while
 *    open (every 30 s while closed, to show the unread dot).
 */
export default function ChatWidget() {
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const { user, loading } = useAuth()
  // Whose chat this is. Until sign-in state is known, nothing is loaded or saved.
  const owner = loading ? null : user ? `u${user.id}` : 'guest'
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('bot') // bot | staff
  const [state, setState] = useState(() => restore(null))
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [handoff, setHandoff] = useState(false)
  const [contact, setContact] = useState({ name: '', contact: '' })
  const [support, setSupport] = useState(null) // { id, token } of this owner's live chat with staff
  const [live, setLive] = useState({ messages: [], status: 'open' })
  const [unread, setUnread] = useState(false)
  const [error, setError] = useState(null)
  const listRef = useRef(null)
  const lastId = useRef(0)
  const { sessionId, messages } = state

  const saveSupport = useCallback((v) => { if (owner) writeJson(supportKey(owner), v) }, [owner])

  // Someone signed in or out: show that person's own chat (or a fresh one), never the previous one.
  useEffect(() => {
    if (!owner || state.owner === owner) return
    setState(restore(owner))
    setSupport(readSupport(owner))
    setLive({ messages: [], status: 'open' })
    lastId.current = 0
    setUnread(false)
    setHandoff(false)
    setMode('bot')
    setText('')
    setError(null)
  }, [owner]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (state.owner) writeJson(chatKey(state.owner), { sessionId: state.sessionId, messages: state.messages }) }, [state])

  // Opened from a notification ("New reply from RDG staff") → /?chat=open
  useEffect(() => {
    if (params.get('chat') === 'open') {
      setOpen(true)
      setMode('staff')
      const next = new URLSearchParams(params)
      next.delete('chat')
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  // Signed-in visitors can continue their latest staff chat from any device.
  useEffect(() => {
    if (!user || support || !['buyer', 'seller'].includes(user.role)) return
    apiClient.get('/support/mine', { silent: true, quietErrors: true }).then(({ data }) => {
      if (data?.conversation) { const v = { id: data.conversation.id, token: data.token }; saveSupport(v); setSupport(v) }
    }).catch(() => {})
  }, [user, support, saveSupport])

  const poll = useCallback(async () => {
    if (!support) return
    try {
      const { data } = await apiClient.get(`/support/conversations/${support.id}`, { params: { after: lastId.current || undefined }, headers: { 'X-Support-Token': support.token }, silent: true, quietErrors: true })
      if (data.messages.length) {
        lastId.current = data.messages[data.messages.length - 1].id
        setLive((l) => ({ status: data.conversation.status, messages: mergeById(l.messages, data.messages) }))
        if (!(open && mode === 'staff') && data.messages.some((m) => m.sender === 'staff')) setUnread(true)
      } else {
        setLive((l) => (l.status === data.conversation.status ? l : { ...l, status: data.conversation.status }))
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) { saveSupport(null); setSupport(null) }
    }
  }, [support, open, mode, saveSupport])

  useEffect(() => {
    if (!support) return
    poll()
    const id = setInterval(() => { if (!document.hidden) poll() }, open && mode === 'staff' ? 4000 : 30000)
    return () => clearInterval(id)
  }, [support, open, mode, poll])

  useEffect(() => { if (open && mode === 'staff') setUnread(false) }, [open, mode])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, live.messages.length, typing, open, handoff, mode])

  const push = (msg) => setState((s) => ({ ...s, messages: [...s.messages, { at: Date.now(), ...msg }] }))

  async function sendBot(value) {
    const message = value.trim()
    if (!message || typing) return
    setText('')
    push({ sender: 'user', text: message })
    setTyping(true)
    try {
      const { data } = await apiClient.post('/chat/message', { session_id: sessionId, text: message, page: pathname }, { silent: true })
      push(data.reply)
    } catch {
      push({ sender: 'bot', text: 'Sorry, I can’t reply right now. Please try again, or tap “Talk to a person”.' })
    } finally {
      setTyping(false)
    }
  }

  async function sendStaff(value) {
    const body = value.trim()
    if (!body || typing) return
    setText('')
    setTyping(true)
    try {
      const { data } = await apiClient.post(`/support/conversations/${support.id}/messages`, { body, after: lastId.current }, { headers: { 'X-Support-Token': support.token }, silent: true, quietErrors: true })
      if (data.messages.length) lastId.current = data.messages[data.messages.length - 1].id
      setLive((l) => ({ status: data.conversation.status, messages: mergeById(l.messages, data.messages) }))
    } catch {
      setError('Message not sent. Check your connection and try again.')
      setText(body)
    } finally {
      setTyping(false)
    }
  }

  async function startStaffChat(e) {
    e.preventDefault()
    setError(null)
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user')
    const first = text.trim() || lastUser?.text || 'Hi, I’d like to talk to someone.'
    try {
      const { data } = await apiClient.post('/support/conversations', { ...contact, message: first, page: pathname }, { loadingText: 'Connecting you to our staff…', quietErrors: true })
      const v = { id: data.conversation.id, token: data.token }
      saveSupport(v)
      lastId.current = data.messages.length ? data.messages[data.messages.length - 1].id : 0
      setLive({ status: data.conversation.status, messages: data.messages })
      setSupport(v)
      setText('')
      setHandoff(false)
      setMode('staff')
    } catch (err) {
      const d = err.response?.data
      setError(d?.errors ? Object.values(d.errors)[0][0] : err.response?.status === 429 ? 'Please wait a minute before trying again.' : 'We couldn’t reach our staff. Try again in a moment.')
    }
  }

  // On a car page (phones) the sticky Reserve bar sits at the bottom, so lift the bubble above it.
  const lifted = /^\/inventory\/\d+/.test(pathname)
  const staffMode = mode === 'staff' && support

  return (
    <div className={`fixed right-4 z-30 ${lifted ? 'bottom-24 lg:bottom-4' : 'bottom-4'}`}>
      {open ? (
        <div className="flex h-[34rem] max-h-[calc(100dvh-2rem)] w-[min(23rem,calc(100vw-2rem))] origin-bottom-right animate-rdg-fade-up flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift">
          <div className="bg-slate-900 px-4 pt-3 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900">{staffMode ? <Headset size={17} /> : <Bot size={17} />}</span>
              <div className="flex-1 leading-tight">
                <p className="text-sm font-bold">{staffMode ? 'RDG staff' : 'RDG Assistant'}</p>
                <p className="flex items-center gap-1 text-[11px] text-slate-300">
                  <span className={`h-1.5 w-1.5 rounded-full ${staffMode && live.status === 'closed' ? 'bg-slate-500' : 'bg-green-400'}`} />
                  {staffMode ? (live.status === 'closed' ? 'Chat closed · send a message to reopen' : 'Live chat · replies during showroom hours') : 'Online 24/7'}
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>
            {support && (
              <div className="mt-3 grid grid-cols-2 gap-1 text-xs font-semibold" role="tablist">
                {[['bot', 'Assistant', Bot], ['staff', 'Staff chat', Headset]].map(([key, label, Icon]) => (
                  <button key={key} role="tab" aria-selected={mode === key} onClick={() => setMode(key)}
                    className={`relative flex items-center justify-center gap-1.5 rounded-t-lg py-2 transition-colors ${mode === key ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'}`}>
                    <Icon size={13} /> {label}
                    {key === 'staff' && unread && mode !== 'staff' && <span className="h-2 w-2 rounded-full bg-red-500" />}
                  </button>
                ))}
              </div>
            )}
            {!support && <div className="h-3" />}
          </div>

          <div ref={listRef} className="rdg-pattern flex-1 space-y-2 overflow-y-auto p-3 text-sm" aria-live="polite">
            {staffMode ? (
              <>
                {live.messages.map((m) => <LiveBubble key={m.id} m={m} />)}
                {live.messages.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Loading your chat…</p>}
              </>
            ) : (
              <>
                {messages.map((m, i) => <Bubble key={i} m={m} />)}
                {messages.length <= 1 && !typing && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SUGGESTIONS.map((s, i) => <button key={s} onClick={() => sendBot(s)} style={{ animationDelay: `${i * 60}ms` }} className="animate-rdg-fade-up rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-900">{s}</button>)}
                  </div>
                )}
              </>
            )}
            {typing && <p className="w-14 rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-slate-400 shadow-sm"><span className="animate-pulse">•••</span></p>}
            {handoff && !support && (
              <form onSubmit={startStaffChat} className="animate-rdg-fade-up space-y-2 rounded-xl bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold text-slate-700">Chat with our staff</p>
                {user ? (
                  <p className="text-xs text-slate-500">You’re signed in as <strong>{user.name}</strong>. We’ll reply right here.</p>
                ) : (
                  <>
                    <input required value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} placeholder="Your name" aria-label="Your name" className="w-full text-sm" />
                    <input required value={contact.contact} onChange={(e) => setContact((c) => ({ ...c, contact: e.target.value }))} placeholder="Mobile number or email" aria-label="Mobile number or email" className="w-full text-sm" />
                    <p className="text-[11px] text-slate-400">In case you leave before we reply.</p>
                  </>
                )}
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="What can we help you with? (optional)" className="w-full text-sm" />
                {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setHandoff(false); setError(null) }} className="rdg-btn-ghost flex-1 px-3 py-1.5">Cancel</button>
                  <button className="rdg-btn flex-1 px-3 py-1.5">Start chat</button>
                </div>
              </form>
            )}
          </div>

          <div className="border-t border-slate-200 p-3">
            {!support && !handoff && (
              <button onClick={() => setHandoff(true)} className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-900 hover:underline"><UserRound size={13} /> Talk to a person</button>
            )}
            {support && mode === 'bot' && (
              <button onClick={() => setMode('staff')} className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-900 hover:underline"><Headset size={13} /> Back to your staff chat{unread && <span className="ml-1 h-2 w-2 rounded-full bg-red-500" />}</button>
            )}
            {staffMode && error && <p className="mb-2 text-xs font-semibold text-red-600">{error}</p>}
            {!handoff && (
              <form onSubmit={(e) => { e.preventDefault(); setError(null); staffMode ? sendStaff(text) : sendBot(text) }} className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={staffMode ? 'Message our staff…' : 'Ask something…'} aria-label="Message" maxLength={staffMode ? 2000 : 1000} className="flex-1 text-sm" />
                <button type="submit" disabled={!text.trim() || typing} className="rdg-btn px-3" aria-label="Send"><Send size={16} /></button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <button onClick={() => { setOpen(true); if (unread) setMode('staff') }} className="relative flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 font-bold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-emerald-600">
          <MessageCircle size={19} /> <span className="hidden sm:inline">{unread ? 'New reply' : 'Chat with us'}</span>
          {unread && <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-4 w-4 rounded-full bg-red-500 ring-2 ring-white" /></span>}
        </button>
      )}
    </div>
  )
}

function Bubble({ m }) {
  if (m.sender === 'system') return <p className="mx-auto max-w-[90%] rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">{m.text}</p>
  const mine = m.sender === 'user'
  return (
    <div className={`max-w-[88%] animate-rdg-fade-up ${mine ? 'ml-auto' : ''}`}>
      <p className={`whitespace-pre-line rounded-2xl px-3 py-2 ${mine ? 'rounded-br-sm bg-emerald-500 text-white' : 'rounded-bl-sm bg-white text-slate-700 shadow-sm'}`}>{m.text}</p>
      {(m.links ?? []).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {m.links.map((l) => (
            <Link key={l.to} to={l.to} className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800">{l.label} <ArrowRight size={11} /></Link>
          ))}
        </div>
      )}
    </div>
  )
}

function LiveBubble({ m }) {
  if (m.sender === 'system') return <p className="mx-auto max-w-[90%] animate-rdg-fade-in rounded-lg bg-slate-100 px-3 py-2 text-center text-xs text-slate-600">{m.body}</p>
  const mine = m.sender === 'visitor'
  const time = new Date(m.at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
  return (
    <div className={`max-w-[88%] animate-rdg-fade-up ${mine ? 'ml-auto text-right' : ''}`}>
      {!mine && <p className="mb-0.5 text-[10px] font-bold uppercase text-slate-500">{m.staff_name ? `${m.staff_name} · RDG staff` : 'RDG staff'}</p>}
      <p className={`inline-block whitespace-pre-line rounded-2xl px-3 py-2 text-left ${mine ? 'rounded-br-sm bg-emerald-500 text-white' : 'rounded-bl-sm bg-white text-slate-700 shadow-sm'}`}>{m.body}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">{time}</p>
    </div>
  )
}
