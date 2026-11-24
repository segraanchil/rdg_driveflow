import { useEffect, useState } from 'react'

// The (up to) two cars picked for comparison, kept for the visit in localStorage:
// [{ id, name, thumb }]. Every Compare button, the tray and the Compare page share this list.
const KEY = 'rdg.compare'
export const MAX_COMPARE = 2
const listeners = new Set()
let items = read()

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((v) => v?.id).slice(0, MAX_COMPARE) : []
  } catch {
    return []
  }
}

function save(next) {
  items = next
  try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* private mode: keep it in memory */ }
  listeners.forEach((fn) => fn(items))
}

export function compareEntry(vehicle) {
  return { id: vehicle.id, name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, thumb: vehicle.media?.[0]?.file_path ?? null }
}

export const compare = {
  /** Returns 'added', 'removed' or 'full' (two cars are already picked). */
  toggle(vehicle) {
    if (items.some((v) => v.id === vehicle.id)) {
      save(items.filter((v) => v.id !== vehicle.id))
      return 'removed'
    }
    if (items.length >= MAX_COMPARE) return 'full'
    save([...items, compareEntry(vehicle)])
    return 'added'
  },
  remove(id) { save(items.filter((v) => v.id !== id)) },
  set(list) { save(list.slice(0, MAX_COMPARE)) },
  clear() { save([]) },
}

export function compareUrl(list = items) {
  const [a, b] = list
  return `/compare${a ? `?a=${a.id}` : ''}${b ? `&b=${b.id}` : ''}`
}

export function useCompare() {
  const [list, setList] = useState(items)
  useEffect(() => {
    setList(items)
    listeners.add(setList)
    return () => { listeners.delete(setList) }
  }, [])
  return list
}
