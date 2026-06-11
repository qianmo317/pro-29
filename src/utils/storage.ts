const STORAGE_PREFIX = 'tms_'

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
  } catch {
    // ignore storage errors
  }
}

export function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

export function removeFromStorage(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key)
}
