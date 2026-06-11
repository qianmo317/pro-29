import { create } from 'zustand'
import type { KnowledgeArticle } from '@/types'
import { MOCK_KNOWLEDGE } from '@/utils/mockData'
import { saveToStorage, loadFromStorage } from '@/utils/storage'

interface KnowledgeState {
  articles: KnowledgeArticle[]
  initialize: () => void
  getArticleById: (id: string) => KnowledgeArticle | undefined
  searchArticles: (keyword: string) => KnowledgeArticle[]
  getArticlesByCategory: (category: string) => KnowledgeArticle[]
}

const STORAGE_KEY = 'knowledge'

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  articles: MOCK_KNOWLEDGE,

  initialize: () => {
    const saved = loadFromStorage<KnowledgeArticle[]>(STORAGE_KEY)
    if (saved) set({ articles: saved })
  },

  getArticleById: (id) => {
    return get().articles.find(a => a.id === id)
  },

  searchArticles: (keyword) => {
    const k = keyword.toLowerCase()
    return get().articles.filter(a =>
      a.title.toLowerCase().includes(k) ||
      a.tags.some(t => t.toLowerCase().includes(k)) ||
      a.content.toLowerCase().includes(k)
    )
  },

  getArticlesByCategory: (category) => {
    if (!category || category === 'all') return get().articles
    return get().articles.filter(a => a.category === category)
  },
}))
