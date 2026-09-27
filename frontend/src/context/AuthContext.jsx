import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import apiClient, { ensureCsrfCookie } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaVerified, setMfaVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/auth/me')
      setUser(data.user)
      // A logged-in-but-not-yet-MFA-verified session still resolves here
      // (EnsureMfaVerified only guards account-gated routes, not /auth/me),
      // so this recovers MFA state correctly after a page refresh mid-flow.
      setMfaRequired(true)
      setMfaVerified(data.mfa_verified)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email, password) => {
    await ensureCsrfCookie()
    const { data } = await apiClient.post('/auth/login', { email, password })
    setUser(data.user)
    setMfaRequired(Boolean(data.mfa_required))
    setMfaVerified(!data.mfa_required)
    return data
  }, [])

  const register = useCallback(async (payload) => {
    await ensureCsrfCookie()
    const { data } = await apiClient.post('/auth/register', payload)
    setUser(data.user)
    setMfaVerified(true)
    return data
  }, [])

  const verifyMfa = useCallback(async (code) => {
    await apiClient.post('/auth/mfa/verify', { code })
    setMfaVerified(true)
  }, [])

  const logout = useCallback(async () => {
    await apiClient.post('/auth/logout')
    setUser(null)
    setMfaRequired(false)
    setMfaVerified(false)
  }, [])

  const value = {
    user,
    loading,
    mfaRequired,
    mfaVerified,
    isAuthenticated: Boolean(user) && (!mfaRequired || mfaVerified),
    login,
    register,
    verifyMfa,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
