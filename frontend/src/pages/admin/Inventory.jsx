import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, ExternalLink, CarFront, Rotate3d, Image as ImageIcon, Armchair, ChevronLeft, ChevronRight, Upload, Info, X,
} from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import { Modal, useConfirm } from '../../components/ui/Modal'
import { EmptyState, Field, ListSkeleton, PageHeader, SearchInput, StatusBadge, Tabs } from '../../components/ui/kit'
import { apiError, formatDate, km, peso } from '../../lib/format'
import { toast } from '../../lib/toast'
import Select from '../../components/ui/Select'
import PesoInput from '../../components/ui/PesoInput'

const BLANK = {
  make: '', model: '', year: '', mileage: '', transmission: '', fuel_type: '', body_type: '', color: '',
  acquisition_cost: '', repair_fees: '', margin_percent: 12, status: 'available',
  plate_number: '', engine_number: '', chassis_number: '', description: '', engine: '', seats: '', drivetrain: '', features: '',
}
const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT']
const FUELS = ['Gasoline', 'Diesel', 'Hybrid', 'Electric']
const BODIES = ['Sedan', 'Hatchback', 'SUV', 'MPV', 'Pickup', 'Van', 'Crossover', 'Coupe']

/** Inventory management: automated 10–18% margin pricing, specs, LTO details, photos and 360° frames. */
export default function Inventory() {
  const [params, setParams] = useSearchParams()
  const [vehicles, setVehicles] = useState(null)
  const [counts, setCounts] = useState({})
  const [q, setQ] = useState('')
  const status = params.get('status') ?? ''
  const [editing, setEditing] = useState(null) // null | 'new' | vehicle
  const [globalMargin, setGlobalMargin] = useState(12)
  const [confirm, confirmUi] = useConfirm()

  const load = useCallback(() => {
    apiClient.get('/admin/inventory', { params: { q: q || undefined, status: status || undefined }, silent: vehicles !== null }).then(({ data }) => {
      setVehicles(data.data ?? [])
      setCounts(data.status_counts ?? {})
    })
  }, [q, status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setTimeout(load, 250)
    return () => clearTimeout(id)
  }, [load])

  useEffect(() => {
    apiClient.get('/shared/margin-setting', { silent: true }).then(({ data }) => setGlobalMargin(Number(data.margin_percent))).catch(() => {})
  }, [])

  // Deep links from the Overview page: ?new=1 or ?edit=<id>.
  useEffect(() => {
    if (params.get('new')) setEditing('new')
    const editId = params.get('edit')
    if (editId && vehicles) {
      const v = vehicles.find((x) => String(x.id) === editId)
      if (v) setEditing(v)
    }
  }, [params, vehicles])

  function closeForm() {
    setEditing(null)
    const next = new URLSearchParams(params)
    next.delete('new')
    next.delete('edit')
    setParams(next, { replace: true })
  }

  async function remove(v) {
    const ok = await confirm({
      title: 'Delete this vehicle?',
      message: <>The <strong>{v.year} {v.make} {v.model}</strong> and all its photos will be removed from the showroom. This can’t be undone.</>,
      confirmLabel: 'Delete vehicle',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await apiClient.delete(`/admin/inventory/${v.id}`, { quietErrors: true })
      toast.success('Vehicle deleted')
      load()
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + Number(b), 0)
  const tabs = [
    { key: '', label: `All (${total})` },
    { key: 'available', label: 'Available', count: 0, n: counts.available },
    { key: 'reserved', label: 'Reserved', n: counts.reserved },
    { key: 'under_repair', label: 'In repair', n: counts.under_repair },
    { key: 'sold', label: 'Sold', n: counts.sold },
  ].map((t) => (t.key ? { ...t, label: `${t.label} (${t.n ?? 0})` } : t))

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Selling prices are computed from acquisition cost + repairs + margin. Photos and 360° frames appear in the public showroom."
        actions={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Search make, model, plate…" />
            <button onClick={() => setEditing('new')} className="rdg-btn"><Plus size={16} /> Add vehicle</button>
          </>
        }
      />
      <Tabs tabs={tabs} value={status} onChange={(key) => setParams(key ? { status: key } : {}, { replace: true })} />

      {vehicles === null ? (
        <ListSkeleton />
      ) : vehicles.length === 0 ? (
        <EmptyState icon={CarFront} title={q || status ? 'No vehicles match' : 'No vehicles yet'} text={q || status ? 'Try another search or tab.' : 'Add your first car to open the showroom.'}
          action={!q && !status && <button onClick={() => setEditing('new')} className="rdg-btn"><Plus size={16} /> Add vehicle</button>} />
      ) : (
        <table>
          <thead>
            <tr><th>Vehicle</th><th>Status</th><th className="text-right">Price</th><th className="text-right">Profit</th><th>Media</th><th>Updated</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const cost = Number(v.acquisition_cost) + Number(v.repair_fees)
              const cover = v.media?.find((m) => m.type === 'photo') ?? v.media?.[0]
              return (
                <tr key={v.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {cover ? <img src={backendUrl(`/storage/${cover.file_path}`)} alt="" className="h-full w-full object-cover" loading="lazy" />
                          : <div className="flex h-full items-center justify-center text-slate-300"><CarFront size={20} /></div>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{v.year} {v.make} {v.model}</p>
                        <p className="text-xs text-slate-500">{[km(v.mileage), v.transmission, v.plate_number?.toUpperCase()].filter(Boolean).join(' · ')}</p>
                      </div>
                    </div>
                  </td>
                  <td><StatusBadge kind="vehicle" status={v.status} /></td>
                  <td className="text-right font-bold tabular-nums text-slate-900">{peso(v.selling_price)}</td>
                  <td className="text-right tabular-nums">
                    <span className="font-semibold text-emerald-700">{peso(Number(v.selling_price) - cost)}</span>
                    <span className="block text-[11px] text-slate-400">{Number(v.margin_percent)}% margin</span>
                  </td>
                  <td>
                    <span className="flex gap-2 text-xs text-slate-600">
                      <span className={`flex items-center gap-1 ${v.photos_count ? '' : 'text-amber-600'}`} title="Photos"><ImageIcon size={13} /> {v.photos_count}</span>
                      <span className={`flex items-center gap-1 ${v.frames_count > 1 ? '' : 'text-amber-600'}`} title="360° frames"><Rotate3d size={13} /> {v.frames_count}</span>
                    </span>
                  </td>
                  <td className="text-xs text-slate-500">{formatDate(v.last_updated)}</td>
                  <td>
                    <span className="flex justify-end gap-1">
                      <IconBtn label="Edit" onClick={() => setEditing(v)}><Pencil size={15} /></IconBtn>
                      <IconBtn label="View in showroom" as={Link} to={`/inventory/${v.id}`} target="_blank"><ExternalLink size={15} /></IconBtn>
                      <IconBtn label="Delete" danger onClick={() => remove(v)}><Trash2 size={15} /></IconBtn>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {editing && (
        <VehicleForm
          vehicle={editing === 'new' ? null : editing}
          globalMargin={globalMargin}
          onClose={closeForm}
          onSaved={(saved, keepOpen) => {
            load()
            if (keepOpen) setEditing(saved)
            else closeForm()
          }}
        />
      )}
      {confirmUi}
    </div>
  )
}

function IconBtn({ label, danger, as: As = 'button', children, ...rest }) {
  return (
    <As title={label} aria-label={label} className={`rounded-lg p-2 ${danger ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'}`} {...rest}>
      {children}
    </As>
  )
}

function VehicleForm({ vehicle, globalMargin, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    vehicle
      ? { ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, vehicle[k] ?? BLANK[k]])), margin_percent: Number(vehicle.margin_percent) }
      : { ...BLANK, margin_percent: globalMargin },
  )
  const [media, setMedia] = useState(vehicle?.media ?? [])
  const [files, setFiles] = useState([])
  const [mediaType, setMediaType] = useState('photo')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const locked = vehicle && ['reserved', 'sold'].includes(vehicle.status)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const cost = (Number(form.acquisition_cost) || 0) + (Number(form.repair_fees) || 0)
  const price = Math.round(cost * (1 + Number(form.margin_percent) / 100) * 100) / 100
  const previews = useMemo(() => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), [files])
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews])

  async function submit(e) {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    const body = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (locked && k === 'status') return
      body.append(k, v ?? '')
    })
    body.append('media_type', mediaType === 'photo' ? 'photo' : mediaType === 'interior' ? 'interior_360' : '360_frame')
    files.forEach((f) => body.append('photos[]', f))
    if (vehicle) body.append('_method', 'PATCH')
    try {
      const { data } = await apiClient.post(vehicle ? `/admin/inventory/${vehicle.id}` : '/admin/inventory', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        loadingText: files.length ? `Uploading ${files.length} photo${files.length === 1 ? '' : 's'}…` : 'Saving…',
      })
      toast.success(vehicle ? 'Vehicle updated' : 'Vehicle added to the showroom')
      setFiles([])
      onSaved(data, false)
    } catch (err) {
      setErrors(Object.fromEntries(Object.entries(err.response?.data?.errors ?? {}).map(([k, v]) => [k.replace(/\..*/, ''), v[0]])))
      if (err.response?.status === 422) toast.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function saveOrder(next) {
    setMedia(next)
    try {
      const { data } = await apiClient.put(`/admin/inventory/${vehicle.id}/media/order`, { items: next.map((m) => ({ id: m.id, type: m.type })) }, { silent: true })
      setMedia(data.media)
    } catch {
      toast.error('Couldn’t save the photo order.')
    }
  }

  function move(index, delta) {
    const next = [...media]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    saveOrder(next)
  }

  function toggleType(index) {
    const cycle = { photo: '360_frame', '360_frame': 'interior_360', interior_360: 'photo' }
    const next = media.map((m, i) => (i === index ? { ...m, type: cycle[m.type] ?? 'photo' } : m))
    saveOrder(next)
  }

  async function removeMedia(m) {
    const { data } = await apiClient.delete(`/admin/inventory/${vehicle.id}/media/${m.id}`)
    setMedia(data.media)
  }

  const photos = media.filter((m) => m.type === 'photo').length
  const frames = media.length - photos

  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={vehicle ? `Edit ${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Add a vehicle'}
      footer={
        <>
          <button type="button" onClick={onClose} className="rdg-btn-ghost">Cancel</button>
          <button type="submit" form="vehicle-form" disabled={saving} className="rdg-btn">{saving ? 'Saving…' : vehicle ? 'Save changes' : 'Add vehicle'}</button>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Section title="Vehicle">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Make" error={errors.make}><input required value={form.make} onChange={set('make')} placeholder="Toyota" className="w-full" /></Field>
              <Field label="Model" error={errors.model}><input required value={form.model} onChange={set('model')} placeholder="Vios 1.3 E" className="w-full" /></Field>
              <Field label="Year" error={errors.year}><input required type="number" min="1980" max={new Date().getFullYear() + 1} value={form.year} onChange={set('year')} className="w-full" /></Field>
              <Field label="Mileage (km)" error={errors.mileage}><input required type="number" min="0" value={form.mileage} onChange={set('mileage')} className="w-full" /></Field>
              <Field label="Transmission" error={errors.transmission}>
                <Select value={form.transmission ?? ''} onChange={set('transmission')} className="w-full"><option value="">—</option>{TRANSMISSIONS.map((t) => <option key={t}>{t}</option>)}</Select>
              </Field>
              <Field label="Fuel" error={errors.fuel_type}>
                <Select value={form.fuel_type ?? ''} onChange={set('fuel_type')} className="w-full"><option value="">—</option>{FUELS.map((t) => <option key={t}>{t}</option>)}</Select>
              </Field>
              <Field label="Body type" error={errors.body_type}>
                <input list="body-types" value={form.body_type ?? ''} onChange={set('body_type')} className="w-full" placeholder="Sedan" />
                <datalist id="body-types">{BODIES.map((b) => <option key={b} value={b} />)}</datalist>
              </Field>
              <Field label="Color" error={errors.color}><input value={form.color ?? ''} onChange={set('color')} className="w-full" placeholder="Pearl White" /></Field>
              <Field label="Engine" error={errors.engine}><input value={form.engine ?? ''} onChange={set('engine')} className="w-full" placeholder="1.5L / 2.8L Diesel" /></Field>
              <Field label="Seats" error={errors.seats}><input type="number" min="2" max="20" value={form.seats ?? ''} onChange={set('seats')} className="w-full" placeholder="5" /></Field>
              <Field label="Drivetrain" error={errors.drivetrain}>
                <Select value={form.drivetrain ?? ''} onChange={set('drivetrain')} className="w-full"><option value="">—</option>{['FWD', 'RWD', 'AWD', '4x2', '4x4'].map((d) => <option key={d}>{d}</option>)}</Select>
              </Field>
            </div>
            <Field label="Description (shown to buyers)" className="mt-3" error={errors.description}>
              <textarea rows={3} value={form.description ?? ''} onChange={set('description')} className="w-full" placeholder="Casa-maintained, first owner, new tires, complete papers…" />
            </Field>
            <Field label="Features (one per line)" className="mt-3" error={errors.features}>
              <textarea rows={3} value={form.features ?? ''} onChange={set('features')} className="w-full" placeholder={'Touchscreen with Apple CarPlay\nReverse camera\nDual airbags'} />
            </Field>
          </Section>

          <Section title="Registration (for the Deed of Sale — not shown publicly)">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Plate no." error={errors.plate_number}><input value={form.plate_number ?? ''} onChange={set('plate_number')} className="w-full uppercase" /></Field>
              <Field label="Motor / engine no." error={errors.engine_number}><input value={form.engine_number ?? ''} onChange={set('engine_number')} className="w-full uppercase" /></Field>
              <Field label="Serial / chassis no." error={errors.chassis_number}><input value={form.chassis_number ?? ''} onChange={set('chassis_number')} className="w-full uppercase" /></Field>
            </div>
          </Section>

          <Section title={`Photos & 360° frames (${photos} photo${photos === 1 ? '' : 's'}, ${frames} frame${frames === 1 ? '' : 's'})`}>
            {media.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {media.map((m, i) => (
                  <div key={m.id} className="group relative overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                    <img src={backendUrl(`/storage/${m.file_path}`)} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    <button type="button" onClick={() => toggleType(i)} title="Click to change: photo → exterior 360° → interior 360°"
                      className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${m.type === 'photo' ? 'bg-white/90 text-slate-700' : 'bg-slate-900/80 text-white'}`}>
                      {m.type === 'photo' ? 'Photo' : m.type === 'interior_360' ? 'Interior 360°' : `360° #${media.slice(0, i + 1).filter((x) => x.type === '360_frame').length}`}{m.is_sample ? ' · sample' : ''}
                    </button>
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <span className="flex gap-0.5">
                        <MiniBtn label="Move earlier" onClick={() => move(i, -1)}><ChevronLeft size={14} /></MiniBtn>
                        <MiniBtn label="Move later" onClick={() => move(i, 1)}><ChevronRight size={14} /></MiniBtn>
                      </span>
                      <MiniBtn label="Remove" onClick={() => removeMedia(m)}><Trash2 size={13} /></MiniBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl border-2 border-dashed border-slate-200 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">Upload as</span>
                {[['photo', 'Photos', ImageIcon], ['360', 'Exterior 360° frames', Rotate3d], ['interior', 'Interior 360° panorama', Armchair]].map(([key, label, Icon]) => (
                  <button key={key} type="button" onClick={() => setMediaType(key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${mediaType === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg bg-slate-50 py-5 text-center text-sm text-slate-500 hover:bg-emerald-50">
                <Upload size={20} className="text-emerald-600" />
                <span className="font-semibold text-slate-700">Choose images</span>
                <span className="text-xs">JPG/PNG, up to 10 MB each. Large photos are resized automatically.</span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files)])} />
              </label>
              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {previews.map((p, i) => (
                    <div key={p.url} className="relative">
                      <img src={p.url} alt={p.name} className="aspect-square w-full rounded-md object-cover" />
                      <button type="button" aria-label="Remove" onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
              {mediaType === 'interior' && (
                <p className="mt-3 flex gap-2 rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <span><strong>Interior 360°:</strong> sit in the middle of the cabin and take a <em>panorama</em> photo with your phone’s Panorama mode, turning all the way around (or as far as possible). Upload one wide image; buyers drag left and right to look around.</span>
                </p>
              )}
              {mediaType === '360' && (
                <p className="mt-3 flex gap-2 rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <span><strong>How to shoot a 360° set:</strong> park in open, even light. Walk around the car once, taking 24–36 photos at equal steps from the same height and distance, starting at the front-left corner. Select them in order. Buyers drag to rotate through them.</span>
                </p>
              )}
              {errors.photos && <p className="mt-2 text-xs font-semibold text-red-600">{errors.photos}</p>}
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Pricing">
            <div className="space-y-3">
              <Field label="Acquisition cost" error={errors.acquisition_cost}><PesoInput required value={form.acquisition_cost} onChange={(v) => setForm((f) => ({ ...f, acquisition_cost: v }))} placeholder="400,000" /></Field>
              <Field label="Repair & reconditioning" error={errors.repair_fees}><PesoInput value={form.repair_fees} onChange={(v) => setForm((f) => ({ ...f, repair_fees: v }))} placeholder="0" /></Field>
              <div>
                <div className="flex items-end justify-between">
                  <span className="rdg-label">Margin</span>
                  <span className="text-lg font-extrabold text-emerald-600">{form.margin_percent}%</span>
                </div>
                <input type="range" min={10} max={18} step={0.5} value={form.margin_percent} onChange={(e) => setForm((f) => ({ ...f, margin_percent: Number(e.target.value) }))} className="w-full" />
                <div className="flex justify-between text-[11px] text-slate-400"><span>10%</span><span>Company default {globalMargin}%</span><span>18%</span></div>
              </div>
              <dl className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Total cost</dt><dd className="tabular-nums">{peso(cost)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Margin ({form.margin_percent}%)</dt><dd className="tabular-nums text-emerald-700">+ {peso(price - cost)}</dd></div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-extrabold text-slate-900"><dt>Selling price</dt><dd className="tabular-nums">{peso(price)}</dd></div>
              </dl>
            </div>
          </Section>

          <Section title="Status">
            {locked ? (
              <p className="flex items-center gap-2 text-sm text-slate-600"><StatusBadge kind="vehicle" status={vehicle.status} /> Changes through its reservation or sale.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {[['available', 'Available', 'Shown in the showroom'], ['under_repair', 'In repair', 'Hidden until ready']].map(([key, label, hint]) => (
                  <button key={key} type="button" onClick={() => setForm((f) => ({ ...f, status: key }))}
                    className={`rounded-xl border p-3 text-left ${form.status === key ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className="block text-sm font-bold text-slate-900">{label}</span>
                    <span className="block text-xs text-slate-500">{hint}</span>
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>
      </form>
    </Modal>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      {children}
    </section>
  )
}

function MiniBtn({ label, onClick, children }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className="rounded bg-white/90 p-1 text-slate-700 hover:bg-white">{children}</button>
}
