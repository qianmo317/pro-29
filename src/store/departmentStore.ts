import { create } from 'zustand'
import type { Department, User } from '@/types'
import { MOCK_DEPARTMENTS, MOCK_USERS } from '@/utils/mockData'
import { saveToStorage, loadFromStorage } from '@/utils/storage'

interface DepartmentState {
  departments: Department[]
  initialize: () => void
  getDepartmentById: (id: string) => Department | undefined
  getDepartmentName: (id: string | null) => string
  getUsersByDepartment: (departmentId: string | null, users: User[]) => User[]
  getAgentsByDepartment: (departmentId: string | null, users: User[]) => User[]
}

const STORAGE_KEY = 'departments'

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  departments: MOCK_DEPARTMENTS,

  initialize: () => {
    const savedDepartments = loadFromStorage<Department[]>(STORAGE_KEY)
    if (savedDepartments) set({ departments: savedDepartments })
  },

  getDepartmentById: (id) => {
    return get().departments.find(d => d.id === id)
  },

  getDepartmentName: (id) => {
    if (!id) return '未指派'
    const dept = get().departments.find(d => d.id === id)
    return dept ? dept.name : '未指派'
  },

  getUsersByDepartment: (departmentId, users) => {
    if (!departmentId) return users.filter(u => !u.departmentId)
    return users.filter(u => u.departmentId === departmentId)
  },

  getAgentsByDepartment: (departmentId, users) => {
    const deptUsers = get().getUsersByDepartment(departmentId, users)
    return deptUsers.filter(u => u.role === 'agent' || u.role === 'admin')
  },
}))
