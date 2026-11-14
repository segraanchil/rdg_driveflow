import { useEffect, useState } from 'react'
import apiClient from '../api/client'

// Public business settings (payment details, reservation fee, loan rates, contact info),
// fetched once per page load and shared by every component that asks.
const DEFAULTS = {
  reservation_fee: 10000,
  loan_rate_employed: 9.5,
  loan_rate_ofw: 10.5,
  loan_rate_business_owner: 11.5,
  business_address: 'Quezon City, Philippines',
  business_hours: 'Mon–Sat, 9:00 AM – 6:00 PM',
}

let cache = null
let pending = null

export function loadSettings() {
  pending ??= apiClient
    .get('/settings/public', { silent: true })
    .then(({ data }) => (cache = { ...DEFAULTS, ...data }))
    .catch(() => (cache = DEFAULTS))
  return pending
}

export function useSettings() {
  const [settings, setSettings] = useState(cache ?? DEFAULTS)
  useEffect(() => {
    let alive = true
    loadSettings().then((s) => alive && setSettings(s))
    return () => { alive = false }
  }, [])
  return settings
}

export function loanRateFor(settings, profile) {
  return Number(settings[`loan_rate_${profile}`] ?? settings.loan_rate_employed ?? 0)
}
