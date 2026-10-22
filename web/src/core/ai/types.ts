import type { User } from '../types'

export interface AIMessage {
  role: 'user' | 'assistant'
  text: string
}

export interface AISuggestion {
  label: string
  link: string
}

export interface AIReply {
  text: string
  suggestions?: AISuggestion[]
}

/** هر ارائه‌دهنده‌ی هوش مصنوعی (محلی یا سرور LLM) این قرارداد را پیاده می‌کند */
export interface AIProvider {
  name: string
  reply(history: AIMessage[], profile: User): Promise<AIReply>
}
