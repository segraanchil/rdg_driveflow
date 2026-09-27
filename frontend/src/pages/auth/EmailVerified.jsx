import { Link, useSearchParams } from 'react-router-dom'

/** Landing page for the signed link in VerifyEmailMail — backend redirects here after checking it. */
export default function EmailVerified() {
  const [params] = useSearchParams()
  const success = params.get('status') === 'success'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-80 space-y-4 rounded-lg bg-white p-6 text-center shadow">
        <h1 className="text-xl font-bold text-brand">
          {success ? 'Email verified' : 'Link invalid or expired'}
        </h1>
        <p className="text-sm text-slate-500">
          {success
            ? 'Your email address is confirmed. You can continue using your account.'
            : "This verification link didn't work. It may have expired — you can still use your account as normal."}
        </p>
        <Link to="/login" className="block w-full rounded bg-brand py-2 text-white">
          Go to login
        </Link>
      </div>
    </div>
  )
}
