import type { CareKind, GymTier, InsurancePlan, Role, SubscriptionPlan, RevenueModule, VenueKind } from './types'

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
  event: 'رویدادها',
  market: 'بازار دست‌دوم',
}

export const DEFAULT_COMMISSIONS: Record<RevenueModule, number> = {
  fityab: 15,
  fityar: 20,
  shop: 10,
  doctor: 15,
  buffet: 12,
  challenge: 20,
  insurance: 10,
  event: 10,
  market: 5,
}

/** سطح باشگاه‌ها: از روی قیمت سانس و سقف‌هایی که مدیر تعیین می‌کند */
export const GYM_TIERS: Record<GymTier, { label: string; desc: string }> = {
  standard: { label: 'استاندارد', desc: 'باشگاه‌های محله و سانس‌های اقتصادی' },
  premium: { label: 'ویژه', desc: 'باشگاه‌های مجهز با امکانات بیشتر' },
  elite: { label: 'لوکس', desc: 'مجموعه‌های لوکس و گران‌قیمت' },
}
export const DEFAULT_TIER_CAPS = { standard: 150_000, premium: 300_000 }
/** دوره‌ی آزمایشی فقط سطح استاندارد را پوشش می‌دهد */
export const TRIAL_TIERS: GymTier[] = ['standard']

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-silver',
    name: 'نقره‌ای',
    price: 990_000,
    credit: 1_100_000,
    durationDays: 30,
    color: 'from-ink-700 to-ink-800',
    tiers: ['standard'],
    perks: ['۱٬۱۰۰٬۰۰۰ تومان اعتبار ورود به باشگاه‌ها', 'باشگاه‌های سطح استاندارد', '۱۰٪ تخفیف بوفه', '۵٪ تخفیف فروشگاه'],
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
    tiers: ['standard', 'premium'],
    perks: ['۲٬۳۰۰٬۰۰۰ تومان اعتبار ورود', 'باشگاه‌های استاندارد و ویژه', '۱۵٪ تخفیف فروشگاه و بوفه', 'ورود رایگان به یک چالش در هر دوره', 'نشان ویژه در فیت‌زون'],
    benefits: { discounts: { buffet: 15, shop: 15 }, freeChallengeEntries: 1, freeDoctorVisits: 0, badge: true },
  },
  {
    id: 'plan-diamond',
    name: 'الماس',
    price: 4_900_000,
    credit: 6_500_000,
    durationDays: 90,
    color: 'from-ink-700 to-ink-900',
    tiers: ['standard', 'premium', 'elite'],
    perks: ['۶٬۵۰۰٬۰۰۰ تومان اعتبار ورود (۳ ماهه)', 'همه‌ی سطح‌ها، حتی باشگاه‌های لوکس', 'یک ویزیت پزشک رایگان', '۲۰٪ تخفیف فروشگاه، بوفه، مربی و پزشک', 'ورود رایگان به دو چالش', 'نشان ویژه در فیت‌زون'],
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

/** رنگ کارت‌ها (پست‌ها و استوری‌های متنی، دسته‌ها) — کلاس‌های card-* در index.css */
export const CARD_TONES = ['violet', 'pink', 'lilac', 'mint', 'peach', 'night'] as const
export type CardTone = (typeof CARD_TONES)[number]
export const toneClass = (t?: string) => `card-${(CARD_TONES as readonly string[]).includes(t ?? '') ? t : 'violet'}`

/** شهرهای پیشنهادی (مراکز استان‌ها) با مختصات مرکز شهر؛ کاربر می‌تواند شهر دیگری هم بنویسد */
export const IR_CITIES: readonly { name: string; lat: number; lng: number }[] = [
  { name: 'تهران', lat: 35.6892, lng: 51.389 }, { name: 'مشهد', lat: 36.2605, lng: 59.6168 }, { name: 'اصفهان', lat: 32.6546, lng: 51.668 },
  { name: 'کرج', lat: 35.84, lng: 50.9391 }, { name: 'شیراز', lat: 29.5918, lng: 52.5837 }, { name: 'تبریز', lat: 38.0962, lng: 46.2738 },
  { name: 'قم', lat: 34.6416, lng: 50.8746 }, { name: 'اهواز', lat: 31.3183, lng: 48.6706 }, { name: 'کرمانشاه', lat: 34.3142, lng: 47.065 },
  { name: 'ارومیه', lat: 37.5527, lng: 45.0761 }, { name: 'رشت', lat: 37.2808, lng: 49.5832 }, { name: 'زاهدان', lat: 29.4963, lng: 60.8629 },
  { name: 'همدان', lat: 34.7983, lng: 48.5148 }, { name: 'کرمان', lat: 30.2839, lng: 57.0834 }, { name: 'یزد', lat: 31.8974, lng: 54.3569 },
  { name: 'اردبیل', lat: 38.2498, lng: 48.2933 }, { name: 'بندرعباس', lat: 27.1832, lng: 56.2666 }, { name: 'اراک', lat: 34.0917, lng: 49.6892 },
  { name: 'زنجان', lat: 36.6736, lng: 48.4787 }, { name: 'سنندج', lat: 35.3219, lng: 46.9862 }, { name: 'قزوین', lat: 36.2797, lng: 50.0049 },
  { name: 'خرم‌آباد', lat: 33.4878, lng: 48.3558 }, { name: 'گرگان', lat: 36.8456, lng: 54.4393 }, { name: 'ساری', lat: 36.5633, lng: 53.0601 },
  { name: 'بیرجند', lat: 32.8663, lng: 59.2211 }, { name: 'بوشهر', lat: 28.9234, lng: 50.8203 }, { name: 'ایلام', lat: 33.6374, lng: 46.4227 },
  { name: 'شهرکرد', lat: 32.3256, lng: 50.8644 }, { name: 'یاسوج', lat: 30.6682, lng: 51.588 }, { name: 'سمنان', lat: 35.5729, lng: 53.3971 },
  { name: 'بجنورد', lat: 37.4747, lng: 57.329 },
]

/** نقشه‌ی بدون موقعیت: مرکز شهر کاربر؛ شهر ناشناخته = پایتخت */
export const DEFAULT_CENTER: [number, number] = [IR_CITIES[0].lat, IR_CITIES[0].lng]
export function cityCenter(city?: string): [number, number] {
  const c = IR_CITIES.find((x) => x.name === city?.trim())
  return c ? [c.lat, c.lng] : DEFAULT_CENTER
}

/** نام شهر واردشده: فاصله‌های اضافه حذف و طول محدود می‌شود */
export const cleanCity = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, 30)

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

