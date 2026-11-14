import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, Minimize, Pause, Play, Rotate3d, Hand, CarFront } from 'lucide-react'
import { backendUrl } from '../../api/client'
import { formatDateTime, timeAgo } from '../../lib/format'

const PX_PER_FRAME = 10 // drag distance (px) before the frame advances one step

/**
 * 360° virtual showroom (Story 05): drag/swipe or use the arrow keys to rotate through the
 * frame set, with auto-spin, fullscreen, and the "Last updated" timestamp. Photos get a
 * gallery tab with thumbnails.
 */
export default function Viewer360({ vehicle }) {
  const media = vehicle?.media ?? []
  const frames = media.filter((m) => m.type === '360_frame')
  const photos = media.filter((m) => m.type === 'photo')
  const [mode, setMode] = useState(frames.length > 1 ? '360' : 'photos')
  const [index, setIndex] = useState(0)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [touched, setTouched] = useState(false)
  const [full, setFull] = useState(false)
  const box = useRef(null)
  const drag = useRef(null)

  const list = mode === '360' ? frames : photos.length ? photos : frames
  const current = mode === '360' ? frames[index] : list[photoIndex]

  const step = useCallback((delta) => {
    if (mode === '360') setIndex((i) => (i + delta + frames.length) % frames.length)
    else setPhotoIndex((i) => (i + delta + list.length) % list.length)
  }, [mode, frames.length, list.length])

  // Preload every 360 frame so rotation never flickers.
  useEffect(() => {
    frames.forEach((f) => { const img = new Image(); img.src = backendUrl(`/storage/${f.file_path}`) })
  }, [frames.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!spinning || mode !== '360') return
    const id = setInterval(() => setIndex((i) => (i + 1) % frames.length), 110)
    return () => clearInterval(id)
  }, [spinning, mode, frames.length])

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === box.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen()
    else box.current?.requestFullscreen?.()
  }

  function onPointerDown(e) {
    if (mode !== '360' || frames.length < 2) return
    setSpinning(false)
    setTouched(true)
    drag.current = { startX: e.clientX, startIndex: index }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e) {
    if (!drag.current) return
    const moved = Math.trunc((e.clientX - drag.current.startX) / PX_PER_FRAME)
    setIndex((drag.current.startIndex - moved + frames.length * 1000) % frames.length)
  }
  const onPointerUp = () => { drag.current = null }

  function onKeyDown(e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
  }

  if (media.length === 0) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-400">
        <CarFront size={48} strokeWidth={1.3} />
        <span className="text-sm">Photos of this car are coming soon</span>
      </div>
    )
  }

  return (
    <div>
      <div ref={box} tabIndex={0} onKeyDown={onKeyDown} aria-label={mode === '360' ? '360° view. Drag or use arrow keys to rotate.' : 'Photo gallery'}
        className={`relative overflow-hidden rounded-xl bg-slate-900 outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40 ${full ? 'flex items-center justify-center' : ''}`}>
        <img
          src={backendUrl(`/storage/${current.file_path}`)}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}${mode === '360' ? `, angle ${index + 1} of ${frames.length}` : ''}`}
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`w-full touch-pan-y select-none object-contain ${full ? 'h-full max-h-screen' : 'aspect-[4/3] bg-slate-100 object-cover'}`}
          style={{ cursor: mode === '360' && frames.length > 1 ? (drag.current ? 'grabbing' : 'grab') : 'default' }}
        />

        {mode === '360' && !touched && frames.length > 1 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex animate-pulse items-center gap-2 rounded-full bg-slate-900/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur"><Hand size={16} /> Drag to rotate</span>
          </div>
        )}

        {list.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => step(1)} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"><ChevronRight size={18} /></button>
          </>
        )}

        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            {mode === '360' ? `${index + 1} / ${frames.length}` : `${photoIndex + 1} / ${list.length}`}
          </span>
          <span className="flex gap-1.5">
            {mode === '360' && frames.length > 1 && (
              <button type="button" onClick={() => { setTouched(true); setSpinning((s) => !s) }} aria-label={spinning ? 'Stop spinning' : 'Spin automatically'}
                className="rounded-full bg-black/60 p-2 text-white backdrop-blur hover:bg-black/80">{spinning ? <Pause size={15} /> : <Play size={15} />}</button>
            )}
            <button type="button" onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'} className="rounded-full bg-black/60 p-2 text-white backdrop-blur hover:bg-black/80">
              {full ? <Minimize size={15} /> : <Expand size={15} />}
            </button>
          </span>
        </div>
      </div>

      {mode === '360' && frames.length > 1 && (
        <input type="range" min={0} max={frames.length - 1} value={index} onChange={(e) => { setTouched(true); setSpinning(false); setIndex(Number(e.target.value)) }}
          aria-label="Rotate" className="mt-3 w-full" />
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {frames.length > 1 && photos.length > 0 ? (
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm font-semibold">
            <button type="button" onClick={() => setMode('360')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${mode === '360' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Rotate3d size={15} /> 360° view</button>
            <button type="button" onClick={() => { setSpinning(false); setMode('photos') }} className={`rounded-md px-3 py-1.5 ${mode === 'photos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Photos ({photos.length})</button>
          </div>
        ) : <span />}
        {vehicle?.last_updated && (
          <p className="text-xs text-slate-500" title={formatDateTime(vehicle.last_updated)}>
            Last updated <strong className="text-slate-700">{timeAgo(vehicle.last_updated)}</strong> · {formatDateTime(vehicle.last_updated)}
          </p>
        )}
      </div>

      {mode === 'photos' && list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {list.map((m, i) => (
            <button key={m.id} type="button" onClick={() => setPhotoIndex(i)} aria-label={`Photo ${i + 1}`}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 ${i === photoIndex ? 'ring-emerald-500' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
              <img src={backendUrl(`/storage/${m.file_path}`)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
