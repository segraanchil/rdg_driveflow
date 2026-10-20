import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageLoader from '../components/ui/PageLoader'

/** Gates any route behind login + (optionally) a verified MFA session. */
export default function ProtectedRoute({ children, roles, requireMfa = false }) {
  const { user, loading, mfaRequired, mfaVerified } = useAuth()
  const location = useLocation()

  if (loading) return <div className="mx-auto max-w-6xl p-6"><PageLoader /></div>

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
