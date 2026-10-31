import { AppError, mutate, db, currentUserId, svc } from '../store'
import { uid, now } from '../id'
import type { Role, User } from '../types'
import type { DBState } from '../state'
import { levelOf } from './engagement'
import { hasBadge } from './perks'
import { notify } from './ledger'
import { faDigitsToEn } from '../format'
import { ROLE_META, cleanCity } from '../config'
import { TERMS_VERSION } from '../legal'
import { setupCycleFor } from './cycle'
import { type BusinessRole, isBusiness, isBusinessRole, isNationalId, needsVerification, requirementsOf } from '../roles'

export function normalizePhone(raw: string) {
  const p = faDigitsToEn(raw).replace(/\D/g, '').replace(/^98/, '0')
  return p.startsWith('9') ? `0${p}` : p
}

export const isValidPhone = (phone: string) => /^09\d{9}$/.test(phone)

export const normalizeEmail = (raw: string) => faDigitsToEn(String(raw ?? '')).trim().toLowerCase()

export const isValidEmail = (email: string) => email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)

/** شماره‌ای که می‌شود به آن هدیه، انتقال یا درخواست ورود فرستاد (فقط شماره‌ی تأییدشده) */
export const findByVerifiedPhone = (users: User[], phone: string) => users.find((u) => u.phone === phone && u.phoneVerified !== false)

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
  /** اگر پر باشد، حساب کسب‌وکار از این نوع ساخته می‌شود (به‌جای حساب ورزشکار) */
  accountType?: BusinessRole
  /** فقط در ثبت‌نام با ایمیل: شماره‌ی موبایل (هنوز تأییدنشده) */
  phone?: string
  /** شهر محل زندگی یا فعالیت (الزامی) */
  city?: string
  /** پذیرش قوانین و حریم خصوصی (الزامی) */
  acceptTerms?: boolean
}

/** ورود با ایمیل: ایمیل تأییدشده و شماره‌ای که هنوز با پیامک تأیید نشده */
export interface IdentityExtra {
  email?: string
  phoneVerified?: boolean
}

/** ساخت پروفایل اولیه‌ی ماژول برای نقش کسب‌وکار */
function initRoleProfile(d: DBState, userId: string, role: BusinessRole) {
  if (role === 'coach' && !d.coaches.find((c) => c.userId === userId))
    d.coaches.push({ userId, title: 'مربی', specialties: [], experienceYears: 1, bio: '', rating: 5, students: 0, online: true, callPrice: 100_000, plans: [], certificates: [] })
  if (role === 'doctor' && !d.doctors.find((x) => x.userId === userId))
    d.doctors.push({ userId, specialty: 'پزشک عمومی', medicalCode: '', bio: '', visitPrice: 200_000, rating: 5, visits: 0, slots: [], online: true })
}

