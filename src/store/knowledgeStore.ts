import { create } from 'zustand'
import type { KnowledgeArticle, TicketCategory } from '@/types'
import { MOCK_KNOWLEDGE } from '@/utils/mockData'
import { saveToStorage, loadFromStorage } from '@/utils/storage'

interface KnowledgeState {
  articles: KnowledgeArticle[]
  initialize: () => void
  getArticleById: (id: string) => KnowledgeArticle | undefined
  searchArticles: (keyword: string) => KnowledgeArticle[]
  getArticlesByCategory: (category: string) => KnowledgeArticle[]
  getRelatedArticles: (id: string, limit?: number) => KnowledgeArticle[]
  addArticle: (data: Omit<KnowledgeArticle, 'id' | 'createdAt' | 'updatedAt' | 'authorId'> & { authorId: string }) => KnowledgeArticle
  updateArticle: (id: string, data: Partial<Pick<KnowledgeArticle, 'title' | 'content' | 'category' | 'tags' | 'relatedTicketId'>>) => KnowledgeArticle | undefined
  deleteArticle: (id: string) => boolean
}

const STORAGE_KEY = 'knowledge'

const persist = (articles: KnowledgeArticle[]) => {
  saveToStorage(STORAGE_KEY, articles)
}

const generateId = () => {
  const random = Math.random().toString(36).substring(2, 8)
  return `k-${Date.now()}-${random}`
}

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

  getRelatedArticles: (id, limit = 4) => {
    const current = get().getArticleById(id)
    if (!current) return []
    const all = get().articles.filter(a => a.id !== id)
    const scored = all.map(a => {
      let score = 0
      if (a.category === current.category) score += 3
      const tagSet = new Set(current.tags)
      for (const t of a.tags) {
        if (tagSet.has(t)) score += 2
      }
      return { article: a, score }
    })
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.article)
  },

  addArticle: (data) => {
    const now = new Date().toISOString()
    const newArticle: KnowledgeArticle = {
      id: generateId(),
      title: data.title,
      content: data.content,
      category: data.category as TicketCategory,
      tags: data.tags,
      authorId: data.authorId,
      relatedTicketId: data.relatedTicketId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    const next = [newArticle, ...get().articles]
    set({ articles: next })
    persist(next)
    return newArticle
  },

  updateArticle: (id, data) => {
    const index = get().articles.findIndex(a => a.id === id)
    if (index === -1) return undefined
    const updated: KnowledgeArticle = {
      ...get().articles[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    const next = [...get().articles]
    next[index] = updated
    set({ articles: next })
    persist(next)
    return updated
  },

  deleteArticle: (id) => {
    const exists = get().articles.some(a => a.id === id)
    if (!exists) return false
    const next = get().articles.filter(a => a.id !== id)
    set({ articles: next })
    persist(next)
    return true
  },
}))
