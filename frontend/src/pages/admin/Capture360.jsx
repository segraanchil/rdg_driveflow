import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  X, Camera, Rotate3d, Armchair, Check, RotateCcw, Upload, Smartphone, Sun, Footprints, Ruler, Zap, ZapOff, Layers, ArrowLeft, CircleAlert, Hand,
} from 'lucide-react'
import apiClient from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { toast } from '../../lib/toast'

/*
 * Guided 360° capture (Story 05), for a phone in the staff's hand. No extra app needed:
 *  - Live camera preview in the browser (getUserMedia).
 *  - The phone's motion sensor (DeviceOrientation) tracks how far the staff member has turned:
 *    walking around the car (exterior) or turning on the spot inside the cabin (interior).
 *  - A shot is taken automatically at each equal step (e.g. every 15° for 24 frames) once the
 *    phone is steady; the shutter button works too.
 *  - Frames are resized on the phone, reviewed, then uploaded in small batches. Nothing is stitched:
 *    the showroom viewer turns through the frames when the buyer drags.
 */

const MODES = {
  exterior: {
    title: 'Exterior walk-around', icon: Rotate3d, counts: [24, 36], kind: 'exterior',
    steps: [
      [Sun, 'Open, even light', 'Shade or an overcast sky. Avoid harsh sun and reflections.'],
      [Ruler, 'Same distance all the way', 'About 3 big steps from the car. Mark a circle with chalk or cones if you can.'],
      [Smartphone, 'Phone sideways, chest height', 'Keep the whole car inside the dashed box in every shot.'],
      [Footprints, 'Walk one full circle', 'Start at the front-left corner and walk slowly. The phone takes a shot at each step.'],
    ],
  },
  interior: {
    title: 'Interior look-around', icon: Armchair, counts: [24], kind: 'interior',
    steps: [
      [Armchair, 'Sit in the middle', 'Rear middle seat facing forward, or between the front seats.'],
      [Smartphone, 'Phone sideways, eye level', 'Hold it close to your chest so it turns around its own spot.'],
      [RotateCcw, 'Turn slowly on the spot', 'Turn all the way around. A shot is taken every 15°.'],
      [Sun, 'Doors closed, lights on', 'Daylight through the windows is best.'],
    ],
  },
}
const MAX_SIDE = 1600 // px, same as the server's photo limit
const BATCH = 6

const RAD = Math.PI / 180
const norm180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180

/** Camera heading + horizon roll from a deviceorientation event, valid in any phone orientation. */
function readPose(e) {
  if (e.alpha == null || e.beta == null || e.gamma == null) return null
  const x = e.beta * RAD, y = e.gamma * RAD, z = e.alpha * RAD
  const cX = Math.cos(x), cY = Math.cos(y), cZ = Math.cos(z), sX = Math.sin(x), sY = Math.sin(y), sZ = Math.sin(z)
  // Rotation matrix (W3C Device Orientation, Z-X'-Y'').
  const m13 = cY * sZ * sX + cZ * sY
  const m23 = sZ * sY - cZ * cY * sX
  const m33 = cX * cY
  const m31 = -cX * sY
  const m32 = sX
  // The back camera looks along the device's −z axis.
  const heading = Math.atan2(-m13, -m23) / RAD
  const pitch = Math.asin(Math.max(-1, Math.min(1, -m33))) / RAD
  const screenAngle = (window.screen?.orientation?.angle ?? window.orientation ?? 0) || 0
  const roll = norm180(Math.atan2(m31, m32) / RAD - screenAngle)
  return { heading, pitch, roll }
}

async function downscale(source, w, h) {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
}