/** ساخت کاربر جدید پس از تأیید شماره؛ هم در حالت نمایشی و هم روی سرور استفاده می‌شود */
export function createUser(phone: string, input: ProfileInput, extra: IdentityExtra = {}): User {
  if (!isValidPhone(phone)) throw new AppError('شماره موبایل معتبر نیست')
  // ثبت‌نام با ایمیل: شماره نباید تکراری باشد. ثبت‌نام با پیامک: فقط شماره‌ی تأییدشده‌ی دیگران مانع است
  const clash = db().users.find((u) => u.phone === phone)
  if (clash && (extra.phoneVerified === false || clash.phoneVerified !== false)) throw new AppError('این شماره قبلاً ثبت‌نام کرده است؛ با همان حساب وارد شوید یا به پشتیبانی پیام دهید')
  if (extra.email && db().users.some((u) => u.email === extra.email)) throw new AppError('با این ایمیل قبلاً حساب ساخته شده است')
  if (input.acceptTerms !== true) throw new AppError('برای ساخت حساب، قوانین و حریم خصوصی کی‌فیت را بپذیرید')
  const business = input.accountType
  if (business !== undefined && !isBusinessRole(business)) throw new AppError('نوع حساب معتبر نیست')
  const name = String(input.name ?? '').trim()
  if (name.length < 2) throw new AppError(business ? 'نام کسب‌وکار را وارد کنید' : 'نام و نام خانوادگی را وارد کنید')
  const city = cleanCity(input.city)
  if (city.length < 2) throw new AppError(business ? 'شهر محل فعالیت را وارد کنید' : 'شهر محل زندگی را وارد کنید')
  if (business) return createBusinessUser(phone, name, business, extra, city)
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
    ...identity(extra),
    city,
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

const identity = (extra: IdentityExtra): Partial<User> => ({
  termsAcceptedAt: now(),
  termsVersion: TERMS_VERSION,
  ...(extra.email ? { email: extra.email } : {}),
  ...(extra.phoneVerified === false ? { phoneVerified: false } : {}),
})

/** حساب کسب‌وکار: فقط پنل ماژول خودش + فیت‌زون و چالش‌ها */
function createBusinessUser(phone: string, name: string, role: BusinessRole, extra: IdentityExtra, city: string): User {
  const id = uid('u-')
  const created: User = {
    id,
    referralCode: id.slice(-5).toUpperCase() + Math.floor(10 + Math.random() * 90),
    name,
    phone,
    ...identity(extra),
    city,
    privacy: { publicProfile: true, showBody: false },
    roles: [role],
    xp: 0,
    streak: 0,
    following: [],
    createdAt: now(),
  }
  // باشگاه، مربی، پزشک و فروشنده پیش از فعالیت باید مدارک بفرستند
  if (needsVerification(created)) created.verification = { status: 'none', docs: [] }
  mutate((d) => {
    d.users.push(created)
    d.wallets[created.id] = 0
    initRoleProfile(d, id, role)
    notify(
      d, id, `پنل ${ROLE_META[role].label} شما ساخته شد`,
      created.verification ? 'برای فعال شدن، مدارک خود را از پنل بارگذاری کنید تا کی‌فیت بررسی کند.' : 'اطلاعات مجموعه را از پنل تکمیل کنید تا به کاربران نمایش داده شود.',
      ROLE_META[role].icon, ROLE_META[role].panel,
    )
  })
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
  if (!isBusinessRole(role)) throw new AppError('نقش معتبر نیست')
  const current = db().users.find((x) => x.id === me)!
  // حساب ورزشکار و کسب‌وکار جدا هستند؛ فقط حساب کسب‌وکار می‌تواند نقش تجاری دیگری اضافه کند
  if (!isBusiness(current) && !current.roles.includes('admin'))
    throw new AppError('برای فعالیت تجاری، یک حساب کسب‌وکار جدا با شماره‌ی دیگر بسازید')
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    if (!u.roles.includes(role)) u.roles.push(role)
    initRoleProfile(d, me, role)
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

/** چه کسی می‌تواند ویدیوی معرفی بگذارد: مربی، باشگاه‌دار، پزشک، کاربران برتر (سطح ۴ به بالا) و دارندگان اشتراک ویژه */
export function canHaveIntroVideo(u: User, s: Pick<DBState, 'subscriptions'> = db()) {
  if (u.roles.some((r) => r === 'coach' || r === 'gym' || r === 'doctor' || r === 'admin')) return true
  if (levelOf(u.xp).level >= 4) return true
  return hasBadge(u.id, s)
}

export const setIntroVideo = svc('auth.introVideo', (url: string | null) => {
  const me = currentUserId()
  const u = db().users.find((x) => x.id === me)!
  if (url !== null) {
    if (!canHaveIntroVideo(u)) throw new AppError('ویدیوی معرفی برای مربیان، باشگاه‌داران، کاربران سطح ۴ به بالا و اشتراک‌های طلایی و الماس فعال است')
    const ok = /^\/uploads\/[\w-]+\.(mp4|webm|mov)$/.test(url) || /^https:\/\/[^\s]+$/.test(url) || url.startsWith('data:video/')
    if (!ok) throw new AppError('نشانی ویدیو معتبر نیست')
    if (url.length > 6_000_000) throw new AppError('حجم ویدیو زیاد است')
  }
  mutate((d) => {
    d.users.find((x) => x.id === me)!.introVideo = url ?? undefined
  })
})

/** ارسال مدارک حساب کسب‌وکار برای بررسی مدیر (فایل‌ها پیش‌تر در /api/upload-doc بارگذاری شده‌اند) */
/** ارسال مدارک کسب‌وکار: هر مدرک الزامی در جای خودش + کد ملی و شماره‌ی مجوز + تعهد صحت اطلاعات */
export const submitVerification = svc('auth.submitVerification', (slots: Record<string, string>, fields: Record<string, string>, note?: string, declared?: boolean) => {
  const me = currentUserId()
  const u = db().users.find((x) => x.id === me)!
  if (!needsVerification(u)) throw new AppError('این حساب نیازی به ارسال مدارک ندارد')
  const st = u.verification?.status
  if (st === 'approved') throw new AppError('مدارک شما قبلاً تأیید شده است')
  if (st === 'pending') throw new AppError('مدارک شما در حال بررسی است')
  if (st === 'rejected') throw new AppError('درخواست شما رد شده است؛ برای بررسی دوباره با پشتیبانی تماس بگیرید')
  if (declared !== true) throw new AppError('تعهد صحت اطلاعات و مدارک را تأیید کنید')
  const req = requirementsOf(u.roles)
  const own = `doc-${me.replace(/[^A-Za-z0-9]/g, '')}-`
  const okRef = (x: unknown) => typeof x === 'string' && /^doc-[A-Za-z0-9-]+\.(jpg|png|webp|pdf)$/.test(x) && x.startsWith(own)
  const cleanSlots: Record<string, string> = {}
  for (const r of req.docs) {
    const ref = slots?.[r.key]
    if (!okRef(ref)) throw new AppError(`«${r.label}» را بارگذاری کنید`)
    cleanSlots[r.key] = ref as string
  }
  if (new Set(Object.values(cleanSlots)).size < Object.keys(cleanSlots).length) throw new AppError('برای هر مدرک فایل جداگانه بارگذاری کنید')
  const cleanFields: Record<string, string> = {}
  for (const r of req.fields) {
    const v = faDigitsToEn(String(fields?.[r.key] ?? '')).trim().slice(0, 40)
    if (r.key === 'nationalId') {
      if (!isNationalId(v)) throw new AppError('کد ملی معتبر نیست')
      cleanFields[r.key] = v.replace(/\D/g, '')
    } else {
      if (v.length < 4) throw new AppError(`«${r.label}» را وارد کنید`)
      cleanFields[r.key] = v
    }
  }
  mutate((d) => {
    const x = d.users.find((v) => v.id === me)!
    x.verification = { status: 'pending', docs: Object.values(cleanSlots), slots: cleanSlots, fields: cleanFields, note: note?.trim().slice(0, 500) || undefined, submittedAt: now() }
    d.users.filter((a) => a.roles.includes('admin')).forEach((a) => notify(d, a.id, st === 'changes' ? 'مدارک اصلاح‌شده برای بررسی' : 'مدارک جدید برای بررسی', `${x.name} مدارک خود را فرستاد.`, '', '/panel/admin/approvals'))
  })
})
