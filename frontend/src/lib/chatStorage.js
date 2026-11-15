/**
 * Chat widget storage, kept per person so nobody sees someone else's chat on a shared device:
 *  - keys are scoped to the owner: "u<id>" for a signed-in account, "guest" otherwise;
 *  - everything lives in sessionStorage (gone when the tab/browser closes);
 *  - logging out wipes all of it (clearChatStorage, called from AuthContext.logout).
 * A signed-in buyer/seller's staff chat can still be reopened from the server (/support/mine).
 */
const PREFIXES = ['rdg.chat', 'rdg.support']

export const chatKey = (owner) => `rdg.chat:${owner}`
export const supportKey = (owner) => `rdg.support:${owner}`

export function readJson(key) {
  try { return JSON.parse(sessionStorage.getItem(key)) } catch { return null }
}

export function writeJson(key, value) {
  try {
    if (value == null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(value))
  } catch { /* storage unavailable (private mode): the chat still works, it just isn't kept */ }
}

export function clearChatStorage() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      Object.keys(store).filter((k) => PREFIXES.some((p) => k === p || k.startsWith(`${p}:`))).forEach((k) => store.removeItem(k))
    } catch { /* ignore */ }
  }
}

// Older builds kept one shared chat for everyone using the browser (and the staff chat in
// localStorage, which outlived the session). Drop those leftovers once.
try {
  sessionStorage.removeItem('rdg.chat')
  localStorage.removeItem('rdg.support')
} catch { /* ignore */ }
