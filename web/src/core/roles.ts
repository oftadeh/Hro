/**
 * تفکیک حساب ورزشکار از حساب کسب‌وکار.
 *
 * حساب کسب‌وکار (باشگاه، مربی، فروشنده، پزشک، رستوران، سازمان) فقط پنل ماژول خودش
 * (مدیریت، حسابداری و به‌روزرسانی اطلاعات) به‌علاوه‌ی فیت‌زون و چالش‌ها را دارد و
 * از امکانات مصرف‌کننده (رزرو، خرید، اجاره، بازار، ثبت سلامت و...) استفاده نمی‌کند.
 * مدیر سامانه به همه‌چیز دسترسی دارد.
 *
 * این فایل هم در مرورگر و هم روی سرور استفاده می‌شود و نباید به store وابسته باشد.
 */
import type { Role, User } from './types'

export const BUSINESS_ROLES = ['gym', 'coach', 'seller', 'doctor', 'restaurant', 'company'] as const
export type BusinessRole = (typeof BUSINESS_ROLES)[number]

export const isBusinessRole = (r: Role | string): r is BusinessRole => (BUSINESS_ROLES as readonly string[]).includes(r)

/** حساب کسب‌وکار است؟ (مدیر سامانه هرگز محدود نمی‌شود) */
export function isBusiness(u?: Pick<User, 'roles'> | null): boolean {
  return !!u && !u.roles.includes('admin') && u.roles.some(isBusinessRole)
}

/** نقش اصلی حساب کسب‌وکار (برای ورود مستقیم به پنل) */
export function primaryBusinessRole(u: Pick<User, 'roles'>): BusinessRole | undefined {
  return u.roles.find(isBusinessRole)
}

/* ───────── سرویس‌های مخصوص ورزشکار ───────── */

const CONSUMER_ONLY_PREFIXES = ['health.', 'cycle.', 'device.', 'family.', 'team.', 'insurance.', 'market.', 'ai.']

const CONSUMER_ONLY = new Set([
  // فیت‌یاب: اجاره، ورود، رزرو کلاس، علاقه‌مندی و نظر
  'fityab.rent', 'fityab.checkIn', 'fityab.bookClass', 'fityab.favorite', 'fityab.review', 'fityab.scanEntry',
  // فروشگاه و بوفه
  'shop.addToCart', 'shop.couponPreview', 'shop.checkout', 'shop.review',
  // پزشک و مربی
  'doctor.book', 'coach.bookCall', 'coach.buyPlan', 'coach.review', 'coach.programDay',
  // کلاس آنلاین و رویداد (ثبت‌نام به‌عنوان شرکت‌کننده)
  'live.register', 'event.register', 'event.unregister',
  // کیف پول مصرف‌کننده (اشتراک، هدیه، کد)
  'wallet.buySub', 'wallet.gift', 'wallet.redeem', 'wallet.trial', 'fityab.waitlist', 'fityab.leaveWaitlist',
  // مأموریت‌های روزانه و عضویت سازمانی
  'engagement.log', 'engagement.reward', 'org.join', 'org.leave',
])

/** آیا این سرویس فقط برای حساب ورزشکار است؟ */
export function isConsumerOnlyService(name: string): boolean {
  return CONSUMER_ONLY.has(name) || CONSUMER_ONLY_PREFIXES.some((p) => name.startsWith(p))
}

export const BUSINESS_BLOCKED_MESSAGE = 'این بخش برای حساب‌های کسب‌وکار فعال نیست'

/* ───────── مسیرهای مجاز در اپ برای حساب کسب‌وکار ───────── */

/** بخش‌های اپ که حساب کسب‌وکار می‌تواند ببیند (پنل‌ها جداگانه مدیریت می‌شوند) */
const BUSINESS_SECTIONS = ['/fitzone', '/challenges', '/events', '/notifications', '/messages', '/support', '/profile', '/wallet']
/** فقط صفحه‌ی جزئیات (نه فهرست) — برای پروفایل کاربران، شاگردان مربی و میزبانی کلاس زنده */
const BUSINESS_DETAIL_PREFIXES = ['/u/', '/client/', '/program/', '/live/']

export function isBusinessPathAllowed(path: string): boolean {
  if (path.startsWith('/panel/')) return true
  if (BUSINESS_SECTIONS.some((s) => path === s || path.startsWith(s + '/'))) return true
  return BUSINESS_DETAIL_PREFIXES.some((p) => path.startsWith(p))
}

/* ───────── احراز مدارک کسب‌وکار ───────── */

/** نقش‌هایی که پیش از فعالیت باید مدارک بارگذاری کنند و مدیر تأیید کند */
export const VERIFY_ROLES = ['gym', 'coach', 'doctor', 'seller', 'restaurant'] as const
export type VerifyRole = (typeof VERIFY_ROLES)[number]

/** مدرک یا اطلاعات الزامی هر نقش */
export interface Requirement {
  key: string
  label: string
  hint?: string
}

