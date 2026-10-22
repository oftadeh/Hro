import type { AIProvider } from './types'
import { localExpert } from './localExpert'

/**
 * ارائه‌دهنده‌ی فعال هوش مصنوعی. در مرورگر (حالت نمایشی) مشاور قاعده‌محور محلی است؛
 * روی سرور در صورت تنظیم کلید API، مدل زبانی جایگزین می‌شود و در صورت خطا به مشاور محلی برمی‌گردد.
 */
let provider: AIProvider = localExpert

export const setAI = (p: AIProvider) => {
  provider = p
}
export const getAI = () => provider

export * from './types'