export default function Capture360() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState(null)
  const [mode, setMode] = useState(null) // exterior | interior
  const [count, setCount] = useState(24)
  const [phase, setPhase] = useState('setup') // setup | shoot | review | upload | done
  const [shots, setShots] = useState([]) // [{ blob, url }]
  const [retake, setRetake] = useState(null) // index being re-shot
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    apiClient.get(`/admin/inventory/${id}`).then(({ data }) => setVehicle(data)).catch(() => setVehicle(false))
  }, [id])
  useEffect(() => () => shots.forEach((s) => URL.revokeObjectURL(s.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const name = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''
  const existing = useMemo(() => ({
    exterior: (vehicle?.media ?? []).filter((m) => m.type === '360_frame' && !m.is_sample).length,
    interior: (vehicle?.media ?? []).filter((m) => m.type === 'interior_frame').length,
  }), [vehicle])

  async function upload() {
    setPhase('upload')
    setProgress(0)
    try {
      for (let i = 0; i < shots.length; i += BATCH) {
        const body = new FormData()
        body.append('kind', MODES[mode].kind)
        if (i === 0) body.append('replace', '1')
        shots.slice(i, i + BATCH).forEach((s, k) => body.append('frames[]', s.blob, `${mode}-${String(i + k + 1).padStart(2, '0')}.jpg`))
        await apiClient.post(`/admin/inventory/${id}/capture`, body, { headers: { 'Content-Type': 'multipart/form-data' }, silent: true, quietErrors: true })
        setProgress(Math.min(shots.length, i + BATCH))
      }
      setPhase('done')
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Upload stopped. Check the connection and try again; nothing is lost on this phone.')
      setPhase('review')
    }
  }

  if (vehicle === null) return <PageLoader />
  if (vehicle === false) return <p className="rdg-card p-6 text-sm">Car not found. <Link to="/admin/inventory" className="font-semibold underline">Back to Inventory</Link></p>

  if (phase === 'shoot') {
    return (
      <Shooter
        mode={mode}
        total={count}
        shots={shots}
        retake={retake}
        onShot={(shot) => {
          setShots((list) => {
            if (retake !== null) { URL.revokeObjectURL(list[retake].url); const next = [...list]; next[retake] = shot; return next }
            return [...list, shot]
          })
          if (retake !== null) { setRetake(null); setPhase('review') }
        }}
        onDone={() => setPhase('review')}
        onExit={() => { setRetake(null); setPhase(shots.length ? 'review' : 'setup') }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/admin/inventory?edit=${id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:underline"><ArrowLeft size={15} /> Back to the car</Link>
      <h1 className="mb-1">Capture 360°</h1>
      <p className="mb-6 text-sm text-slate-500">{name} · Use a phone. The camera opens here; no other app needed.</p>

      {phase === 'setup' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(MODES).map(([key, m]) => (
              <button key={key} type="button" onClick={() => { setMode(key); setCount(m.counts[0]) }}
                className={`rdg-card flex items-start gap-3 p-4 text-left transition ${mode === key ? 'border-slate-900 ring-2 ring-slate-900/15' : 'hover:-translate-y-0.5 hover:shadow-lift'}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${mode === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}><m.icon size={21} /></span>
                <span className="min-w-0">
                  <span className="block font-bold text-slate-900">{m.title}</span>
                  <span className="block text-xs text-slate-500">{key === 'exterior' ? 'Walk around the car once.' : 'Sit inside and turn on the spot.'}</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-600">{existing[key] ? `Current set: ${existing[key]} frames (will be replaced)` : 'No set yet'}</span>
                </span>
              </button>
            ))}
          </div>

          {mode && (
            <div className="rdg-card animate-rdg-fade-up p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Before you start</p>
              <ol className="grid gap-3 sm:grid-cols-2">
                {MODES[mode].steps.map(([Icon, title, text], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Icon size={16} /></span>
                    <span className="text-sm"><strong className="block text-slate-900">{i + 1}. {title}</strong><span className="text-slate-500">{text}</span></span>
                  </li>
                ))}
              </ol>
              {MODES[mode].counts.length > 1 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-700">Frames:</span>
                  {MODES[mode].counts.map((n) => (
                    <button key={n} type="button" onClick={() => setCount(n)} className={`rounded-full px-3 py-1 font-semibold ${count === n ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {n} {n === 24 ? '(every 15°, quicker)' : '(every 10°, smoother)'}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => { shots.forEach((s) => URL.revokeObjectURL(s.url)); setShots([]); setPhase('shoot') }} className="rdg-btn mt-5 w-full py-3">
                <Camera size={18} /> Open camera
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">The phone may ask for camera and motion access. Tap Allow.</p>
            </div>
          )}
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-4">
          <div className="rdg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-slate-900">{shots.length} frames · {MODES[mode].title}</p>
              <p className="text-xs text-slate-500">Drag the preview to check the turn. Tap a frame to re-take it.</p>
            </div>
            <PreviewSpin shots={shots} />
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {shots.map((s, i) => (
              <button key={s.url} type="button" onClick={() => { setRetake(i); setPhase('shoot') }} className="group relative overflow-hidden rounded-lg ring-1 ring-slate-200">
                <img src={s.url} alt={`Frame ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">{i + 1}</span>
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"><RotateCcw size={14} className="mr-1" /> Re-take</span>
              </button>
            ))}
          </div>
          {shots.length < 8 && <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><CircleAlert size={16} className="mt-0.5 shrink-0" /> Take at least 8 frames for a usable spin.</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setPhase('shoot')} disabled={shots.length >= count} className="rdg-btn-ghost flex-1"><Camera size={16} /> Continue shooting</button>
            <button type="button" onClick={() => { shots.forEach((s) => URL.revokeObjectURL(s.url)); setShots([]); setPhase('setup') }} className="rdg-btn-ghost flex-1"><RotateCcw size={16} /> Start over</button>
            <button type="button" onClick={upload} disabled={shots.length < 8} className="rdg-btn flex-1"><Upload size={16} /> Upload {shots.length} frames</button>
          </div>
          <p className="text-center text-xs text-slate-500">Uploading replaces the car’s current {mode === 'exterior' ? 'exterior' : 'interior'} 360° set.</p>
        </div>
      )}

      {phase === 'upload' && (
        <div className="rdg-card p-8 text-center">
          <Upload size={32} className="mx-auto animate-pulse text-slate-900" />
          <p className="mt-3 font-bold text-slate-900">Uploading {progress} of {shots.length}…</p>
          <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900 transition-all duration-500" style={{ width: `${(progress / shots.length) * 100}%` }} /></div>
          <p className="mt-2 text-xs text-slate-500">Keep this page open.</p>
        </div>
      )}

      {phase === 'done' && (
        <div className="rdg-card animate-rdg-fade-up p-8 text-center">
          <span className="mx-auto flex h-14 w-14 animate-rdg-pop items-center justify-center rounded-full bg-green-500 text-white"><Check size={28} strokeWidth={3} /></span>
          <p className="mt-3 text-lg font-bold text-slate-900">360° {mode === 'exterior' ? 'exterior' : 'interior'} uploaded</p>
          <p className="text-sm text-slate-500">{shots.length} frames are now on the car{vehicle.status === 'for_inspection' ? '. Finish the checklist in Inventory to publish it.' : ' page.'}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => { shots.forEach((s) => URL.revokeObjectURL(s.url)); setShots([]); setMode(mode === 'exterior' ? 'interior' : 'exterior'); setPhase('setup'); apiClient.get(`/admin/inventory/${id}`, { silent: true }).then(({ data }) => setVehicle(data)) }} className="rdg-btn-ghost">
              Capture the {mode === 'exterior' ? 'interior' : 'exterior'} next
            </button>
            <button type="button" onClick={() => navigate(`/admin/inventory?edit=${id}`)} className="rdg-btn">Back to the car</button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Full-screen camera with motion guidance. */
function Shooter({ mode, total, shots, retake, onShot, onDone, onExit }) {
  const video = useRef(null)
  const [camera, setCamera] = useState('starting') // starting | live | fallback
  const [pose, setPose] = useState(null)
  const [auto, setAuto] = useState(true)
  const [ghost, setGhost] = useState(mode === 'exterior')
  const [flash, setFlash] = useState(false)
  const [busy, setBusy] = useState(false)
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth)
  const turn = useRef({ last: null, total: 0, dir: 0, startAt: null, history: [] })
  const taken = retake ?? shots.length
  const step = 360 / total
  // "Continue shooting": the person lines up with the last frame (overlay) and carries on from its angle.
  const resumeBase = useRef(retake === null && shots.length > 0 ? (shots.length - 1) * step : 0)
  const done = retake === null && shots.length >= total

  // Camera
  useEffect(() => {
    let stream
    if (!navigator.mediaDevices?.getUserMedia) { setCamera('fallback'); return }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => { stream = s; if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}) } setCamera('live') })
      .catch(() => setCamera('fallback'))
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  // Keep the screen awake while shooting.
  useEffect(() => {
    let lock
    navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release?.().catch(() => {}) }
  }, [])

  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Motion sensor: accumulate how far the camera has turned since the first shot.
  useEffect(() => {
    const onOrient = (e) => {
      const p = readPose(e)
      if (!p) return
      const t = turn.current
      if (t.last !== null && Math.abs(p.pitch) < 60) t.total += norm180(p.heading - t.last)
      t.last = p.heading
      const now = performance.now()
      t.history = [...t.history.filter((h) => now - h.at < 350), { at: now, total: t.total }]
      setPose(p)
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [])

  const capture = useCallback(async () => {
    if (busy || done) return
    setBusy(true)
    try {
      let blob
      if (camera === 'live' && video.current?.videoWidth) {
        blob = await downscale(video.current, video.current.videoWidth, video.current.videoHeight)
      }
      if (!blob) return
      if (shots.length === 0 && retake === null) { turn.current.total = 0; turn.current.dir = 0; resumeBase.current = 0 }
      navigator.vibrate?.(25)
      setFlash(true)
      setTimeout(() => setFlash(false), 140)
      onShot({ blob, url: URL.createObjectURL(blob) })
    } finally {
      setBusy(false)
    }
  }, [busy, done, camera, shots.length, retake, onShot])

  async function fromFile(file) {
    if (!file) return
    const bmp = await createImageBitmap(file)
    const blob = await downscale(bmp, bmp.width, bmp.height)
    onShot({ blob, url: URL.createObjectURL(blob) })
  }

  // Progress around the circle (degrees, always counting up in the direction the person moves).
  const t = turn.current
  if (!t.dir && Math.abs(t.total) > 8) t.dir = Math.sign(t.total)
  const turned = shots.length ? resumeBase.current + Math.max(0, t.dir ? t.total * t.dir : Math.abs(t.total)) : 0
  const target = taken * step
  const toGo = Math.max(0, target - turned)
  const steady = t.history.length > 2 && Math.max(...t.history.map((h) => h.total)) - Math.min(...t.history.map((h) => h.total)) < 1.5
  const level = pose ? Math.abs(pose.roll) < 4 : true
  const sensor = pose !== null

  // Auto shutter: at each step, once the phone is steady and level.
  useEffect(() => {
    if (!auto || !sensor || retake !== null || done || busy || camera !== 'live' || shots.length === 0) return
    if (turned >= target - 1.5 && steady && level) capture()
  }, [auto, sensor, retake, done, busy, camera, shots.length, turned, target, steady, level, capture])

  useEffect(() => { if (done) onDone() }, [done, onDone])

  // iOS asks for motion permission from a tap.
  async function askMotion() {
    try { await window.DeviceOrientationEvent?.requestPermission?.() } catch { /* denied: manual mode */ }
  }
  const needsMotionTap = !sensor && typeof window.DeviceOrientationEvent?.requestPermission === 'function'

  const last = shots[shots.length - 1]

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col bg-black text-white">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Always mounted so the stream can attach before the preview shows. */}
        <video ref={video} playsInline muted autoPlay className={`absolute inset-0 h-full w-full object-cover ${camera === 'live' ? '' : 'invisible'}`} />
        {camera !== 'live' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center text-sm text-white/80">
            {camera === 'starting' ? <p>Starting the camera…</p> : (
              <>
                <Camera size={36} />
                <p className="max-w-xs">The live camera needs a secure (https) link or permission. Tap the shutter to open the phone’s camera for each shot instead.</p>
              </>
            )}
          </div>
        )}

        {ghost && last && camera === 'live' && retake === null && <img src={last.url} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />}

        {/* Framing guides */}
        {mode === 'exterior' && <div className="pointer-events-none absolute inset-x-[10%] inset-y-[18%] rounded-xl border-2 border-dashed border-white/60" />}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className={`h-0.5 w-40 rounded transition-colors ${level ? 'bg-green-400' : 'bg-amber-400'}`} style={{ transform: `rotate(${-(pose?.roll ?? 0)}deg)` }} />
          <div className="absolute h-3 w-3 rounded-full border-2 border-white/80" />
        </div>
        {flash && <div className="absolute inset-0 animate-rdg-fade-in bg-white/70" />}

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button onClick={onExit} aria-label="Stop" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50"><X size={20} /></button>
          <p className="min-w-0 flex-1 truncate text-sm font-bold">
            {retake !== null ? `Re-take frame ${retake + 1}` : `${shots.length} / ${total}`} <span className="font-normal text-white/70">· {mode === 'exterior' ? 'walk around the car' : 'turn on the spot'}</span>
          </p>
          {mode === 'exterior' && <button onClick={() => setGhost((g) => !g)} aria-label="Overlay last frame" aria-pressed={ghost} className={`flex h-10 w-10 items-center justify-center rounded-full ${ghost ? 'bg-white text-black' : 'bg-black/50'}`}><Layers size={18} /></button>}
          {sensor && <button onClick={() => setAuto((a) => !a)} aria-label="Auto shutter" aria-pressed={auto} className={`flex h-10 items-center gap-1 rounded-full px-3 text-xs font-bold ${auto ? 'bg-white text-black' : 'bg-black/50'}`}>{auto ? <Zap size={15} /> : <ZapOff size={15} />} Auto</button>}
        </div>

        {/* Guidance */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-2 px-4 text-center">
          {portrait && <p className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black">Turn the phone sideways for a wider shot</p>}
          {!level && <p className="rounded-full bg-amber-500/90 px-3 py-1 text-xs font-bold text-black">Hold the phone level</p>}
          <p className="rounded-full bg-black/60 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            {retake !== null ? 'Line up the same angle, then tap the shutter.'
              : shots.length === 0 ? (mode === 'exterior' ? 'Stand at the front-left corner, frame the car, take the first shot.' : 'Face the windshield and take the first shot.')
                : !sensor ? 'Move one step, then tap the shutter.'
                  : toGo > 1.5 ? `${mode === 'exterior' ? 'Keep walking' : 'Keep turning'} · ${Math.ceil(toGo)}° to the next shot`
                    : auto ? 'Hold still…' : 'Tap the shutter'}
          </p>
          {sensor && shots.length > 0 && retake === null && <Ring total={total} taken={shots.length} turned={turned} />}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between gap-4 bg-black px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="h-12 w-12 overflow-hidden rounded-lg bg-white/10">{last && <img src={last.url} alt="Last frame" className="h-full w-full object-cover" />}</div>
        {camera === 'fallback' ? (
          <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-white/20 active:scale-95">
            <Camera size={24} />
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { fromFile(e.target.files[0]); e.target.value = '' }} />
          </label>
        ) : (
          <button onClick={capture} disabled={busy || camera !== 'live'} aria-label="Take photo" className="h-16 w-16 rounded-full border-4 border-white bg-white/90 transition active:scale-90" />
        )}
        <div className="flex w-12 justify-end">
          {needsMotionTap ? (
            <button onClick={askMotion} className="rounded-lg bg-white/15 px-2 py-1 text-[10px] font-bold leading-tight">Enable<br />motion</button>
          ) : shots.length >= 8 && retake === null ? (
            <button onClick={onDone} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black">Done</button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Dots around a circle: which steps are done, and the current turn. */
function Ring({ total, taken, turned }) {
  const r = 26
  return (
    <svg viewBox="-34 -34 68 68" className="h-16 w-16 drop-shadow" aria-hidden>
      <circle r={r} fill="rgba(0,0,0,.45)" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
      {Array.from({ length: total }, (_, i) => {
        const a = (i / total) * 2 * Math.PI - Math.PI / 2
        return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={i < taken ? 2.4 : 1.6} fill={i < taken ? '#4ade80' : i === taken ? '#fff' : 'rgba(255,255,255,.35)'} />
      })}
      <line x1="0" y1="0" x2={Math.cos((turned * Math.PI) / 180 - Math.PI / 2) * (r - 6)} y2={Math.sin((turned * Math.PI) / 180 - Math.PI / 2) * (r - 6)} stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <text y="4" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{taken}</text>
    </svg>
  )
}

/** Drag-to-turn preview of the frames before uploading. */
function PreviewSpin({ shots }) {
  const [i, setI] = useState(0)
  const drag = useRef(null)
  const n = shots.length
  if (!n) return null
  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-900">
      <img
        src={shots[Math.min(i, n - 1)].url}
        alt={`Frame ${i + 1} of ${n}`}
        draggable={false}
        onPointerDown={(e) => { drag.current = { x: e.clientX, i }; e.currentTarget.setPointerCapture(e.pointerId) }}
        onPointerMove={(e) => { if (drag.current) setI((drag.current.i - Math.trunc((e.clientX - drag.current.x) / 12) + n * 100) % n) }}
        onPointerUp={() => { drag.current = null }}
        className="aspect-[16/10] w-full cursor-grab touch-pan-y select-none object-cover active:cursor-grabbing"
      />
      <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white"><Hand size={12} /> Drag · {i + 1}/{n}</span>
    </div>
  )
}
