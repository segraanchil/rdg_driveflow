import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircle, X, Send, UserRound, Bot, ArrowRight } from 'lucide-react'
import apiClient from '../../api/client'

// Firebase is only needed for the live human-agent hand-off, so it is loaded on demand.
let firebasePromise = null
function loadFirebase() {
  firebasePromise ??= Promise.all([import('../../firebase/config'), import('firebase/database')]).then(([config, db]) => ({ database: config.database, ...db }))
  return firebasePromise
}

const STORE_KEY = 'rdg.chat'
const SUGGESTIONS = ['What cars do you have?', 'Cars under ₱600K', 'Financing requirements', 'How do I reserve?', 'Where are you located?']
const WELCOME = { sender: 'bot', text: 'Hi! I’m the RDG assistant. Ask me about our cars, prices, financing, reservations or test drives, any time of day.' }

function restore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY))
    if (saved?.sessionId) return saved
  } catch { /* storage unavailable */ }
  return { sessionId: crypto.randomUUID(), messages: [WELCOME], escalated: false }
}

/**
 * 24/7 assistant (Story 11). Answers come from the backend assistant, which reads the live
 * inventory, so it works without Firebase. "Talk to a person" alerts staff (Story 17); when
 * Firebase is configured, replies typed by an agent stream in live.
 */
export default function ChatWidget() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(restore)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [handoff, setHandoff] = useState(false)
  const [contact, setContact] = useState({ name: '', contact: '' })
  const listRef = useRef(null)
  const { sessionId, messages, escalated } = state

  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, open, handoff])

  // Live agent replies (only when Firebase is configured and the chat was handed off).
  useEffect(() => {
    if (!open || !escalated) return
    let unsub
    loadFirebase().then((fb) => {
      if (!fb.database) return
      unsub = fb.onValue(fb.ref(fb.database, `chats/${sessionId}/messages`), (snap) => {
        const agent = Object.values(snap.val() ?? {}).filter((m) => m.sender === 'agent')
        setState((s) => {
          const known = new Set(s.messages.filter((m) => m.sender === 'agent').map((m) => m.at))
          const fresh = agent.filter((m) => !known.has(m.at))
          return fresh.length ? { ...s, messages: [...s.messages, ...fresh] } : s
        })
      })
    }).catch(() => {})
    return () => unsub?.()
  }, [open, escalated, sessionId])

  const push = (msg) => setState((s) => ({ ...s, messages: [...s.messages, { at: Date.now(), ...msg }] }))

  async function send(value) {
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

  async function escalate(e) {
    e.preventDefault()
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user')
    await apiClient.post('/chat/escalate', { session_id: sessionId, ...contact, last_message: lastUser?.text }, { loadingText: 'Calling our staff…' })
    setHandoff(false)
    setState((s) => ({ ...s, escalated: true }))
    push({ sender: 'system', text: `Our staff has been alerted and will reach you${contact.contact ? ` at ${contact.contact}` : ''} as soon as possible. Showroom hours apply.` })
  }

  // On a car page (phones) the sticky Reserve bar sits at the bottom, so lift the bubble above it.
  const lifted = /^\/inventory\/\d+/.test(pathname)

  return (
    <div className={`fixed right-4 z-30 ${lifted ? 'bottom-24 lg:bottom-4' : 'bottom-4'}`}>
      {open ? (
        <div className="flex h-[32rem] max-h-[calc(100dvh-2rem)] w-[min(23rem,calc(100vw-2rem))] animate-rdg-fade-up flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift">
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900"><Bot size={17} /></span>
            <div className="flex-1 leading-tight">
              <p className="text-sm font-bold">RDG Assistant</p>
              <p className="flex items-center gap-1 text-[11px] text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Online 24/7</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </div>

          <div ref={listRef} className="rdg-pattern flex-1 space-y-2 overflow-y-auto p-3 text-sm" aria-live="polite">
            {messages.map((m, i) => (
              <Bubble key={i} m={m} />
            ))}
            {typing && <p className="w-14 rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-slate-400 shadow-sm"><span className="animate-pulse">•••</span></p>}
            {messages.length <= 1 && !typing && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-900">{s}</button>)}
              </div>
            )}
            {handoff && (
              <form onSubmit={escalate} className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold text-slate-700">How can our staff reach you?</p>
                <input required value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} placeholder="Your name" className="w-full text-sm" />
                <input required value={contact.contact} onChange={(e) => setContact((c) => ({ ...c, contact: e.target.value }))} placeholder="Mobile number or email" className="w-full text-sm" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setHandoff(false)} className="rdg-btn-ghost flex-1 px-3 py-1.5">Cancel</button>
                  <button className="rdg-btn flex-1 px-3 py-1.5">Alert staff</button>
                </div>
              </form>
            )}
          </div>

          <div className="border-t border-slate-200 p-3">
            {!escalated && !handoff && (
              <button onClick={() => setHandoff(true)} className="mb-2 flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"><UserRound size={13} /> Talk to a person</button>
            )}
            <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask something…" aria-label="Message" maxLength={1000} className="flex-1 text-sm" />
              <button type="submit" disabled={!text.trim() || typing} className="rdg-btn px-3" aria-label="Send"><Send size={16} /></button>
            </form>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 font-bold text-white shadow-lift hover:bg-emerald-600">
          <MessageCircle size={19} /> <span className="hidden sm:inline">Chat with us</span>
        </button>
      )}
    </div>
  )
}

function Bubble({ m }) {
  if (m.sender === 'system') return <p className="mx-auto max-w-[90%] rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">{m.text}</p>
  const mine = m.sender === 'user'
  return (
    <div className={`max-w-[88%] ${mine ? 'ml-auto' : ''}`}>
      {m.sender === 'agent' && <p className="mb-0.5 text-[10px] font-bold uppercase text-emerald-700">RDG staff</p>}
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
