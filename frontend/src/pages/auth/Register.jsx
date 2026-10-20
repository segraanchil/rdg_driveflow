import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/layout/AuthShell'

/** Buyer/seller signup only — Admin/CEO accounts are provisioned manually. */
export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'buyer' })
  const [error, setError] = useState(null)

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      const apiMessage =
        err.response?.data?.errors?.email?.[0] ?? err.response?.data?.message
      setError(apiMessage ?? `Registration failed (${err.message}). Is the backend running?`)
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Create Account</h1>

        <div className="flex gap-2 text-sm">
          {['buyer', 'seller'].map((role) => (
            <label
              key={role}
              className={`flex-1 cursor-pointer rounded border px-3 py-2 text-center ${
                form.role === role ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={role}
                checked={form.role === role}
                onChange={(e) => setField('role', e.target.value)}
                className="hidden"
              />
              {role === 'buyer' ? "I'm buying" : "I'm selling"}
            </label>
          ))}
        </div>

        <input
          placeholder="Full name"
          required
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          className="w-full"
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setField('email', e.target.value)}
          className="w-full"
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setField('password', e.target.value)}
          className="w-full"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rdg-btn w-full py-3">
          Sign Up
        </button>
        <p className="text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="font-semibold text-emerald-700 hover:underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  )
}
