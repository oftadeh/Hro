import { Bell, Bot, Dumbbell, HeartPulse, Home, MapPin, ShoppingBag, Trophy, UtensilsCrossed, Wallet, Users, MessageCircle, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  color: string
  desc?: string
}

export const MODULES: NavItem[] = [
  { to: '/fityab', label: 'فیت‌یاب', icon: MapPin, color: 'from-orange-400 to-rose-500', desc: 'باشگاه‌های اطراف' },
  { to: '/fityar', label: 'فیت‌یار', icon: Bot, color: 'from-sky-400 to-indigo-500', desc: 'هوش مصنوعی و مربی' },
  { to: '/challenges', label: 'چالش‌ها', icon: Trophy, color: 'from-amber-400 to-orange-500', desc: 'رقابت و جایزه' },
  { to: '/fitzone', label: 'فیت‌زون', icon: Users, color: 'from-fuchsia-500 to-purple-600', desc: 'شبکه اجتماعی' },
  { to: '/shop', label: 'فروشگاه', icon: ShoppingBag, color: 'from-violet-500 to-indigo-600', desc: 'مکمل و لوازم' },
  { to: '/buffet', label: 'بوفه', icon: UtensilsCrossed, color: 'from-lime-400 to-green-600', desc: 'غذای رژیمی' },
  { to: '/doctors', label: 'پزشک', icon: HeartPulse, color: 'from-cyan-400 to-blue-600', desc: 'ویزیت آنلاین' },
  { to: '/wallet', label: 'کیف پول', icon: Wallet, color: 'from-brand-400 to-violet-600', desc: 'اشتراک و اعتبار' },
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
