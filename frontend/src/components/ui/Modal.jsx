import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'

/** Centered dialog (bottom sheet on phones). Closes on Escape and backdrop click. */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Runs only when the dialog opens/closes, so typing inside it never steals focus back.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && closeRef.current?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector('input, textarea, select, button[data-autofocus]')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }[size]

  // Portal to <body>: an animated (transformed) page wrapper would otherwise trap position:fixed.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex animate-rdg-fade-in items-end justify-center bg-slate-900/60 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      {/* Phones: slides up as a bottom sheet. Larger screens: fades up in the centre. */}
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[92dvh] w-full animate-rdg-sheet flex-col overflow-hidden rounded-t-2xl bg-white shadow-lift sm:animate-rdg-fade-up sm:rounded-2xl ${width}`}>
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/**
 * Promise-based confirm dialog:
 *   const [confirm, confirmUi] = useConfirm()
 *   if (await confirm({ title, message, confirmLabel, tone: 'danger', input: 'Reason (optional)' })) …
 * With `input`, the promise resolves to { value } instead of true.
 */
export function useConfirm() {
  const [state, setState] = useState(null)
  const [value, setValue] = useState('')

  function confirm(options) {
    setValue('')
    return new Promise((resolve) => setState({ ...options, resolve }))
  }

  function close(result) {
    state?.resolve(result)
    setState(null)
  }

  const danger = state?.tone === 'danger'
  const ui = (
    <Modal
      open={Boolean(state)}
      onClose={() => close(false)}
      title={state?.title}
      size="sm"
      footer={
        <>
          <button onClick={() => close(false)} className="rdg-btn-ghost px-4 py-2">Cancel</button>
          <button
            data-autofocus
            onClick={() => close(state?.input ? { value } : true)}
            className={danger ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700' : 'rdg-btn px-4 py-2'}
          >
            {state?.confirmLabel ?? 'Confirm'}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertTriangle size={19} /></span>}
        <div className="min-w-0 flex-1 text-sm text-slate-600">
          {state?.message}
          {state?.input && (
            <textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={state.input} rows={3} maxLength={300} className="mt-3 w-full text-sm" />
          )}
        </div>
      </div>
    </Modal>
  )

  return [confirm, ui]
}
