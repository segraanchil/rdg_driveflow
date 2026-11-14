import { Navigate } from 'react-router-dom'

/** The margin now lives in Business Settings → Pricing; old links still work. */
export default function MarginSettings() {
  return <Navigate to="/ceo/settings?tab=pricing" replace />
}
