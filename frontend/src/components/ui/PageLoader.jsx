/** Placeholder shown while a page loads its data: skeleton cards instead of a blank screen. */
export default function PageLoader({ rows = 3, label = 'Loading…' }) {
  return (
    <div role="status" aria-label={label} className="animate-rdg-fade-up space-y-4">
      <div className="rdg-skeleton h-8 w-56" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="rdg-skeleton h-24 rounded-2xl" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="rdg-skeleton h-14 rounded-xl" />)}
      <span className="sr-only">{label}</span>
    </div>
  )
}