/** انواع خدمات سلامت در بخش «پزشک و درمان» */
export const CARE_KINDS: Record<CareKind, { label: string; plural: string; license: string; desc: string }> = {
  doctor: { label: 'پزشک', plural: 'پزشکان', license: 'کد نظام پزشکی', desc: 'پزشکی ورزشی، ارتوپدی، تغذیه و چکاپ' },
  physio: { label: 'فیزیوتراپ', plural: 'فیزیوتراپی', license: 'کد نظام پزشکی (فیزیوتراپی)', desc: 'توانبخشی آسیب و درد مفاصل' },
  massage: { label: 'ماساژ ورزشی', plural: 'ماساژ ورزشی', license: 'شماره‌ی مدرک فنی‌وحرفه‌ای', desc: 'ریکاوری و ماساژ ورزشی حضوری' },
  psych: { label: 'روان‌شناس ورزشی', plural: 'روان‌شناسی ورزشی', license: 'کد نظام روان‌شناسی', desc: 'انگیزه، تمرکز، اضطراب مسابقه' },
}

export const EVENT_KINDS = {
  race: 'مسابقه‌ی دو',
  hike: 'کوهپیمایی',
  tournament: 'تورنمنت',
  workshop: 'کارگاه و همایش',
  other: 'رویداد ورزشی',
} as const

export const LISTING_CONDITION = { new: 'نو (آکبند)', like_new: 'در حد نو', good: 'خوب', fair: 'کارکرده' } as const
export const LISTING_CATEGORY = { equipment: 'تجهیزات', apparel: 'لباس و کفش', accessory: 'لوازم جانبی', supplement: 'مکمل (پلمپ)', other: 'سایر' } as const
