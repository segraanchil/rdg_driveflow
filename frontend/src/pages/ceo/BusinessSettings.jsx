import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Info, Upload, Trash2, QrCode } from 'lucide-react'
import apiClient, { backendUrl } from '../../api/client'
import PageLoader from '../../components/ui/PageLoader'
import { Field, PageHeader, Tabs } from '../../components/ui/kit'
import { apiError, peso } from '../../lib/format'
import PesoInput from '../../components/ui/PesoInput'
import { toast } from '../../lib/toast'

const TABS = [
  { key: 'pricing', label: 'Pricing' },
  { key: 'payments', label: 'Payments' },
  { key: 'loans', label: 'Loan rates' },
  { key: 'fund', label: 'Expansion Fund' },
  { key: 'contact', label: 'Contact info' },
]

/** CEO business settings: margin (Story 28), reservation & payment details, loan rates, fund, contact. */
export default function BusinessSettings() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'pricing'
  const [values, setValues] = useState(null)

  useEffect(() => {
    apiClient.get('/ceo/settings').then(({ data }) => setValues(data))
  }, [])

  if (!values) return <PageLoader />

  return (
    <div className="max-w-3xl">
      <PageHeader title="Business Settings" subtitle="Figures used across the showroom, invoices and dashboards. Changes apply right away." />
      <Tabs tabs={TABS} value={tab} onChange={(k) => setParams({ tab: k }, { replace: true })} />
      {tab === 'pricing' && <MarginPanel initial={values.global_margin_percent} />}
      {tab === 'payments' && <PaymentsPanel values={values} setValues={setValues} />}
      {tab === 'loans' && (
        <SettingsForm values={values} setValues={setValues} note="Annual interest rates used for buyers’ monthly estimates. These are placeholders until the partner bank’s rate table is confirmed."
          fields={[
            ['loan_rate_employed', 'Employed (% per year)', 'number'],
            ['loan_rate_ofw', 'OFW (% per year)', 'number'],
            ['loan_rate_business_owner', 'Business owner (% per year)', 'number'],
          ]} />
      )}
      {tab === 'fund' && (
        <SettingsForm values={values} setValues={setValues} note="Each recorded sale adds this percentage of its amount to the Expansion Fund. Past entries are not recalculated."
          fields={[
            ['expansion_fund_percent', 'Contribution (% of each sale)', 'number'],
            ['expansion_fund_goal', 'Fund goal', 'peso'],
          ]} />
      )}
      {tab === 'contact' && (
        <SettingsForm values={values} setValues={setValues} note="Shown in the site footer, the chat assistant and on invoices."
          fields={[
            ['business_address', 'Address', 'text'],
            ['business_hours', 'Opening hours', 'text'],
            ['business_phone', 'Phone / mobile', 'text'],
            ['business_email', 'Email', 'email'],
          ]} />
      )}
    </div>
  )
}

function SettingsForm({ values, setValues, fields, note, children }) {
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(([k]) => [k, values[k] ?? ''])))
  const [error, setError] = useState(null)

  async function save(e) {
    e.preventDefault()
    setError(null)
    try {
      const { data } = await apiClient.put('/ceo/settings', form, { quietErrors: true })
      setValues(data)
      toast.success('Settings saved')
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <form onSubmit={save} className="rdg-card space-y-4 p-6">
      {note && <p className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Info size={16} className="mt-0.5 shrink-0 text-slate-400" /> {note}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label, type]) => (
          <Field key={key} label={label}>
            {type === 'peso' ? (
              <PesoInput value={form[key]} onChange={(v) => setForm((f) => ({ ...f, [key]: v }))} hint="short" />
            ) : (
              <input type={type} step={type === 'number' ? '0.01' : undefined} min={type === 'number' ? 0 : undefined} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full" />
            )}
          </Field>
        ))}
      </div>
      {children}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end"><button className="rdg-btn">Save changes</button></div>
    </form>
  )
}

function PaymentsPanel({ values, setValues }) {
  async function uploadQr(file) {
    const body = new FormData()
    body.append('qr', file)
    const { data } = await apiClient.post('/ceo/settings/payment-qr', body, { headers: { 'Content-Type': 'multipart/form-data' } })
    setValues(data)
    toast.success('QR code updated')
  }
  async function removeQr() {
    const { data } = await apiClient.delete('/ceo/settings/payment-qr')
    setValues(data)
  }

  return (
    <div className="space-y-5">
      <SettingsForm values={values} setValues={setValues} note="Buyers choose GCash or bank transfer when reserving. GCash shows the QR below and the GCash number; bank transfer shows the bank, account name and account number. Payments are verified manually."
        fields={[
          ['reservation_fee', 'Reservation fee', 'peso'],
          ['payment_bank_name', 'Bank name', 'text'],
          ['payment_account_name', 'Account name', 'text'],
          ['payment_account_number', 'Account number', 'text'],
          ['payment_ewallet_name', 'E-wallet name (shown to buyers)', 'text'],
          ['payment_ewallet_number', 'GCash number', 'text'],
        ]} />
      <div className="rdg-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
          {values.payment_qr_path ? <img src={backendUrl(`/storage/${values.payment_qr_path}`)} alt="Payment QR code" className="h-full w-full object-contain" /> : <QrCode size={40} className="text-slate-300" />}
        </div>
        <div className="flex-1">
          <p className="font-bold text-slate-900">GCash QR code</p>
          <p className="text-sm text-slate-500">Buyers who choose GCash on the reservation page see this QR. Download it from the GCash app (Receive → QR) and upload it here.</p>
          <div className="mt-3 flex gap-2">
            <label className="rdg-btn cursor-pointer"><Upload size={15} /> {values.payment_qr_path ? 'Replace' : 'Upload'} QR
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files[0] && uploadQr(e.target.files[0])} />
            </label>
            {values.payment_qr_path && <button onClick={removeQr} className="rdg-btn-ghost text-red-600"><Trash2 size={15} /> Remove</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function MarginPanel({ initial }) {
  const [margin, setMargin] = useState(Number(initial))
  const [result, setResult] = useState(null)
  const example = 500000

  async function save() {
    const { data } = await apiClient.put('/ceo/margin-setting', { margin_percent: margin }, { loadingText: 'Updating prices…' })
    setResult(data.repriced)
    toast.success(`Margin saved. ${data.repriced} car${data.repriced === 1 ? '' : 's'} re-priced.`)
  }

  return (
    <div className="rdg-card p-6">
      <div className="flex items-end justify-between">
        <span className="rdg-label">Global profit margin</span>
        <span className="text-4xl font-extrabold text-emerald-600">{margin}%</span>
      </div>
      <input type="range" min={10} max={18} step={0.5} value={margin} onChange={(e) => { setMargin(Number(e.target.value)); setResult(null) }} className="mt-3 w-full" />
      <div className="flex justify-between text-xs text-slate-400"><span>10%</span><span>18%</span></div>
      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        Example: a car costing {peso(example)} (purchase + repairs) sells for <strong className="text-slate-900">{peso(Math.round(example * (1 + margin / 100)))}</strong>.
      </p>
      <p className="mt-3 flex gap-2 text-xs text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>Saving re-prices every <strong>available</strong> car. Reserved and sold cars keep the price the buyer agreed to. New cars use this margin by default.</span>
      </p>
      <button onClick={save} className="rdg-btn mt-5 w-full py-3">Save and apply</button>
      {result !== null && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved. {result} available car{result === 1 ? ' was' : 's were'} re-priced.</p>}
    </div>
  )
}
