import { LayoutDashboard, Activity, Apple, Baby, Bell, Bot, CalendarDays, Dumbbell, HeartPulse, Home, LayoutGrid, LifeBuoy, MapPin, MessageCircle, QrCode, Radio, Recycle, Settings, ShieldPlus, ShoppingBag, Ticket, Trophy, Users, UsersRound, UtensilsCrossed, Wallet, Watch, type LucideIcon, CalendarClock } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  color: string
  desc?: string
}

export interface NavGroup {
  id: 'sport' | 'health' | 'shop' | 'community' | 'account'
  title: string
  items: NavItem[]
}

/** همه‌ی خدمات ورزشکار در پنج دسته؛ منبع واحد برای سایدبار، صفحه‌ی «همه‌ی خدمات» و خانه */
export const GROUPS: NavGroup[] = [
  {
    id: 'sport',
    title: 'ورزش',
    items: [
      { to: '/fityab', label: 'فیت‌یاب', icon: MapPin, color: '', desc: 'باشگاه و استخر اطراف' },
      { to: '/fityab?view=classes', label: 'کلاس بر اساس ساعت', icon: CalendarClock, color: '', desc: 'کلاس‌های امروز و فردا' },
      { to: '/scan', label: 'ورود با QR', icon: QrCode, color: '', desc: 'اسکن کد دم در باشگاه' },
      { to: '/tickets', label: 'بلیت‌های من', icon: Ticket, color: '', desc: 'ورودها و رزروها' },
      { to: '/workouts', label: 'تمرین‌ها', icon: Dumbbell, color: '', desc: 'ثبت تمرین و رکورد' },
      { to: '/fityar', label: 'فیت‌یار', icon: Bot, color: '', desc: 'مربی و دستیار هوشمند' },
      { to: '/live', label: 'کلاس آنلاین', icon: Radio, color: '', desc: 'تمرین زنده با مربی' },
    ],
  },
  {
    id: 'health',
    title: 'سلامت',
    items: [
      { to: '/progress', label: 'پیشرفت', icon: Activity, color: '', desc: 'وزن، اندازه و نمودارها' },
      { to: '/nutrition', label: 'کالری‌شمار', icon: Apple, color: '', desc: 'غذاهای ایرانی' },
      { to: '/doctors', label: 'سلامت و درمان', icon: HeartPulse, color: '', desc: 'پزشک، فیزیو، روان‌شناس' },
      { to: '/devices', label: 'ساعت و دستگاه‌ها', icon: Watch, color: '', desc: 'همگام‌سازی داده' },
      { to: '/insurance', label: 'بیمه‌ی ورزشی', icon: ShieldPlus, color: '', desc: 'پوشش آسیب ورزشی' },
    ],
  },
  {
    id: 'shop',
    title: 'خرید',
    items: [
      { to: '/shop', label: 'فروشگاه', icon: ShoppingBag, color: '', desc: 'مکمل و لوازم' },
      { to: '/buffet', label: 'بوفه', icon: UtensilsCrossed, color: '', desc: 'غذای رژیمی' },
      { to: '/market', label: 'دست‌دوم', icon: Recycle, color: '', desc: 'خرید و فروش امن' },
      { to: '/wallet', label: 'کیف پول', icon: Wallet, color: '', desc: 'اشتراک و اعتبار' },
    ],
  },
  {
    id: 'community',
    title: 'جامعه',
    items: [
      { to: '/fitzone', label: 'فیت‌زون', icon: Users, color: '', desc: 'شبکه‌ی ورزشکاران' },
      { to: '/challenges', label: 'چالش‌ها', icon: Trophy, color: '', desc: 'رقابت و جایزه' },
      { to: '/events', label: 'رویدادها', icon: CalendarDays, color: '', desc: 'مسابقه و کوهپیمایی' },
      { to: '/teams', label: 'هم‌تیمی‌ها', icon: UsersRound, color: '', desc: 'تمرین گروهی' },
      { to: '/family', label: 'خانواده و کودکان', icon: Baby, color: '', desc: 'کلاس بچه‌ها' },
    ],
  },
  {
    id: 'account',
    title: 'حساب',
    items: [
      { to: '/messages', label: 'پیام‌ها', icon: MessageCircle, color: '' },
      { to: '/notifications', label: 'اعلان‌ها', icon: Bell, color: '' },
      { to: '/support', label: 'پشتیبانی', icon: LifeBuoy, color: '' },
      { to: '/profile?tab=settings', label: 'تنظیمات و تم', icon: Settings, color: '' },
    ],
  },
]

/** ماژول‌ها (بدون بخش حساب) — برای جستجو و فهرست‌ها */
export const MODULES: NavItem[] = GROUPS.filter((g) => g.id !== 'account').flatMap((g) => g.items)

export const HOME_ITEM: NavItem = { to: '/', label: 'خانه', icon: Home, color: '' }

/** منوی پایین موبایل: دکمه‌ی وسط، اسکن QR ورود باشگاه است */
export const BOTTOM: NavItem[] = [
  HOME_ITEM,
  { to: '/fityab', label: 'فیت‌یاب', icon: MapPin, color: '' },
  { to: '/challenges', label: 'چالش‌ها', icon: Trophy, color: '' },
  { to: '/fitzone', label: 'فیت‌زون', icon: Users, color: '' },
  { to: '/services', label: 'همه', icon: LayoutGrid, color: '' },
]

/** منوی حساب کسب‌وکار: پنل خودش + فیت‌زون و چالش‌ها */
export function businessGroups(panel: string): NavGroup[] {
  return [
    { id: 'sport', title: '', items: [{ to: panel, label: 'پنل من', icon: LayoutDashboard, color: '' }] },
    {
      id: 'community',
      title: 'جامعه',
      items: [
        { to: '/fitzone', label: 'فیت‌زون', icon: Users, color: '' },
        { to: '/challenges', label: 'چالش‌ها', icon: Trophy, color: '' },
      ],
    },
    {
      id: 'account',
      title: 'حساب',
      items: [
        { to: '/messages', label: 'پیام‌ها', icon: MessageCircle, color: '' },
        { to: '/notifications', label: 'اعلان‌ها', icon: Bell, color: '' },
        { to: '/support', label: 'پشتیبانی', icon: LifeBuoy, color: '' },
        { to: '/profile?tab=settings', label: 'تنظیمات و تم', icon: Settings, color: '' },
      ],
    },
  ]
}

export function businessBottom(panel: string): NavItem[] {
  return [
    { to: panel, label: 'پنل من', icon: LayoutDashboard, color: '' },
    { to: '/fitzone', label: 'فیت‌زون', icon: Users, color: '' },
    { to: '/challenges', label: 'چالش', icon: Trophy, color: '' },
    { to: '/messages', label: 'پیام‌ها', icon: MessageCircle, color: '' },
  ]
}

export { Dumbbell }
