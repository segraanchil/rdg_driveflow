// Tiny global store for loading indicators. The API client reports every request here;
// <GlobalLoader /> listens and shows the top bar (reads) or the saving card (writes).
const state = { reads: 0, writes: 0, message: '' }
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn({ ...state }))

export function subscribeLoading(fn) {
  listeners.add(fn)
  fn({ ...state })
  return () => listeners.delete(fn)
}

/** Call when a request starts; returns a function to call when it ends. */
export function trackRequest(kind, message) {
  if (kind === 'write') {
    state.writes += 1
    state.message = message || 'Saving…'
  } else {
    state.reads += 1
  }
  emit()
  let done = false
  return () => {
    if (done) return
    done = true
    if (kind === 'write') state.writes = Math.max(0, state.writes - 1)
    else state.reads = Math.max(0, state.reads - 1)
    emit()
  }
}
