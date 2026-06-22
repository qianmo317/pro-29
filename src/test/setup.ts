import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

class LocalStorageMock {
  private store: Record<string, string> = {}

  clear() {
    this.store = {}
  }

  getItem(key: string) {
    return this.store[key] || null
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value)
  }

  removeItem(key: string) {
    delete this.store[key]
  }

  key(index: number) {
    return Object.keys(this.store)[index] || null
  }

  get length() {
    return Object.keys(this.store).length
  }
}

beforeEach(() => {
  const ls = new LocalStorageMock()
  const ss = new LocalStorageMock()
  Object.defineProperty(window, 'localStorage', { value: ls, writable: true })
  Object.defineProperty(window, 'sessionStorage', { value: ss, writable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true })
  Object.defineProperty(globalThis, 'sessionStorage', { value: ss, writable: true })
})
