import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={submit} className="w-80 space-y-4 rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-bold text-brand">Create Account</h1>

        <div className="flex gap-2 text-sm">
          {['buyer', 'seller'].map((role) => (
            <label
              key={role}
              className={`flex-1 cursor-pointer rounded border px-3 py-2 text-center ${
                form.role === role ? 'border-brand bg-brand text-white' : 'border-slate-300'
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
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setField('email', e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setField('password', e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-brand py-2 text-white">
          Sign Up
        </button>
        <p className="text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="text-brand underline">Log in</Link>
        </p>
      </form>
    </div>
  )
}
