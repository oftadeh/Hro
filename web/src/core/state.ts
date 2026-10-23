/** ساختار کامل داده‌های کی‌فیت (مشترک بین مرورگر و سرور) */
import type {
  Appointment, CartItem, Challenge, CheckIn, CoachProfile, CycleProfile, DailyLog, DoctorProfile, Food, Gym, ID, Notification,
  Order, Payout, PlanOrder, PlatformSettings, Post, Product, Restaurant, Story, Subscription, Thread,
  Transaction, User, EntryRequest, Review, Report, Ticket, WorkoutSession, MealLog, BodyEntry, Org, GiftCard, Coupon, Team, InsurancePlan, InsurancePolicy, InsuranceClaim,
} from './types'

export interface AIChatMessage {
  role: 'user' | 'assistant'
  text: string
  at: string
  suggestions?: { label: string; link: string }[]
}

export interface DBState {
  version: number
  users: User[]
  subscriptions: Subscription[]
  /** موجودی کیف پول هر کاربر؛ کلیدهای ویژه: platform (درآمد کی‌فیت) و escrow (صندوق چالش‌ها) */
  wallets: Record<string, number>
  transactions: Transaction[]
  payouts: Payout[]
  gyms: Gym[]
  checkins: CheckIn[]
  coaches: CoachProfile[]
  planOrders: PlanOrder[]
  threads: Thread[]
  products: Product[]
  orders: Order[]
  doctors: DoctorProfile[]
  appointments: Appointment[]
  restaurants: Restaurant[]
  foods: Food[]
  posts: Post[]
  stories: Story[]
  challenges: Challenge[]
  notifications: Notification[]
  dailyLogs: DailyLog[]
  cycles: CycleProfile[]
  carts: Record<ID, CartItem[]>
  aiChats: Record<ID, AIChatMessage[]>
  entryRequests: EntryRequest[]
  reviews: Review[]
  reports: Report[]
  tickets: Ticket[]
  workouts: WorkoutSession[]
  meals: MealLog[]
  bodyEntries: BodyEntry[]
  orgs: Org[]
  giftCards: GiftCard[]
  coupons: Coupon[]
  teams: Team[]
  insurancePlans: InsurancePlan[]
  policies: InsurancePolicy[]
  claims: InsuranceClaim[]
  settings: PlatformSettings
}
