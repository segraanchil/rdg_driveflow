import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="flex items-center justify-between bg-brand px-6 py-4 text-white">
      <Link to="/" className="text-lg font-bold">
        RDG DriveFlow
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/inventory">Inventory</Link>
        <Link to="/loan-calculator">Loan Calculator</Link>
        <Link to="/sell-your-car">Sell Your Car</Link>
        {user ? (
          <>
            {user.role === 'buyer' && <Link to="/garage">My Garage</Link>}
            {user.role === 'seller' && <Link to="/my-leads">My Submissions</Link>}
            <button onClick={logout} className="text-brand-accent">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log In</Link>
            <Link to="/register" className="text-brand-accent">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
