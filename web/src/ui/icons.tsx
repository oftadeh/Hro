/** آیکون‌های خطی جایگزین ایموجی‌ها */
import {
  Apple, Bell, Bot, Building2, Coffee, Dumbbell, Flame, Footprints, Gauge, HeartPulse, Pill, Route, Scale, Shield, Shirt,
  ShoppingBag, Sparkles, Star, Stethoscope, Timer, Trophy, UserRound, UtensilsCrossed, Watch, Droplets, MessageCircle, Wallet,
  Receipt, ArrowDownLeft, ArrowUpRight, Undo2, Ticket, Landmark, Briefcase, Gift, type LucideIcon,
} from 'lucide-react'
import type { ChallengeMetric, Product, Role, TxType } from '@/core/types'

const ROLE: Record<Role, LucideIcon> = {
  user: UserRound, gym: Building2, coach: Dumbbell, seller: ShoppingBag, doctor: Stethoscope, restaurant: UtensilsCrossed, company: Briefcase, admin: Shield,
}
const METRIC: Record<ChallengeMetric, LucideIcon> = { steps: Footprints, workouts: Flame, minutes: Timer, km: Route, weight_loss: Scale, custom: Star }
const CATEGORY: Record<Product['category'], LucideIcon> = { supplement: Pill, equipment: Dumbbell, apparel: Shirt, accessory: Watch }
const MISSION: Record<string, LucideIcon> = { water: Droplets, steps: Footprints, workout: Flame, social: MessageCircle, ai: Bot }
const TX: Record<TxType, LucideIcon> = {
  topup: ArrowDownLeft, subscription: Sparkles, checkin: Ticket, coach_plan: Dumbbell, shop_order: ShoppingBag, doctor_visit: HeartPulse,
  food_order: UtensilsCrossed, challenge_create: Trophy, challenge_entry: Trophy, challenge_prize: Trophy, withdraw: Landmark, refund: Undo2, reward: Gift, gift: Gift, org_seats: Briefcase,
}

type P = { size?: number; className?: string }
const mk = (I: LucideIcon) => ({ size = 18, className }: P) => <I size={size} strokeWidth={1.5} className={className} />

export const RoleIcon = ({ role, ...p }: P & { role: Role }) => mk(ROLE[role])(p)
export const MetricIcon = ({ metric, ...p }: P & { metric: ChallengeMetric }) => mk(METRIC[metric] ?? Star)(p)
export const CategoryIcon = ({ category, ...p }: P & { category: Product['category'] }) => mk(CATEGORY[category] ?? ShoppingBag)(p)
export const MissionIcon = ({ id, ...p }: P & { id: string }) => mk(MISSION[id] ?? Star)(p)
export const TxIcon = ({ type, ...p }: P & { type: TxType }) => mk(TX[type] ?? Receipt)(p)
export const FoodIcon = mk(Apple)
export { Bell, Coffee, Gauge, Wallet, ArrowUpRight }
