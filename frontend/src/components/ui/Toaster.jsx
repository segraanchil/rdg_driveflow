import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { dismiss, subscribeToasts } from '../../lib/toast'

const STYLE = {
  success: ['bg-slate-900 text-white', CheckCircle2, 'text-emerald-400'],
  error: ['bg-red-600 text-white', AlertCircle, 'text-white'],
  info: ['bg-slate-900 text-white', Info, 'text-sky-300'],
}

/** Bottom-center action feedback ("Reservation verified", "Couldn't save…"). */
export default function Toaster() {
  const [items, setItems] = useState([])
  useEffect(() => subscribeToasts(setItems), [])

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {items.map((t) => {
        const [cls, Icon, iconCls] = STYLE[t.type] ?? STYLE.info
        return (
          <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex w-full max-w-sm animate-rdg-fade-up items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lift ${cls}`}>
            <Icon size={18} className={`mt-0.5 shrink-0 ${iconCls}`} />
            <p className="flex-1 font-medium">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-mr-1 rounded p-0.5 opacity-70 hover:opacity-100"><X size={16} /></button>
          </div>
        )
      })}
    </div>
  )
}
