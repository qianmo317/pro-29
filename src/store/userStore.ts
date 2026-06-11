import { create } from 'zustand'
import type { User } from '@/types'
import { MOCK_USERS } from '@/utils/mockData'
import { loadFromStorage, saveToStorage, removeFromStorage } from '@/utils/storage'

const STORAGE_KEY = 'tms_current_user'

interface UserState {
  currentUser: User | null
  users: User[]
  isAuthenticated: boolean
  login: (email: string, password: string) => { success: boolean; message: string }
  logout: () => void
  setCurrentUser: (user: User) => void
  initAuth: () => void
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  users: MOCK_USERS,
  isAuthenticated: false,

  initAuth: () => {
    const saved = loadFromStorage<User>(STORAGE_KEY)
    if (saved) {
      set({ currentUser: saved, isAuthenticated: true })
    }
  },

  login: (email: string, password: string) => {
    const user = MOCK_USERS.find(
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
}))
