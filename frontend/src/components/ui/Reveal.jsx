import { useEffect, useRef, useState } from 'react'

/**
 * Fades + slides its content in the first time it scrolls into view.
 * `delay` (ms) staggers items in a grid. Shows immediately if IntersectionObserver is missing,
 * and the reduced-motion rule in index.css turns the movement off.
 */
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (shown || !ref.current) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect() }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [shown])

  return (
    <Tag ref={ref} style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      className={`transition duration-700 ease-out motion-reduce:transition-none ${shown ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
