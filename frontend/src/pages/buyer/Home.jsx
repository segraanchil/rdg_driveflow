import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-brand">RDG Car Deals & Services</h1>
      <p className="mt-2 text-slate-600">Quality secondhand vehicles, transparent pricing.</p>
      <Link
        to="/inventory"
        className="mt-6 inline-block rounded bg-brand-accent px-6 py-3 font-semibold text-white"
      >
        Browse Inventory
      </Link>
    </div>
  )
}
