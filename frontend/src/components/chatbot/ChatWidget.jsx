import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, UserRound, Bot } from 'lucide-react'
import apiClient from '../../api/client'

// Firebase is only needed once someone opens the chat, so it is loaded on demand instead of
// being part of every page download.
let firebasePromise = null
function loadFirebase() {
  firebasePromise ??= Promise.all([import('../../firebase/config'), import('firebase/database')]).then(
    ([config, db]) => ({ database: config.database, ...db }),
  )
  return firebasePromise
}

/** AI chatbot widget with human-agent escalation. No login required. */
export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [fb, setFb] = useState(undefined) // undefined = loading, null = unavailable
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [escalated, setEscalated] = useState(false)
  const sessionId = useRef(crypto.randomUUID())
  const listRef = useRef(null)

  useEffect(() => {
    if (!open || fb !== undefined) return
    loadFirebase().then((f) => setFb(f.database ? f : null)).catch(() => setFb(null))
  }, [open, fb])

  useEffect(() => {
    if (!fb || !open) return
    const messagesRef = fb.ref(fb.database, `chats/${sessionId.current}/messages`)
    return fb.onValue(messagesRef, (snapshot) => setMessages(Object.values(snapshot.val() ?? {})))
  }, [fb, open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim()) return
    const value = text
    setText('')
    if (fb) await fb.push(fb.ref(fb.database, `chats/${sessionId.current}/messages`), { sender: 'user', text: value, at: Date.now() })
    await apiClient.post('/chat/message', { session_id: sessionId.current, text: value }, { silent: true })
  }

  async function escalate() {
    await apiClient.post('/chat/escalate', { session_id: sessionId.current }, { loadingText: 'Calling an agent…' })
    setEscalated(true)
  }

  return (
    <div className="fixed bottom-4 right-4 z-30">
      {open ? (
        <div className="flex h-[28rem] max-h-[calc(100dvh-2rem)] w-[min(22rem,calc(100vw-2rem))] animate-rdg-fade-up flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift">
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500"><Bot size={17} /></span>
            <div className="flex-1 leading-tight">
              <p className="text-sm font-bold">RDG Assistant</p>
              <p className="text-[11px] text-emerald-300">{fb ? 'Online' : fb === null ? 'Offline' : 'Connecting…'}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </div>
          <div ref={listRef} className="rdg-pattern flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {fb === undefined && <div className="rdg-skeleton h-10 w-3/4" />}
            {fb === null && (
              <div className="rounded-xl bg-white p-3 text-slate-500 shadow-sm">
                Chat is temporarily unavailable. You can still reach a person with the button below.
              </div>
            )}
            {fb && messages.length === 0 && <div className="rounded-xl bg-white p-3 text-slate-500 shadow-sm">Hi! Ask about a car, financing, or test drives.</div>}
            {fb && messages.map((m, i) => (
              <p key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.sender === 'user' ? 'ml-auto rounded-br-sm bg-emerald-500 text-white' : 'rounded-bl-sm bg-white text-slate-700 shadow-sm'}`}>
                {m.text}
              </p>
            ))}
          </div>
          <div className="border-t border-slate-200 p-3">
            <button onClick={escalate} disabled={escalated} className="mb-2 flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline disabled:no-underline">
              <UserRound size={13} /> {escalated ? 'An agent has been notified' : 'Talk to a human agent'}
            </button>
            <form onSubmit={sendMessage} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask something…" className="flex-1 text-sm" disabled={!fb} />
              <button type="submit" disabled={!fb || !text.trim()} className="rdg-btn px-3" aria-label="Send"><Send size={16} /></button>
            </form>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 font-bold text-white shadow-lift hover:bg-emerald-600">
          <MessageCircle size={19} /> Chat with us
        </button>
      )}
    </div>
  )
}
