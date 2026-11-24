/** Ready-made tags staff can tap when adding a car; "Others" lets them type their own. */
export const TAG_PRESETS = [
  'LADY OWNED', 'CASA MAINTAINED', 'FIRST OWNER', 'LOW MILEAGE', 'ALL ORIGINAL', 'COMPLETE PAPERS',
  'FRESH IN & OUT', 'NO ACCIDENT HISTORY', 'NEVER FLOODED', 'NEW TIRES',
]
export const MAX_TAGS = 6 // same as Vehicle::MAX_TAGS
export const MAX_TAG_LENGTH = 30

/** A car's selling points (LADY OWNED, CASA MAINTAINED, …), shown just below its specs. */
export default function VehicleTags({ tags, limit, className = '' }) {
  if (!tags?.length) return null
  const shown = limit ? tags.slice(0, limit) : tags
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Highlights">
      {shown.map((t) => (
        <li key={t} className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-800 ring-1 ring-inset ring-slate-800/70">{t}</li>
      ))}
      {tags.length > shown.length && <li className="px-1 py-0.5 text-[10px] font-bold text-slate-500">+{tags.length - shown.length}</li>}
    </ul>
  )
}
