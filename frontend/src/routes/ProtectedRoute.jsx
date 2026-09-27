import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Gates any route behind login + (optionally) a verified MFA session. */
export default function ProtectedRoute({ children, roles, requireMfa = false }) {
  const { user, loading, mfaRequired, mfaVerified } = useAuth()
  const location = useLocation()

  if (loading) return null // TODO: swap for a real loading skeleton

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  if (requireMfa && mfaRequired && !mfaVerified) {
    return <Navigate to="/mfa" state={{ from: location }} replace />
  }

  return children
}
