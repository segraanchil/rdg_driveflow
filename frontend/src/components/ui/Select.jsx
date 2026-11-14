import { Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'

/** Flattens <option> children (including arrays from .map) into { value, label, disabled }. */
function readOptions(children) {
  const out = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === 'option') {
      const label = Children.toArray(child.props.children).join('')
      out.push({ value: String(child.props.value ?? label), label, disabled: Boolean(child.props.disabled) })
    } else if (child.props?.children) {
      out.push(...readOptions(child.props.children))
    }
  })
  return out
}

/**
 * Drop-in replacement for <select>: same props (value, onChange(e), required, disabled, name)
 * and the same <option> children, but with a styled list instead of the browser's default one.
 * - The empty-value option ("Select", "—") becomes the placeholder.
 * - Long lists (9+ options) get a search box.
 * - Keyboard: arrows, Home/End, Enter/Space, Escape, and type a letter to jump.
 * - A hidden native <select> keeps the browser's "please fill in this field" check for required fields.
 * - The list is portalled to <body> so it is never cut off by cards, tables or dialogs.
 */
export default function Select({ value, onChange, children, className = '', required, disabled, name, id, placeholder, 'aria-label': ariaLabel, searchable }) {
  const options = useMemo(() => readOptions(children), [children])
  const empty = options.find((o) => o.value === '')
  const choices = options.filter((o) => o.value !== '' || (!o.disabled && !required))
  const current = options.find((o) => o.value === String(value ?? ''))
  const shownLabel = current && current.value !== '' ? current.label : placeholder ?? empty?.label ?? 'Select'
  // "Select…"/"—" read as a grey placeholder; a real choice such as "All brands" stays normal text.
  const emptyIsHint = !empty || empty.disabled || required || /^(—|-|select|choose)/i.test(empty.label.trim())
  const isPlaceholder = (!current || current.value === '') && emptyIsHint

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [query, setQuery] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [pos, setPos] = useState(null)
  const button = useRef(null)
  const list = useRef(null)
  const typed = useRef({ text: '', at: 0 })
  const listId = useId()
  const withSearch = searchable ?? choices.length > 8

  const filtered = query ? choices.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : choices

  function emit(next) {
    setInvalid(false)
    onChange?.({ target: { value: next, name }, currentTarget: { value: next, name } })
  }

  function choose(o) {
    if (o.disabled) return
    emit(o.value)
    setOpen(false)
    button.current?.focus()
  }

  function openList() {
    if (disabled) return
    setQuery('')
    setActive(Math.max(0, choices.findIndex((o) => o.value === String(value ?? ''))))
    setOpen(true)
  }

  // Position the list under (or above) the button, matching its width.
  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const r = button.current?.getBoundingClientRect()
      if (!r) return
      const listHeight = Math.min(320, (withSearch ? 52 : 0) + choices.length * 40 + 12)
      const below = window.innerHeight - r.bottom
      const up = below < listHeight + 12 && r.top > below
      const width = Math.max(r.width, 200)
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8)
      setPos({ left, width, top: up ? undefined : r.bottom + 6, bottom: up ? window.innerHeight - r.top + 6 : undefined, maxHeight: Math.max(160, (up ? r.top : below) - 18) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, choices.length, withSearch])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!button.current?.contains(e.target) && !list.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close) }
  }, [open])

  // Keep the highlighted option in view.
  useEffect(() => {
    if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function onKey(e) {
    if (disabled) return
    const max = filtered.length - 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); button.current?.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(max, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(max) }
    else if (e.key === 'Enter' || (e.key === ' ' && !withSearch)) { e.preventDefault(); if (filtered[active]) choose(filtered[active]) }
    else if (e.key === 'Tab') setOpen(false)
    else if (!withSearch && e.key.length === 1) {
      const now = Date.now()
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase(), at: now }
      const i = filtered.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text))
      if (i >= 0) setActive(i)
    }
  }

  return (
    <span className={`relative inline-block align-middle ${className.includes('w-full') ? 'w-full' : ''}`}>
      <button
        ref={button}
        id={id}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
        className={`flex min-h-[2.6rem] items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left font-medium shadow-sm outline-none transition active:!transform-none disabled:bg-slate-100 disabled:text-slate-400 ${
          open ? 'border-slate-900 ring-4 ring-slate-900/10' : invalid ? 'border-red-400 ring-4 ring-red-500/10' : 'border-slate-300 hover:border-slate-400 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15'
        } ${className}`}
      >
        <span className={`truncate ${isPlaceholder ? 'font-normal text-slate-400' : 'text-slate-800'}`}>{shownLabel}</span>
        <ChevronDown size={17} className={`shrink-0 text-slate-500 transition-transform duration-150 ${open ? 'rotate-180 text-slate-900' : ''}`} />
      </button>

      {/* Native twin for form validation only. */}
      <select
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        required={required}
        disabled={disabled}
        value={String(value ?? '')}
        onChange={() => {}}
        onInvalid={() => { setInvalid(true); button.current?.focus() }}
        className="pointer-events-none absolute bottom-0 left-1/2 opacity-0"
        style={{ minHeight: 0, height: 1, width: 1, padding: 0, border: 0 }}
      >
        <option value="" />
        {options.filter((o) => o.value !== '').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {open && pos && createPortal(
        <div
          ref={list}
          onKeyDown={onKey}
          className="fixed z-[120] flex animate-rdg-fade-up flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-lift"
          style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: Math.min(320, pos.maxHeight) }}
        >
          {withSearch && (
            <div className="border-b border-slate-100 p-2">
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-slate-400"><Search size={15} /></span>
                <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setActive(0) }} placeholder="Type to search…" aria-label="Search options" className="w-full py-1.5 pl-8 text-sm" />
              </span>
            </div>
          )}
          <ul id={listId} role="listbox" className="overflow-y-auto overscroll-contain p-1.5">
            {filtered.length === 0 && <li className="px-3 py-2.5 text-slate-400">No matches</li>}
            {filtered.map((o, i) => {
              const selected = o.value === String(value ?? '')
              return (
                <li
                  key={o.value || '__empty'}
                  data-index={i}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={o.disabled || undefined}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                    o.disabled ? 'cursor-not-allowed text-slate-300' : i === active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                  } ${selected ? 'font-semibold text-slate-900' : ''} ${o.value === '' && emptyIsHint ? 'italic text-slate-400' : ''}`}
                >
                  <span className="min-w-0 break-words">{o.label}</span>
                  {selected && <Check size={16} strokeWidth={2.5} className="shrink-0 text-slate-900" />}
                </li>
              )
            })}
          </ul>
        </div>,
        document.body,
      )}
    </span>
  )
}
