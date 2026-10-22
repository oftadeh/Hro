/** برچسب‌ها و محاسبات مشترک پروفایل بدنی */
import { dayKey } from './format'
import type { User } from './types'

export const GOALS: Record<NonNullable<User['goal']>, string> = { lose: 'کاهش وزن', fit: 'تناسب اندام', gain: 'افزایش حجم' }
export const ACTIVITY: Record<NonNullable<User['activityLevel']>, string> = { low: 'کم‌تحرک', medium: 'فعال', high: 'خیلی فعال' }

export const daysAgoKey = (n: number) => dayKey(new Date(Date.now() - n * 86_400_000))

/** سال جاری شمسی */
export const jalaliYear = () => Number(new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric' }).format(new Date()).replace(/\D/g, ''))

export function bodyOf(u: User) {
  const bmi = u.heightCm && u.weightKg ? u.weightKg / (u.heightCm / 100) ** 2 : undefined
  const age = u.birthYear ? jalaliYear() - u.birthYear : undefined
  const bmiLabel = bmi === undefined ? undefined : bmi < 18.5 ? 'کم‌وزن' : bmi < 25 ? 'نرمال' : bmi < 30 ? 'اضافه‌وزن' : 'چاقی'
  const ideal = u.heightCm ? [18.5 * (u.heightCm / 100) ** 2, 24.9 * (u.heightCm / 100) ** 2] : undefined
  return { bmi, bmiLabel, age, ideal }
}

/** درصد تکمیل پروفایل و موارد باقی‌مانده */
export function completeness(u: User) {
  const items: [boolean, string][] = [
    [!!u.avatar, 'تصویر پروفایل'],
    [!!u.bio, 'درباره‌ی من'],
    [!!u.gender, 'جنسیت'],
    [!!u.birthYear, 'سال تولد'],
    [!!u.heightCm, 'قد'],
    [!!u.weightKg, 'وزن'],
    [!!u.goal, 'هدف'],
    [!!u.activityLevel, 'سطح فعالیت'],
    [!!u.health, 'اطلاعات سلامت'],
  ]
  return { pct: items.filter((i) => i[0]).length / items.length, missing: items.filter((i) => !i[0]).map((i) => i[1]) }
}
