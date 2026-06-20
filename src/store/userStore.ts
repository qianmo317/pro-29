import { create } from 'zustand'
import type { User } from '@/types'
import { MOCK_USERS } from '@/utils/mockData'
import { loadFromStorage, saveToStorage, removeFromStorage } from '@/utils/storage'

const STORAGE_KEY = 'tms_current_user'
const STORAGE_KEY_USERS = 'tms_users'

interface UserState {
  currentUser: User | null
  users: User[]
  isAuthenticated: boolean
  initialize: () => void
  login: (email: string, password: string) => { success: boolean; message: string }
  logout: () => void
  setCurrentUser: (user: User) => void
  initAuth: () => void
  getUsersByDepartment: (departmentId: string | null) => User[]
  getAgentsByDepartment: (departmentId: string | null) => User[]
}

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
    const saved = loadFromStorage<User>(STORAGE_KEY)
    if (saved) {
      const normalized = {
        ...saved,
        departmentId: saved.departmentId ?? null,
      }
      set({ currentUser: normalized, isAuthenticated: true })
    }
  },

  login: (email: string, password: string) => {
    const user = get().users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )
    if (user) {
      const safeUser: User = { ...user }
      saveToStorage(STORAGE_KEY, safeUser)
      set({ currentUser: safeUser, isAuthenticated: true })
      return { success: true, message: '登录成功' }
    }
    return { success: false, message: '邮箱或密码错误' }
  },

  logout: () => {
    removeFromStorage(STORAGE_KEY)
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