/** مدارک الزامی هر نقش؛ هر کدام جداگانه بارگذاری می‌شود */
export const REQUIRED_DOCS: Record<VerifyRole, Requirement[]> = {
  gym: [
    { key: 'license', label: 'پروانه‌ی بهره‌برداری یا مجوز هیئت ورزشی', hint: 'به نام مالک یا مدیر مجموعه' },
    { key: 'nationalCard', label: 'کارت ملی مالک یا مدیر' },
  ],
  coach: [
    { key: 'certificate', label: 'کارت یا مدرک مربیگری فدراسیون' },
    { key: 'nationalCard', label: 'کارت ملی' },
  ],
  doctor: [
    { key: 'license', label: 'پروانه‌ی نظام پزشکی یا مجوز فعالیت درمانی' },
    { key: 'nationalCard', label: 'کارت ملی' },
  ],
  seller: [
    { key: 'license', label: 'جواز کسب یا مجوز فروش' },
    { key: 'nationalCard', label: 'کارت ملی' },
  ],
  restaurant: [
    { key: 'license', label: 'جواز کسب و پروانه‌ی بهداشت' },
    { key: 'nationalCard', label: 'کارت ملی' },
  ],
}

/** اطلاعات الزامی هر نقش (کد ملی برای همه + شماره‌ی مجوز) */
export const REQUIRED_FIELDS: Record<VerifyRole, Requirement[]> = {
  gym: [{ key: 'nationalId', label: 'کد ملی مالک یا مدیر' }, { key: 'licenseNo', label: 'شماره‌ی پروانه یا مجوز' }],
  coach: [{ key: 'nationalId', label: 'کد ملی' }, { key: 'licenseNo', label: 'شماره‌ی کارت مربیگری' }],
  doctor: [{ key: 'nationalId', label: 'کد ملی' }, { key: 'licenseNo', label: 'کد نظام پزشکی یا شماره‌ی مجوز' }],
  seller: [{ key: 'nationalId', label: 'کد ملی' }, { key: 'licenseNo', label: 'شماره‌ی جواز کسب یا شناسه‌ی ملی' }],
  restaurant: [{ key: 'nationalId', label: 'کد ملی' }, { key: 'licenseNo', label: 'شماره‌ی جواز کسب یا پروانه‌ی بهداشت' }],
}

/** مدارک و اطلاعات الزامی یک حساب (اجتماع نقش‌هایش) */
export function requirementsOf(roles: readonly string[]) {
  const vr = roles.filter((r): r is VerifyRole => (VERIFY_ROLES as readonly string[]).includes(r))
  const uniq = (list: Requirement[]) => list.filter((x, i) => list.findIndex((y) => y.key === x.key) === i)
  return { docs: uniq(vr.flatMap((r) => REQUIRED_DOCS[r])), fields: uniq(vr.flatMap((r) => REQUIRED_FIELDS[r])) }
}

/** کد ملی ایران با رقم کنترل */
export function isNationalId(v: string) {
  const s = String(v ?? '').replace(/\D/g, '')
  if (!/^\d{10}$/.test(s) || /^(\d)\1{9}$/.test(s)) return false
  const sum = [...s.slice(0, 9)].reduce((a, c, i) => a + Number(c) * (10 - i), 0) % 11
  const check = Number(s[9])
  return sum < 2 ? check === sum : check === 11 - sum
}

/** این حساب پیش از فعالیت نیاز به تأیید مدارک دارد؟ */
export function needsVerification(u?: Pick<User, 'roles'> | null): boolean {
  return !!u && !u.roles.includes('admin') && u.roles.some((r) => (VERIFY_ROLES as readonly string[]).includes(r))
}

/** مدارک تأیید شده است؟ (حساب‌های قدیمی بدون پرونده‌ی مدارک، تأییدشده حساب می‌شوند) */
export function isVerified(u?: Pick<User, 'roles' | 'verification'> | null): boolean {
  if (!u || !needsVerification(u)) return true
  return !u.verification || u.verification.status === 'approved'
}

/** ارائه‌دهنده‌ای که خدمات و کالایش قابل نمایش و خرید است: مسدود نیست و مدارکش تأیید شده */
export function isProviderActive(u?: Pick<User, 'roles' | 'verification' | 'blocked'> | null): boolean {
  return !!u && !u.blocked && isVerified(u)
}

/** کارهای تجاری بدون محدودیت نقش که تا تأیید مدارک بسته‌اند */
const VERIFIED_ONLY = new Set(['shop.setStatus', 'review.reply', 'wallet.withdraw', 'fityab.answerRequest', 'event.update', 'event.cancel', 'event.checkIn', 'event.results'])

export const UNVERIFIED_MESSAGE = 'حساب شما هنوز تأیید نشده است؛ پس از بررسی مدارک توسط کی‌فیت فعال می‌شود'

/** آیا این سرویس برای حساب کسب‌وکارِ تأییدنشده بسته است؟ */
export function blockedUntilVerified(name: string, roles?: readonly Role[]): boolean {
  if (VERIFIED_ONLY.has(name)) return true
  return !!roles?.some((r) => (VERIFY_ROLES as readonly string[]).includes(r))
}
