import { useEffect, useRef, useState } from 'react'
import { CarFront } from 'lucide-react'
import { subscribeLoading } from '../../lib/loading'

/**
 * App-wide loading indicators, driven by every API request (see api/client.js):
 *  - any request: thin emerald bar across the top of the screen
 *  - saving / uploading / deleting: a card with a spinning ring and a "driving" car,
 *    shown after 250 ms so instant actions don't flash, and blocking double clicks.
 */
export default function GlobalLoader() {
  const [s, setS] = useState({ reads: 0, writes: 0, message: '' })
  const [showCard, setShowCard] = useState(false)
  const [bar, setBar] = useState(0)
  const timer = useRef(null)

  useEffect(() => subscribeLoading(setS), [])

  const busy = s.reads + s.writes > 0

  // Top bar creeps toward 90% while busy, then completes and fades.
  useEffect(() => {
    if (busy) {
      setBar((b) => (b === 0 ? 15 : b))
      const id = setInterval(() => setBar((b) => b + (90 - b) * 0.15), 250)
      return () => clearInterval(id)
    }
    setBar((b) => (b > 0 ? 100 : 0))
    const id = setTimeout(() => setBar(0), 350)
    return () => clearTimeout(id)
  }, [busy])

  useEffect(() => {
    clearTimeout(timer.current)
    if (s.writes > 0) timer.current = setTimeout(() => setShowCard(true), 250)
    else setShowCard(false)
    return () => clearTimeout(timer.current)
  }, [s.writes])

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] h-[3px] bg-slate-900 shadow-[0_0_8px_rgba(0,0,0,.35)] transition-all duration-300"
        style={{ width: `${bar}%`, opacity: bar > 0 && bar < 100 ? 1 : 0 }}
      />
      {showCard && (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
          <div className="w-64 animate-rdg-fade-up rounded-2xl bg-white p-6 text-center shadow-lift">
            <div className="relative mx-auto mb-4 h-14 w-14">
              <span className="absolute inset-0 rounded-full border-4 border-emerald-100" />
              <span className="absolute inset-0 animate-rdg-spin rounded-full border-4 border-transparent border-r-emerald-500 border-t-emerald-500" />
            </div>
            <p className="font-bold text-slate-900">{s.message || 'Saving…'}</p>
            <div className="relative mx-auto mt-3 h-6 w-40 overflow-hidden">
              <span className="absolute bottom-1 left-0 right-0 border-b-2 border-dashed border-slate-200" />
              <CarFront size={18} className="absolute bottom-1.5 animate-rdg-drive text-emerald-600" />
            </div>
            <p className="mt-1 text-xs text-slate-400">Please don&apos;t close this page.</p>
          </div>
        </div>
      )}
    </>
  )
}
