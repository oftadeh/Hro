import type { InsurancePlan, Role, SubscriptionPlan, RevenueModule, VenueKind } from './types'

export const APP_NAME = 'کی‌فیت'

export const ROLE_META: Record<Role, { label: string; panel: string; icon: string; color: string; desc: string }> = {
  user: { label: 'ورزشکار', panel: '/', icon: '', color: 'from-brand-400 to-ink-800', desc: 'استفاده از همه‌ی امکانات کی‌فیت' },
  gym: { label: 'باشگاه‌دار', panel: '/panel/gym', icon: '', color: 'from-ink-700 to-ink-800', desc: 'معرفی باشگاه در فیت‌یاب و پذیرش ورزشکاران' },
  coach: { label: 'مربی', panel: '/panel/coach', icon: '', color: 'from-ink-700 to-ink-800', desc: 'ارائه‌ی برنامه و مشاوره در فیت‌یار' },
  seller: { label: 'فروشنده', panel: '/panel/seller', icon: '', color: 'from-ink-700 to-ink-900', desc: 'فروش مکمل و لوازم ورزشی در فروشگاه' },
  doctor: { label: 'پزشک', panel: '/panel/doctor', icon: '', color: 'from-ink-700 to-ink-900', desc: 'ویزیت آنلاین و حضوری ورزشکاران' },
  restaurant: { label: 'رستوران', panel: '/panel/restaurant', icon: '', color: 'from-ink-700 to-ink-900', desc: 'فروش غذای رژیمی در بوفه' },
  company: { label: 'سازمان', panel: '/panel/company', icon: '', color: 'from-ink-700 to-ink-900', desc: 'اشتراک سلامت گروهی برای کارکنان' },
  admin: { label: 'مدیر سامانه', panel: '/panel/admin', icon: '', color: 'from-ink-800 to-ink-900', desc: 'نظارت بر کل سامانه' },
}

export const MODULE_LABEL: Record<RevenueModule, string> = {
  fityab: 'فیت‌یاب (باشگاه)',
  fityar: 'فیت‌یار (مربی)',
  shop: 'فروشگاه',
  doctor: 'پزشک',
  buffet: 'بوفه',
  challenge: 'چالش‌ها',
  insurance: 'بیمه‌ی ورزشی',
}

export const DEFAULT_COMMISSIONS: Record<RevenueModule, number> = {
  fityab: 15,
  fityar: 20,
  shop: 10,
  doctor: 15,
  buffet: 12,
  challenge: 20,
  insurance: 10,
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-silver',
    name: 'نقره‌ای',
    price: 990_000,
    credit: 1_100_000,
    durationDays: 30,
    color: 'from-ink-700 to-ink-800',
    perks: ['۱٬۱۰۰٬۰۰۰ تومان اعتبار ورود به باشگاه‌ها', '۱۰٪ تخفیف بوفه', '۵٪ تخفیف فروشگاه'],
    benefits: { discounts: { buffet: 10, shop: 5 }, freeChallengeEntries: 0, freeDoctorVisits: 0, badge: false },
  },
  {
    id: 'plan-gold',
    name: 'طلایی',
    price: 1_890_000,
    credit: 2_300_000,
    durationDays: 30,
    color: 'from-ink-700 to-ink-800',
    popular: true,
    perks: ['۲٬۳۰۰٬۰۰۰ تومان اعتبار ورود', '۱۵٪ تخفیف فروشگاه و بوفه', 'ورود رایگان به یک چالش در هر دوره', 'نشان ویژه در فیت‌زون'],
    benefits: { discounts: { buffet: 15, shop: 15 }, freeChallengeEntries: 1, freeDoctorVisits: 0, badge: true },
  },
  {
    id: 'plan-diamond',
    name: 'الماس',
    price: 4_900_000,
    credit: 6_500_000,
    durationDays: 90,
    color: 'from-ink-700 to-ink-900',
    perks: ['۶٬۵۰۰٬۰۰۰ تومان اعتبار ورود (۳ ماهه)', 'یک ویزیت پزشک رایگان', '۲۰٪ تخفیف فروشگاه، بوفه، مربی و پزشک', 'ورود رایگان به دو چالش', 'نشان ویژه در فیت‌زون'],
    benefits: { discounts: { buffet: 20, shop: 20, fityar: 20, doctor: 20 }, freeChallengeEntries: 2, freeDoctorVisits: 1, badge: true },
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
  { id: 'water', title: '۸ لیوان آب بنوش', icon: '', xp: 20 },
  { id: 'steps', title: '۶٬۰۰۰ قدم راه برو', icon: '', xp: 30 },
  { id: 'workout', title: '۲۰ دقیقه تمرین کن', icon: '', xp: 40 },
  { id: 'social', title: 'یک پست در فیت‌زون لایک کن', icon: '', xp: 10 },
  { id: 'ai', title: 'یک سوال از فیت‌یار بپرس', icon: '', xp: 15 },
]

