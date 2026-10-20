import { Link, useSearchParams } from 'react-router-dom'
import AuthShell from '../../components/layout/AuthShell'

/** Landing page for the signed link in VerifyEmailMail — backend redirects here after checking it. */
export default function EmailVerified() {
  const [params] = useSearchParams()
  const success = params.get('status') === 'success'

  return (
    <AuthShell>
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {success ? 'Email verified' : 'Link invalid or expired'}
        </h1>
        <p className="text-sm text-slate-500">
          {success
            ? 'Your email address is confirmed. You can continue using your account.'
            : "This verification link didn't work. It may have expired — you can still use your account as normal."}
        </p>
        <Link to="/login" className="rdg-btn w-full py-3">
          Go to login
        </Link>
      </div>
    </AuthShell>
  )
}
