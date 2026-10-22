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

/** زمینه‌ی اضافه برای شخصی‌سازی پاسخ (مثلاً فاز چرخه‌ی بانوان) */
export interface AIContext {
  cycle?: { day: number; phase: string; intensity: string; workout: string; nutrition: string; daysToNext: number }
}

/** هر ارائه‌دهنده‌ی هوش مصنوعی (محلی یا سرور LLM) این قرارداد را پیاده می‌کند */
export interface AIProvider {
  name: string
  reply(history: AIMessage[], profile: User, ctx?: AIContext): Promise<AIReply>
}
