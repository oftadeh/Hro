import { Bell, Bot, Dumbbell, HeartPulse, Home, MapPin, ShoppingBag, Trophy, UtensilsCrossed, Wallet, Users, MessageCircle, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  color: string
  desc?: string
}

export const MODULES: NavItem[] = [
  { to: '/fityab', label: 'فیت‌یاب', icon: MapPin, color: '', desc: 'باشگاه‌های اطراف' },
  { to: '/fityar', label: 'فیت‌یار', icon: Bot, color: '', desc: 'هوش مصنوعی و مربی' },
  { to: '/challenges', label: 'چالش‌ها', icon: Trophy, color: '', desc: 'رقابت و جایزه' },
  { to: '/fitzone', label: 'فیت‌زون', icon: Users, color: '', desc: 'شبکه اجتماعی' },
  { to: '/shop', label: 'فروشگاه', icon: ShoppingBag, color: '', desc: 'مکمل و لوازم' },
  { to: '/buffet', label: 'بوفه', icon: UtensilsCrossed, color: '', desc: 'غذای رژیمی' },
  { to: '/doctors', label: 'پزشک', icon: HeartPulse, color: '', desc: 'ویزیت آنلاین' },
  { to: '/wallet', label: 'کیف پول', icon: Wallet, color: '', desc: 'اشتراک و اعتبار' },
]

export const SIDEBAR: NavItem[] = [
  { to: '/', label: 'خانه', icon: Home, color: '' },
  ...MODULES,
  { to: '/messages', label: 'پیام‌ها', icon: MessageCircle, color: '' },
  { to: '/notifications', label: 'اعلان‌ها', icon: Bell, color: '' },
]

export const BOTTOM: NavItem[] = [
  { to: '/', label: 'خانه', icon: Home, color: '' },
  { to: '/fityab', label: 'فیت‌یاب', icon: MapPin, color: '' },
  { to: '/challenges', label: 'چالش', icon: Trophy, color: '' },
  { to: '/fitzone', label: 'فیت‌زون', icon: Users, color: '' },
  { to: '/fityar', label: 'فیت‌یار', icon: Bot, color: '' },
]

export { Dumbbell }
