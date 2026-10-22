import { AppError, mutate, db, currentUserId, svc } from '../store'
import { uid, now } from '../id'
import type { Role, User } from '../types'
import { notify } from './ledger'
import { faDigitsToEn } from '../format'
import { ROLE_META } from '../config'
import { setupCycleFor } from './cycle'

export function normalizePhone(raw: string) {
  const p = faDigitsToEn(raw).replace(/\D/g, '').replace(/^98/, '0')
  return p.startsWith('9') ? `0${p}` : p
}

export const isValidPhone = (phone: string) => /^09\d{9}$/.test(phone)

export interface ProfileInput {
  name: string
  gender: 'male' | 'female' | ''
  birthYear?: number
  heightCm?: number
  weightKg?: number
  goal?: User['goal']
  activityLevel?: User['activityLevel']
  cycle?: { lastPeriodStart: string; cycleLength: number; periodLength: number }
  /** کد معرفی دوست (اختیاری) */
  referral?: string
}

/** ساخت کاربر جدید پس از تأیید شماره؛ هم در حالت نمایشی و هم روی سرور استفاده می‌شود */
export function createUser(phone: string, input: ProfileInput): User {
  if (!isValidPhone(phone)) throw new AppError('شماره موبایل معتبر نیست')
  if (db().users.some((u) => u.phone === phone)) throw new AppError('این شماره قبلاً ثبت‌نام کرده است')
  const name = input.name.trim()
  if (name.length < 2) throw new AppError('نام و نام خانوادگی را وارد کنید')
  if (input.gender !== 'male' && input.gender !== 'female') throw new AppError('لطفاً جنسیت خود را انتخاب کنید')
  if (input.birthYear && (input.birthYear < 1300 || input.birthYear > 1400)) throw new AppError('سال تولد معتبر نیست')
  if (input.heightCm && (input.heightCm < 100 || input.heightCm > 230)) throw new AppError('قد معتبر نیست')
  if (input.weightKg && (input.weightKg < 30 || input.weightKg > 250)) throw new AppError('وزن معتبر نیست')
  const ref = input.referral?.trim().toUpperCase()
  const referrer = ref ? db().users.find((u) => u.referralCode === ref) : undefined
  if (ref && !referrer) throw new AppError('کد معرفی معتبر نیست')
  const id = uid('u-')
  const created: User = {
    id,
    referralCode: id.slice(-5).toUpperCase() + Math.floor(10 + Math.random() * 90),
    referredBy: referrer?.id,
    name,
    phone,
    city: 'تهران',
    gender: input.gender,
    birthYear: input.birthYear || undefined,
    heightCm: input.heightCm || undefined,
    weightKg: input.weightKg || undefined,
    goal: input.goal || undefined,
    activityLevel: input.activityLevel,
    privacy: { publicProfile: true, showBody: false },
    roles: ['user'],
    xp: 0,
    streak: 0,
    following: [],
    createdAt: now(),
  }
  mutate((d) => {
    d.users.push(created)
    d.wallets[created.id] = 0
    notify(d, created.id, 'به کی‌فیت خوش اومدی!', 'با خرید اشتراک بدون ثبت‌نام وارد باشگاه‌ها شو.', '', '/wallet')
  })
  if (input.gender === 'female' && input.cycle?.lastPeriodStart) {
    try {
      setupCycleFor(created.id, input.cycle)
    } catch {
      /* ردیاب اختیاری است؛ بعداً از پروفایل قابل تنظیم است */
    }
  }
  return created
}

/** کنترل پیش از ورود */
export function assertCanLogin(userId: string) {
  const u = db().users.find((x) => x.id === userId)
  if (!u) throw new AppError('کاربر یافت نشد')
  if (u.blocked) throw new AppError('حساب کاربری شما مسدود شده است')
  return u
}

/** فعال‌سازی نقش جدید (مربی، باشگاه‌دار و...) برای کاربر فعلی */
export const activateRole = svc('auth.activateRole', (role: Exclude<Role, 'admin' | 'user'>) => {
  const me = currentUserId()
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    if (!u.roles.includes(role)) u.roles.push(role)
    if (role === 'coach' && !d.coaches.find((c) => c.userId === me))
      d.coaches.push({ userId: me, title: 'مربی', specialties: [], experienceYears: 1, bio: '', rating: 5, students: 0, online: true, callPrice: 100_000, plans: [], certificates: [] })
    if (role === 'doctor' && !d.doctors.find((x) => x.userId === me))
      d.doctors.push({ userId: me, specialty: 'پزشک عمومی', medicalCode: '', bio: '', visitPrice: 200_000, rating: 5, visits: 0, slots: [], online: true })
    notify(d, me, `پنل ${ROLE_META[role].label} فعال شد`, 'از منوی پروفایل وارد پنل شوید و اطلاعات خود را تکمیل کنید.', ROLE_META[role].icon, ROLE_META[role].panel)
  })
})

const PROFILE_FIELDS = ['name', 'bio', 'avatar', 'city', 'gender', 'heightCm', 'weightKg', 'birthYear', 'goal', 'activityLevel', 'health', 'privacy', 'addresses', 'reminders', 'healthShares'] as const

export const updateProfile = svc('auth.updateProfile', (input: Partial<User>) => {
  const me = currentUserId()
  if (input.name !== undefined && input.name.trim().length < 2) throw new AppError('نام را وارد کنید')
  if (input.heightCm && (input.heightCm < 100 || input.heightCm > 230)) throw new AppError('قد معتبر نیست')
  if (input.weightKg && (input.weightKg < 30 || input.weightKg > 250)) throw new AppError('وزن معتبر نیست')
  if (input.birthYear && (input.birthYear < 1300 || input.birthYear > 1400)) throw new AppError('سال تولد معتبر نیست')
  if (input.bio && input.bio.length > 300) throw new AppError('متن معرفی حداکثر ۳۰۰ کاراکتر است')
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)! as unknown as Record<string, unknown>
    // فقط فیلدهای مجاز قابل تغییرند (نقش، امتیاز، شماره و... از این مسیر تغییر نمی‌کنند)
    for (const k of PROFILE_FIELDS) if (k in input) u[k] = (input as Record<string, unknown>)[k]
  })
})
