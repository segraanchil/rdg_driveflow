import { useRef, useState } from 'react'
import { backendUrl } from '../../api/client'

const PX_PER_FRAME = 12 // drag distance (px) before the frame advances one step

/** Drag (or use the arrows) to rotate through the vehicle's uploaded 360 frame sequence. */
export default function Viewer360({ vehicle }) {
  const frames = (vehicle?.media ?? []).filter((m) => m.type === '360_frame')
  const [index, setIndex] = useState(0)
  const dragState = useRef(null)

  function step(delta) {
    if (frames.length === 0) return
    setIndex((i) => (i + delta + frames.length) % frames.length)
  }

  function onPointerDown(e) {
    if (frames.length < 2) return
    dragState.current = { startX: e.clientX, startIndex: index }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!dragState.current) return
    const deltaX = e.clientX - dragState.current.startX
    const framesMoved = Math.trunc(deltaX / PX_PER_FRAME)
    setIndex((dragState.current.startIndex - framesMoved + frames.length * 100) % frames.length)
  }

  function onPointerUp() {
    dragState.current = null
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {frames.length > 0 ? (
        <div className="relative">
          <img
            src={backendUrl(`/storage/${frames[index].file_path}`)}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} — frame ${index + 1} of ${frames.length}`}
            draggable={false}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="aspect-video w-full touch-none select-none rounded bg-slate-100 object-cover"
            style={{ cursor: frames.length > 1 ? 'grab' : 'default' }}
          />
          {frames.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Rotate left"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-sm shadow"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Rotate right"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-sm shadow"
              >
                ›
              </button>
              <span className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
                {index + 1} / {frames.length} — drag to rotate
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded bg-slate-100 text-slate-400">
          No 360° photos uploaded yet
        </div>
      )}
      {vehicle?.last_updated && (
        <p className="mt-2 text-right text-xs text-slate-400">
          Last updated: {new Date(vehicle.last_updated).toLocaleString()}
        </p>
      )}
    </div>
  )
}
