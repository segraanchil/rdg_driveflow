import { useEffect, useRef, useState } from 'react'
import { onValue, push, ref } from 'firebase/database'
import { database } from '../../firebase/config'
import apiClient from '../../api/client'

/** AI chatbot widget with human-agent escalation. No login required. */
export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const sessionId = useRef(crypto.randomUUID())

  useEffect(() => {
    if (!database || !open) return

    const messagesRef = ref(database, `chats/${sessionId.current}/messages`)
    return onValue(messagesRef, (snapshot) => {
      const value = snapshot.val() ?? {}
      setMessages(Object.values(value))
    })
  }, [open])

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim()) return

    if (database) {
      await push(ref(database, `chats/${sessionId.current}/messages`), {
        sender: 'user',
        text,
        at: Date.now(),
      })
    }
    await apiClient.post('/chat/message', { session_id: sessionId.current, text })
    setText('')
  }

  async function escalate() {
    await apiClient.post('/chat/escalate', { session_id: sessionId.current })
  }

  return (
    <div className="fixed bottom-4 right-4">
      {open ? (
        <div className="flex h-96 w-80 flex-col rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between rounded-t-lg bg-brand px-3 py-2 text-white">
            <span className="text-sm font-semibold">RDG Assistant</span>
            <button onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {database ? (
              messages.map((m, i) => (
                <p key={i} className={m.sender === 'user' ? 'text-right' : 'text-left text-slate-600'}>
                  {m.text}
                </p>
              ))
            ) : (
              <p className="text-slate-400">Chat is temporarily unavailable.</p>
            )}
          </div>
          <div className="border-t border-slate-200 p-2">
            <button onClick={escalate} className="mb-2 text-xs text-brand-accent underline">
              Talk to a human agent
            </button>
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask something…"
                className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <button type="submit" className="rounded bg-brand px-3 py-1 text-sm text-white">
                Send
              </button>
            </form>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-brand px-4 py-3 text-white shadow-lg"
        >
          Chat
        </button>
      )}
    </div>
  )
}
