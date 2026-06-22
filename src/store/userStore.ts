import { create } from 'zustand'
import type { User } from '@/types'
import { MOCK_USERS } from '@/utils/mockData'
import {
  loadFromStorage,
  saveToStorage,
  removeFromStorage,
  loadFromSessionStorage,
  saveToSessionStorage,
  removeFromSessionStorage,
} from '@/utils/storage'

const STORAGE_KEY = 'tms_auth'
const STORAGE_KEY_USERS = 'tms_users'
const REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000
const RENEW_THROTTLE = 60 * 1000

interface AuthSession {
  user: User
  rememberMe: boolean
  expiresAt: number
}

interface UserState {
  currentUser: User | null
  users: User[]
  isAuthenticated: boolean
  initialize: () => void
  login: (email: string, password: string, rememberMe: boolean) => { success: boolean; message: string }
  logout: () => void
  setCurrentUser: (user: User) => void
  initAuth: () => void
  renewSession: () => void
  getUsersByDepartment: (departmentId: string | null) => User[]
  getAgentsByDepartment: (departmentId: string | null) => User[]
}

let lastRenewTime = 0

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  users: MOCK_USERS,
  isAuthenticated: false,

  initialize: () => {
    const savedUsers = loadFromStorage<User[]>(STORAGE_KEY_USERS)
    if (savedUsers) {
      const normalized = savedUsers.map(u => ({
        ...u,
        departmentId: u.departmentId ?? null,
      }))
      set({ users: normalized })
    }
  },

  initAuth: () => {
    const remembered = loadFromStorage<AuthSession>(STORAGE_KEY)
    if (remembered?.user) {
      if (remembered.expiresAt > Date.now()) {
        const normalized = {
          ...remembered.user,
          departmentId: remembered.user.departmentId ?? null,
        }
        set({ currentUser: normalized, isAuthenticated: true })
        return
      }
      removeFromStorage(STORAGE_KEY)
    }

    const session = loadFromSessionStorage<AuthSession>(STORAGE_KEY)
    if (session?.user) {
      const normalized = {
        ...session.user,
        departmentId: session.user.departmentId ?? null,
      }
      set({ currentUser: normalized, isAuthenticated: true })
    }
  },

  login: (email, password, rememberMe) => {
    const user = get().users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )
    if (user) {
      const safeUser: User = { ...user }
      const session: AuthSession = {
        user: safeUser,
        rememberMe,
        expiresAt: Date.now() + REMEMBER_ME_DURATION,
      }
      if (rememberMe) {
        saveToStorage(STORAGE_KEY, session)
      } else {
        saveToSessionStorage(STORAGE_KEY, session)
      }
      set({ currentUser: safeUser, isAuthenticated: true })
      return { success: true, message: '登录成功' }
    }
    return { success: false, message: '邮箱或密码错误' }
  },

  renewSession: () => {
    const now = Date.now()
    if (now - lastRenewTime < RENEW_THROTTLE) return
    const { isAuthenticated, currentUser } = get()
    if (!isAuthenticated || !currentUser) return
    const remembered = loadFromStorage<AuthSession>(STORAGE_KEY)
    if (remembered?.rememberMe && remembered.user) {
      saveToStorage(STORAGE_KEY, {
        ...remembered,
        expiresAt: now + REMEMBER_ME_DURATION,
      })
      lastRenewTime = now
    }
  },

  logout: () => {
    removeFromStorage(STORAGE_KEY)
    removeFromSessionStorage(STORAGE_KEY)
    lastRenewTime = 0
    set({ currentUser: null, isAuthenticated: false })
  },

  setCurrentUser: (user) => set({ currentUser: user }),

  getUsersByDepartment: (departmentId) => {
    if (!departmentId) return get().users.filter(u => !u.departmentId)
    return get().users.filter(u => u.departmentId === departmentId)
  },

  getAgentsByDepartment: (departmentId) => {
    return get().getUsersByDepartment(departmentId).filter(u => u.role === 'agent' || u.role === 'admin')
  },
}))
