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
  week?: WeekStats
}

/** خلاصه‌ی ۷ روز اخیر کاربر */
export interface WeekStats {
  scores: number[]
  avgScore: number
  sessions: number
  minutes: number
  avgSteps: number
  avgWater: number
  avgSleep: number
  avgKcal: number
  weightChange?: number
}

/** هر ارائه‌دهنده‌ی هوش مصنوعی (محلی یا سرور LLM) این قرارداد را پیاده می‌کند */
export interface AIProvider {
  name: string
  reply(history: AIMessage[], profile: User, ctx?: AIContext): Promise<AIReply>
  /** مرور هفتگی و پیشنهاد تنظیم برنامه */
  weekly(profile: User, week: WeekStats): Promise<AIReply>
  /** تشخیص غذا و کالری از روی عکس (فقط ارائه‌دهنده‌های دارای بینایی) */
  foodPhoto?(imageDataUrl: string): Promise<{ name: string; kcal: number; protein: number; carbs: number; fat: number }>
}
