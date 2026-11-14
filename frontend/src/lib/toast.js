// Tiny toast store: toast.success('Saved'), toast.error('…'). <Toaster /> renders them.
const listeners = new Set()
let items = []
let nextId = 1

function emit() {
  listeners.forEach((fn) => fn(items))
}

function push(type, message, ms = 3800) {
  const id = nextId++
  items = [...items, { id, type, message }]
  emit()
  setTimeout(() => dismiss(id), ms)
  return id
}

export function dismiss(id) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export function subscribeToasts(fn) {
  listeners.add(fn)
  fn(items)
  return () => listeners.delete(fn)
}

export const toast = {
  success: (m) => push('success', m),
  error: (m) => push('error', m, 6000),
  info: (m) => push('info', m),
}
