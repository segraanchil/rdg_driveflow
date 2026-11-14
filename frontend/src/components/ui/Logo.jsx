/**
 * The RDG Car Deals & Services logo (from the client's artwork, background removed).
 * `onDark` swaps to the white version for black surfaces (admin sidebar, footer, hero).
 */
export default function Logo({ onDark = false, className = 'h-11' }) {
  return (
    <img
      src={onDark ? '/brand/logo-white.png' : '/brand/logo-black.png'}
      alt="RDG Car Deals & Services"
      width={900}
      height={553}
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  )
}
