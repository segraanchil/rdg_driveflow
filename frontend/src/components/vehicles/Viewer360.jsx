import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, Minimize, Pause, Play, Rotate3d, Hand, CarFront, Armchair, Images, Info, CalendarClock } from 'lucide-react'
import { backendUrl } from '../../api/client'
import { formatDateTime } from '../../lib/format'

const PX_PER_FRAME = 10
const url = (m) => backendUrl(`/storage/${m.file_path}`)

/**
 * 360° virtual showroom (Story 05):
 *  - Exterior: drag/swipe (or arrow keys) through the turntable frames, auto-spin, full screen
 *  - Interior: a wide cabin panorama; drag left/right to look around (wraps all the way round)
 *  - Photos: still gallery with thumbnails
 * Shows when the photos were last updated, and labels generated sample media honestly.
 */
export default function Viewer360({ vehicle, compact = false, autoSpin = false }) {
  const media = vehicle?.media ?? []
  const frames = media.filter((m) => m.type === '360_frame')
  const interior = media.find((m) => m.type === 'interior_360')
  const photos = media.filter((m) => m.type === 'photo')
  const modes = [
    frames.length > 1 && { key: 'exterior', label: 'Exterior 360°', icon: Rotate3d },
    interior && { key: 'interior', label: 'Interior 360°', icon: Armchair },
    photos.length > 0 && { key: 'photos', label: `Photos (${photos.length})`, icon: Images },
  ].filter(Boolean)
  const [mode, setMode] = useState(modes[0]?.key ?? 'photos')
  const [full, setFull] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === box.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  if (media.length === 0) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-400">
        <CarFront size={48} strokeWidth={1.3} />
        <span className="text-sm">Photos of this car are coming soon</span>
      </div>
    )
  }

  const current = mode === 'exterior' ? frames : mode === 'interior' ? [interior] : photos.length ? photos : frames
  const isSample = current.some((m) => m?.is_sample)
  const updatedAt = media.reduce((latest, m) => (!latest || new Date(m.updated_at ?? m.created_at) > new Date(latest) ? m.updated_at ?? m.created_at : latest), null)
  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.())

  return (
    <div>
      {!compact && modes.length > 1 && (
        <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" role="tablist">
          {modes.map(({ key, label, icon: Icon }) => (
            <button key={key} role="tab" aria-selected={mode === key} onClick={() => setMode(key)}
              className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${mode === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      )}

      <div ref={box} className={`relative overflow-hidden rounded-xl bg-slate-200 ${full ? 'flex items-center bg-black' : ''}`}>
        {mode === 'exterior' && <Spin frames={frames} vehicle={vehicle} full={full} autoSpin={autoSpin} />}
        {mode === 'interior' && <Pano image={interior} full={full} />}
        {mode === 'photos' && <Gallery photos={current} vehicle={vehicle} full={full} />}

        {isSample && (
          <span className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur">
            <Info size={12} /> Sample preview
          </span>
        )}
        {!compact && (
          <button type="button" onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'} className="absolute right-2 top-2 rounded-full bg-black/55 p-2 text-white backdrop-blur hover:bg-black/75">
            {full ? <Minimize size={15} /> : <Expand size={15} />}
          </button>
        )}
      </div>

      {!compact && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          {updatedAt && (
            <p className="flex items-center gap-1.5"><CalendarClock size={14} /> Photos last updated <strong className="text-slate-800">{formatDateTime(updatedAt)}</strong></p>
          )}
          {isSample && <p>Sample images for preview. Actual photos of this unit are coming soon. Ask us for a viewing anytime.</p>}
        </div>
      )}
    </div>
  )
}

function Spin({ frames, vehicle, full, autoSpin }) {
  const [index, setIndex] = useState(0)
  const [spinning, setSpinning] = useState(autoSpin)
  const [touched, setTouched] = useState(false)
  const drag = useRef(null)
  const n = frames.length

  useEffect(() => { frames.forEach((f) => { const img = new Image(); img.src = url(f) }) }, [frames])
  useEffect(() => {
    if (!spinning) return
    const id = setInterval(() => setIndex((i) => (i + 1) % n), 120)
    return () => clearInterval(id)
  }, [spinning, n])

  const step = useCallback((d) => setIndex((i) => (i + d + n) % n), [n])
  const stop = () => { setSpinning(false); setTouched(true) }

  return (
    <div className="w-full" tabIndex={0} aria-label="Exterior 360° view. Drag or use the arrow keys to rotate."
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') { stop(); step(-1) } if (e.key === 'ArrowRight') { stop(); step(1) } }}>
      <img
        src={url(frames[index])}
        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}, angle ${index + 1} of ${n}`}
        draggable={false}
        onPointerDown={(e) => { stop(); drag.current = { x: e.clientX, i: index }; e.currentTarget.setPointerCapture(e.pointerId) }}
        onPointerMove={(e) => { if (drag.current) setIndex((drag.current.i - Math.trunc((e.clientX - drag.current.x) / PX_PER_FRAME) + n * 1000) % n) }}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
        className={`w-full cursor-grab touch-pan-y select-none object-cover active:cursor-grabbing ${full ? 'max-h-screen object-contain' : 'aspect-[16/10]'}`}
      />
      {!touched && (
        <span className="pointer-events-none absolute inset-x-0 bottom-14 mx-auto flex w-max animate-pulse items-center gap-2 rounded-full bg-slate-900/75 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
          <Hand size={16} /> Drag to rotate
        </span>
      )}
      <button type="button" onClick={() => { stop(); step(-1) }} aria-label="Rotate left" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"><ChevronLeft size={18} /></button>
      <button type="button" onClick={() => { stop(); step(1) }} aria-label="Rotate right" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"><ChevronRight size={18} /></button>
      <div className="absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-full bg-black/55 px-2 py-1.5 backdrop-blur">
        <button type="button" onClick={() => { setTouched(true); setSpinning((s) => !s) }} aria-label={spinning ? 'Stop spinning' : 'Spin automatically'} className="rounded-full p-1 text-white hover:bg-white/20">
          {spinning ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <input type="range" min={0} max={n - 1} value={index} aria-label="Rotate" onChange={(e) => { stop(); setIndex(Number(e.target.value)) }} className="flex-1 [accent-color:#fff]" />
        <span className="w-12 text-right text-[11px] font-semibold tabular-nums text-white">{Math.round((index / n) * 360)}°</span>
      </div>
    </div>
  )
}

function Pano({ image, full }) {
  const wrap = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [offset, setOffset] = useState(null)
  const [ratio, setRatio] = useState(3.6)
  const [touched, setTouched] = useState(false)
  const drag = useRef(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setRatio(img.naturalWidth / img.naturalHeight)
    img.src = url(image)
  }, [image])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const imgW = size.h * ratio
  // Start looking straight ahead (the windshield is in the middle of the panorama).
  useEffect(() => { if (imgW && offset === null) setOffset(size.w / 2 - imgW / 2) }, [imgW, size.w, offset])

  // Slow look-around until the visitor takes over.
  useEffect(() => {
    if (touched || !imgW) return
    const id = setInterval(() => setOffset((o) => (o ?? 0) - 0.6), 30)
    return () => clearInterval(id)
  }, [touched, imgW])

  const nudge = (dx) => { setTouched(true); setOffset((o) => (o ?? 0) + dx) }

  return (
    <div
      ref={wrap}
      role="img"
      aria-label="Interior 360° view. Drag left or right to look around the cabin."
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') nudge(60); if (e.key === 'ArrowRight') nudge(-60) }}
      onPointerDown={(e) => { setTouched(true); drag.current = { x: e.clientX, o: offset ?? 0 }; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={(e) => { if (drag.current) setOffset(drag.current.o + (e.clientX - drag.current.x)) }}
      onPointerUp={() => { drag.current = null }}
      onPointerCancel={() => { drag.current = null }}
      className={`w-full cursor-grab touch-pan-y select-none active:cursor-grabbing ${full ? 'h-screen' : 'aspect-[16/10]'}`}
      style={{
        backgroundImage: `url(${url(image)})`,
        backgroundSize: 'auto 100%',
        backgroundRepeat: 'repeat-x',
        backgroundPosition: `${imgW ? (((offset ?? 0) % imgW) + imgW) % imgW - imgW : 0}px center`,
      }}
    >
      {!touched && (
        <span className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto flex w-max animate-pulse items-center gap-2 rounded-full bg-slate-900/75 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
          <Hand size={16} /> Drag to look around
        </span>
      )}
      <button type="button" onClick={() => nudge(160)} aria-label="Look left" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"><ChevronLeft size={18} /></button>
      <button type="button" onClick={() => nudge(-160)} aria-label="Look right" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"><ChevronRight size={18} /></button>
    </div>
  )
}

function Gallery({ photos, vehicle, full }) {
  const [i, setI] = useState(0)
  const n = photos.length
  return (
    <div className="w-full">
      <img src={url(photos[i])} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}, photo ${i + 1}`} className={`w-full object-cover ${full ? 'max-h-screen object-contain' : 'aspect-[16/10]'}`} />
      {n > 1 && (
        <>
          <button type="button" onClick={() => setI((i - 1 + n) % n)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => setI((i + 1) % n)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow"><ChevronRight size={18} /></button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5 overflow-x-auto px-2">
            {photos.map((p, k) => (
              <button key={p.id} type="button" onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} className={`h-10 w-14 shrink-0 overflow-hidden rounded-md ring-2 ${k === i ? 'ring-white' : 'ring-transparent opacity-70'}`}>
                <img src={url(p)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