export const STREAK_BONUS_XP = 25

export const GRADIENTS = [
  'from-brand-400 via-ink-800 to-ink-900',
  'from-ink-800 via-ink-900 to-ink-900',
  'from-ink-700 via-ink-800 to-ink-900',
  'from-ink-700 via-ink-800 to-ink-900',
  'from-ink-700 via-ink-800 to-brand-700',
  'from-ink-700 via-ink-800 to-ink-900',
  'from-ink-800 via-ink-800 to-ink-800',
  'from-ink-900 via-ink-900 to-black',
]

/** مرکز پیش‌فرض نقشه: تهران */
export const DEFAULT_CENTER: [number, number] = [35.7219, 51.3347]

/** انواع مجموعه‌های ورزشی فیت‌یاب؛ با پیشرفت فازها، مدیر انواع جدید را فعال می‌کند */
export const VENUE_KINDS: Record<VenueKind, { label: string; plural: string; booking: 'session' | 'rental'; desc: string }> = {
  gym: { label: 'باشگاه', plural: 'باشگاه‌ها', booking: 'session', desc: 'ورود با سانس آزاد یا کلاس گروهی' },
  pool: { label: 'استخر', plural: 'استخرها', booking: 'session', desc: 'سانس شنا و کلاس آموزش' },
  equestrian: { label: 'سوارکاری', plural: 'باشگاه‌های سوارکاری', booking: 'session', desc: 'جلسه‌ی آموزش و سواری با مربی' },
  hall: { label: 'سالن ورزشی', plural: 'سالن‌های ورزشی', booking: 'rental', desc: 'اجاره‌ی ساعتی سالن برای فوتسال، والیبال، بسکتبال' },
  turf: { label: 'چمن مصنوعی', plural: 'زمین‌های چمن', booking: 'rental', desc: 'اجاره‌ی ساعتی زمین فوتبال' },
}

/** پلن‌های پیش‌فرض بیمه‌ی ورزشی (با همکاری بیمه‌گر طرف قرارداد) */
export const DEFAULT_INSURANCE_PLANS: InsurancePlan[] = [
  {
    id: 'ins-basic', name: 'پایه', provider: 'بیمه‌گر طرف قرارداد', price: 390_000, medicalCover: 50_000_000, accidentCover: 200_000_000, deductiblePct: 20,
    sports: ['بدنسازی', 'فیتنس', 'یوگا', 'پیلاتس', 'دویدن', 'شنا'], perks: ['هزینه‌ی درمان حادثه‌ی ورزشی تا ۵۰ میلیون', 'غرامت نقص عضو تا ۲۰۰ میلیون', 'پرداخت خسارت در کیف پول کی‌فیت'], active: true,
  },
  {
    id: 'ins-pro', name: 'حرفه‌ای', provider: 'بیمه‌گر طرف قرارداد', price: 890_000, medicalCover: 150_000_000, accidentCover: 500_000_000, deductiblePct: 10,
    sports: ['همه‌ی رشته‌های فیت‌یاب', 'کراس‌فیت', 'رزمی', 'فوتبال', 'سوارکاری'], perks: ['هزینه‌ی درمان تا ۱۵۰ میلیون', 'فیزیوتراپی تا ۱۰ جلسه', 'غرامت نقص عضو تا ۵۰۰ میلیون', 'فرانشیز ۱۰٪'], active: true,
  },
]
