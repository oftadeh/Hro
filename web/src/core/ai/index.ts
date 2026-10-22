import type { AIProvider } from './types'
import { localExpert } from './localExpert'

/**
 * اگر VITE_AI_API_URL تنظیم شده باشد، گفتگو به سرور (که به یک مدل زبانی
 * متصل است) فرستاده می‌شود؛ در غیر این صورت یا هنگام خطا، مشاور آفلاین پاسخ می‌دهد.
 * قرارداد سرور: POST { messages, profile } { text, suggestions? }
 */
const API_URL = import.meta.env.VITE_AI_API_URL as string | undefined

const httpProvider: AIProvider = {
  name: 'http',
  async reply(history, profile, ctx) {
    const res = await fetch(API_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history,
        profile: { name: profile.name, gender: profile.gender, heightCm: profile.heightCm, weightKg: profile.weightKg, birthYear: profile.birthYear, goal: profile.goal },
        context: ctx,
      }),
    })
    if (!res.ok) throw new Error(`AI ${res.status}`)
    return res.json()
  },
}

export const ai: AIProvider = API_URL
  ? {
      name: 'http',
      async reply(history, profile, ctx) {
        try {
          return await httpProvider.reply(history, profile, ctx)
        } catch {
          return localExpert.reply(history, profile, ctx)
        }
      },
    }
  : localExpert

export * from './types'
