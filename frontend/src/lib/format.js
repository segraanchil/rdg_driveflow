/** Display helpers so no page shows raw ISO dates or unformatted numbers. */

export function peso(value, { decimals = 0 } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function pesoCompact(value) {
  const n = Number(value) || 0
  if (Math.abs(n) >= 1_000_000) return `₱${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  if (Math.abs(n) >= 1_000) return `₱${Math.round(n / 1_000)}K`
  return peso(n)
}

export function km(value) {
  return value == null ? '—' : `${Number(value).toLocaleString('en-PH')} km`
}

function toDate(value) {
  if (!value) return null
  // "2026-11-15" (a date column) is a calendar date, not midnight UTC.
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value, opts = {}) {
  const d = toDate(value)
  return d ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', ...opts }) : '—'
}

export function formatDateTime(value) {
  const d = toDate(value)
  return d ? d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
}

export function formatTime(value) {
  const d = toDate(value)
  return d ? d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '—'
}

export function timeAgo(value) {
  const d = toDate(value)
  if (!d) return '—'
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  if (mins < 2880) return 'yesterday'
  return formatDate(d)
}

/** "2h 14m left", "35m left", "expired". */
export function timeLeft(value, now = Date.now()) {
  const d = toDate(value)
  if (!d) return '—'
  const ms = d.getTime() - now
  if (ms <= 0) return 'expired'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`
}

export function vehicleName(v) {
  return v ? `${v.year ?? ''} ${v.make ?? ''} ${v.model ?? ''}`.trim() : 'Vehicle'
}

export function initials(name) {
  return (name ?? '?').split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

const DOC_LABELS = {
  payslip: 'Latest payslips (3 months)',
  coe: 'Certificate of employment / contract',
  valid_id: '2 valid government IDs',
  remittance_proof: 'Proof of remittance (3 months)',
  attorney_valid_id: 'Attorney-in-fact’s valid IDs',
  business_permit: 'Mayor’s / Business Permit',
  proof_of_billing: 'Proof of billing',
  consularized_authorization: 'Special Power of Attorney (SPA)',
  dti_or_sec: 'DTI / SEC registration',
  itr: 'Income tax return (ITR)',
  bank_statement: 'Bank statements (6 months)',
  invoice: 'Invoice',
  deed_of_sale: 'Deed of Sale',
  official_receipt: 'Official Receipt',
}

export function docLabel(key) {
  return DOC_LABELS[key] ?? String(key ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export const PROFILE_LABELS = { employed: 'Employed', ofw: 'OFW', business_owner: 'Business Owner' }

/** How the person named on the Deed of Sale is related to the buyer (IntendedOwner::RELATIONSHIPS). */
export const RELATIONSHIP_LABELS = { child: 'Child', spouse: 'Spouse', parent: 'Parent', sibling: 'Sibling', relative: 'Other relative', other: 'Other person' }

/** The owner named on the Deed of Sale must be above 17 (IntendedOwner::MIN_AGE). */
export const MIN_OWNER_AGE = 18

/** Age in full years for a "YYYY-MM-DD" birthdate. */
export function ageOn(birthdate, today = new Date()) {
  const [y, m, d] = birthdate.split('-').map(Number)
  const hadBirthday = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d)
  return today.getFullYear() - y - (hadBirthday ? 0 : 1)
}

/** Laravel validation/abort message from an axios error. */
export function apiError(err, fallback = 'Something went wrong. Please try again.') {
  const data = err?.response?.data
  const first = data?.errors && Object.values(data.errors)[0]?.[0]
  return first ?? data?.message ?? (err?.response ? fallback : 'Can’t reach the server. Check your connection.')
}
