import type { Role, SubscriptionPlan, RevenueModule } from './types'

export const APP_NAME = 'کی‌فیت'

export const ROLE_META: Record<Role, { label: string; panel: string; icon: string; color: string; desc: string }> = {
  user: { label: 'ورزشکار', panel: '/', icon: '🏃', color: 'from-emerald-400 to-teal-500', desc: 'استفاده از همه‌ی امکانات کی‌فیت' },
  gym: { label: 'باشگاه‌دار', panel: '/panel/gym', icon: '🏋️', color: 'from-orange-400 to-rose-500', desc: 'معرفی باشگاه در فیت‌یاب و پذیرش ورزشکاران' },
  coach: { label: 'مربی', panel: '/panel/coach', icon: '🧑‍🏫', color: 'from-sky-400 to-indigo-500', desc: 'ارائه‌ی برنامه و مشاوره در فیت‌یار' },
  seller: { label: 'فروشنده', panel: '/panel/seller', icon: '🛍️', color: 'from-fuchsia-400 to-purple-600', desc: 'فروش مکمل و لوازم ورزشی در فروشگاه' },
  doctor: { label: 'پزشک', panel: '/panel/doctor', icon: '🩺', color: 'from-cyan-400 to-blue-600', desc: 'ویزیت آنلاین و حضوری ورزشکاران' },
  restaurant: { label: 'رستوران', panel: '/panel/restaurant', icon: '🥗', color: 'from-lime-400 to-green-600', desc: 'فروش غذای رژیمی در بوفه' },
  admin: { label: 'مدیر سامانه', panel: '/panel/admin', icon: '🛡️', color: 'from-slate-500 to-slate-800', desc: 'نظارت بر کل سامانه' },
}

export const MODULE_LABEL: Record<RevenueModule, string> = {
  fityab: 'فیت‌یاب (باشگاه)',
  fityar: 'فیت‌یار (مربی)',
  shop: 'فروشگاه',
  doctor: 'پزشک',
  buffet: 'بوفه',
  challenge: 'چالش‌ها',
}

export const DEFAULT_COMMISSIONS: Record<RevenueModule, number> = {
  fityab: 15,
  fityar: 20,
  shop: 10,
  doctor: 15,
  buffet: 12,
  challenge: 20,
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-silver',
    name: 'نقره‌ای',
    price: 990_000,
    credit: 1_100_000,
    durationDays: 30,
    color: 'from-slate-300 to-slate-500',
    perks: ['۱٬۱۰۰٬۰۰۰ تومان اعتبار ورود به باشگاه‌ها', '۱۰٪ تخفیف بوفه', 'دسترسی به فیت‌یار هوشمند'],
  },
  {
    id: 'plan-gold',
    name: 'طلایی',
    price: 1_890_000,
    credit: 2_300_000,
    durationDays: 30,
    color: 'from-amber-300 to-orange-500',
    popular: true,
    perks: ['۲٬۳۰۰٬۰۰۰ تومان اعتبار ورود', '۱۵٪ تخفیف فروشگاه و بوفه', 'ورود رایگان به یک چالش در ماه', 'نشان طلایی در فیت‌زون'],
  },
  {
    id: 'plan-diamond',
    name: 'الماس',
    price: 4_900_000,
    credit: 6_500_000,
    durationDays: 90,
    color: 'from-cyan-300 to-violet-600',
    perks: ['۶٬۵۰۰٬۰۰۰ تومان اعتبار ورود (۳ ماهه)', 'یک ویزیت پزشک ورزشی رایگان', '۲۰٪ تخفیف همه‌ی ماژول‌ها', 'پشتیبانی VIP'],
  },
]

/** سطح‌بندی بر اساس امتیاز تجربه */
export const LEVELS = [
  { level: 1, title: 'تازه‌کار', xp: 0 },
  { level: 2, title: 'پرانرژی', xp: 200 },
  { level: 3, title: 'ورزشکار', xp: 600 },
  { level: 4, title: 'جنگجو', xp: 1200 },
  { level: 5, title: 'قهرمان', xp: 2500 },
  { level: 6, title: 'اسطوره', xp: 5000 },
]

export const DAILY_MISSIONS = [
  { id: 'water', title: '۸ لیوان آب بنوش', icon: '💧', xp: 20 },
  { id: 'steps', title: '۶٬۰۰۰ قدم راه برو', icon: '👟', xp: 30 },
  { id: 'workout', title: '۲۰ دقیقه تمرین کن', icon: '🔥', xp: 40 },
  { id: 'social', title: 'یک پست در فیت‌زون لایک کن', icon: '❤️', xp: 10 },
  { id: 'ai', title: 'یک سوال از فیت‌یار بپرس', icon: '🤖', xp: 15 },
]

export const STREAK_BONUS_XP = 25

export const GRADIENTS = [
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-fuchsia-500 via-purple-600 to-indigo-700',
  'from-orange-400 via-rose-500 to-pink-600',
  'from-sky-400 via-blue-500 to-indigo-600',
  'from-lime-400 via-green-500 to-emerald-700',
  'from-amber-400 via-orange-500 to-red-600',
  'from-violet-500 via-fuchsia-500 to-rose-500',
  'from-slate-600 via-slate-800 to-black',
]

/** مرکز پیش‌فرض نقشه: تهران */
export const DEFAULT_CENTER: [number, number] = [35.7219, 51.3347]
