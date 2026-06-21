import { create } from 'zustand'
import type { SLAConfig, TicketPriority } from '@/types'
import { MOCK_SLA_CONFIGS } from '@/utils/mockData'
import { saveToStorage, loadFromStorage } from '@/utils/storage'

const STORAGE_KEY = 'sla_configs'

interface SLAState {
  configs: SLAConfig[]
  initialize: () => void
  updateConfig: (priority: TicketPriority, responseHours: number, resolutionHours: number) => void
  getConfigByPriority: (priority: TicketPriority) => SLAConfig | undefined
  resetToDefaults: () => void
}

export const useSLAStore = create<SLAState>((set, get) => ({
  configs: MOCK_SLA_CONFIGS,

  initialize: () => {
    const savedConfigs = loadFromStorage<SLAConfig[]>(STORAGE_KEY)
    if (savedConfigs) {
      set({ configs: savedConfigs })
    }
  },

  updateConfig: (priority, responseHours, resolutionHours) => {
    set((state) => {
      const updatedConfigs = state.configs.map((config) =>
        config.priority === priority
          ? { ...config, responseHours, resolutionHours }
          : config
      )
      saveToStorage(STORAGE_KEY, updatedConfigs)
      return { configs: updatedConfigs }
    })
  },

  getConfigByPriority: (priority) => {
    return get().configs.find((config) => config.priority === priority)
  },

  resetToDefaults: () => {
    saveToStorage(STORAGE_KEY, MOCK_SLA_CONFIGS)
    set({ configs: MOCK_SLA_CONFIGS })
  },
}))
