/**
 * Web storage that never throws. Private windows, blocked site data and full
 * quotas all make the Storage API throw; none of that should break a page
 * that only uses storage as a convenience.
 */
function read<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

function write(storage: () => Storage, key: string, value: unknown) {
  try {
    if (value === null) storage().removeItem(key)
    else storage().setItem(key, JSON.stringify(value))
  } catch {
    // Nothing to do: the page keeps working, it just won't remember.
  }
}

const session = () => window.sessionStorage
const local = () => window.localStorage

/** Per tab: survives a refresh, gone when the tab closes. */
export const tabStore = {
  read: <T>(key: string) => read<T>(session, key),
  write: (key: string, value: unknown) => write(session, key, value),
}

/** Per browser: survives closing the tab. */
export const browserStore = {
  read: <T>(key: string) => read<T>(local, key),
  write: (key: string, value: unknown) => write(local, key, value),
}
