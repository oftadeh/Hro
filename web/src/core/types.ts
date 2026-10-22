/**
 * مدل‌های دامنه‌ی کی‌فیت.
 * این لایه مستقل از UI و پلتفرم است تا بتوان آن را عیناً در اپ موبایل
 * (React Native / Capacitor) یا سرور استفاده کرد.
 */

export type ID = string
export type ISODate = string

export type Role = 'user' | 'gym' | 'coach' | 'seller' | 'doctor' | 'restaurant' | 'admin'

/** ماژول‌هایی که درآمد کمیسیونی دارند */
export type RevenueModule = 'fityab' | 'fityar' | 'shop' | 'doctor' | 'buffet' | 'challenge'

export interface User {
  id: ID
  name: string
  phone: string
  avatar?: string
  bio?: string
  city: string
  roles: Role[]
  gender?: 'male' | 'female'
  heightCm?: number
  weightKg?: number
  birthYear?: number
  goal?: 'lose' | 'gain' | 'fit'
  xp: number
  streak: number
  lastActiveDay?: string // YYYY-MM-DD
  following: ID[]
  createdAt: ISODate
  blocked?: boolean
}

export interface Subscription {
  userId: ID
  planId: ID
  /** اعتبار ریالی باقی‌مانده‌ی اشتراک که برای سانس‌ها مصرف می‌شود (تومان) */
  credit: number
  startedAt: ISODate
  expiresAt: ISODate
}

export interface SubscriptionPlan {
  id: ID
  name: string
  price: number
  credit: number
  durationDays: number
  color: string
  perks: string[]
  popular?: boolean
}

export type TxType =
  | 'topup'
  | 'subscription'
  | 'checkin'
  | 'coach_plan'
  | 'shop_order'
  | 'doctor_visit'
  | 'food_order'
  | 'challenge_create'
  | 'challenge_entry'
  | 'challenge_prize'
  | 'withdraw'
  | 'refund'

/** هر جابجایی پول یک سطر در دفتر کل (Ledger) است */
export interface Transaction {
  id: ID
  type: TxType
  from: ID | 'gateway' | 'subscription' | 'escrow'
  to: ID | 'platform' | 'escrow' | 'bank'
  /** کاربری که پول از حساب او خارج شده (برای پرداخت از اشتراک یا درگاه هم پر می‌شود) */
  payerId?: ID
  amount: number
  commission: number
  module?: RevenueModule
  refId?: ID
  description: string
  createdAt: ISODate
}

export interface Payout {
  id: ID
  userId: ID
  amount: number
  iban: string
  status: 'pending' | 'paid' | 'rejected'
  createdAt: ISODate
}

export interface Media {
  type: 'image' | 'video'
  url: string
}

export interface Gym {
  id: ID
  ownerId: ID
  name: string
  tagline: string
  description: string
  address: string
  city: string
  lat: number
  lng: number
  phone: string
  sessionPrice: number
  facilities: string[]
  sports: string[]
  hours: string
  gender: 'male' | 'female' | 'mixed'
  media: Media[]
  cover: string // رنگ/گرادیان پیش‌فرض
  rating: number
  reviews: number
  approved: boolean
  createdAt: ISODate
}

export interface CheckIn {
  id: ID
  userId: ID
  gymId: ID
  price: number
  code: string
  paidWith: 'subscription' | 'wallet'
  status: 'active' | 'used'
  createdAt: ISODate
}

export interface CoachPlan {
  id: ID
  title: string
  kind: 'workout' | 'diet' | 'both'
  price: number
  durationWeeks: number
  description: string
}

export interface CoachProfile {
  userId: ID
  title: string
  specialties: string[]
  experienceYears: number
  bio: string
  rating: number
  students: number
  online: boolean
  callPrice: number
  plans: CoachPlan[]
  certificates: string[]
}

export interface PlanOrder {
  id: ID
  userId: ID
  coachId: ID
  planId: ID
  title: string
  price: number
  status: 'pending' | 'delivered'
  answers: string
  content?: string
  createdAt: ISODate
}

export interface Message {
  id: ID
  from: ID
  text: string
  at: ISODate
  kind?: 'text' | 'call' | 'system'
}

export interface Thread {
  id: ID
  members: ID[]
  context: 'coach' | 'doctor' | 'direct'
  messages: Message[]
  updatedAt: ISODate
}

export interface Product {
  id: ID
  sellerId: ID
  name: string
  brand: string
  category: 'supplement' | 'equipment' | 'apparel' | 'accessory'
  price: number
  discount: number
  stock: number
  description: string
  image?: string
  emoji: string
  rating: number
  sold: number
  createdAt: ISODate
}

export interface CartItem {
  kind: 'product' | 'food'
  refId: ID
  qty: number
}

export interface OrderItem {
  refId: ID
  name: string
  price: number
  qty: number
}

export interface Order {
  id: ID
  kind: 'shop' | 'food'
  userId: ID
  vendorId: ID // فروشنده یا رستوران
  items: OrderItem[]
  total: number
  address: string
  status: 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: ISODate
}

export interface DoctorProfile {
  userId: ID
  specialty: string
  medicalCode: string
  bio: string
  visitPrice: number
  rating: number
  visits: number
  /** نوبت‌های آزاد به صورت ISO */
  slots: ISODate[]
  online: boolean
}

export interface Appointment {
  id: ID
  userId: ID
  doctorId: ID
  at: ISODate
  price: number
  reason: string
  status: 'booked' | 'done' | 'cancelled'
  prescription?: string
  createdAt: ISODate
}

export interface Restaurant {
  id: ID
  ownerId: ID
  name: string
  description: string
  address: string
  lat: number
  lng: number
  cover: string
  rating: number
  deliveryMinutes: number
  open: boolean
  approved: boolean
}

export interface Food {
  id: ID
  restaurantId: ID
  name: string
  description: string
  price: number
  calories: number
  protein: number
  carbs: number
  fat: number
  tags: string[]
  emoji: string
  image?: string
  available: boolean
}

export interface Comment {
  id: ID
  authorId: ID
  text: string
  at: ISODate
}

export interface Post {
  id: ID
  authorId: ID
  text: string
  image?: string
  gradient?: string
  likes: ID[]
  saves: ID[]
  comments: Comment[]
  challengeId?: ID
  gymId?: ID
  createdAt: ISODate
}

export interface Story {
  id: ID
  authorId: ID
  text: string
  image?: string
  gradient: string
  seenBy: ID[]
  createdAt: ISODate
}

export type ChallengeMetric = 'steps' | 'workouts' | 'minutes' | 'km' | 'weight_loss' | 'custom'

export interface ChallengeParticipant {
  userId: ID
  score: number
  joinedAt: ISODate
  logs: { at: ISODate; value: number; note?: string }[]
}

export interface Prize {
  rank: number
  title: string
  /** درصد از صندوق جایزه */
  percent: number
}

export interface Challenge {
  id: ID
  creatorId: ID
  title: string
  description: string
  metric: ChallengeMetric
  unit: string
  goal: number
  entryFee: number
  creationFee: number
  sponsorPrize: number // جایزه‌ی نقدی که سازنده خودش اضافه می‌کند
  /** صندوق جایزه = جایزه‌ی اسپانسر + ورودی‌ها پس از کسر کمیسیون (در escrow نگهداری می‌شود) */
  pool: number
  extraReward: string // جایزه‌ی غیرنقدی (مثلا یک ماه اشتراک باشگاه)
  prizes: Prize[]
  xpReward: number
  gradient: string
  emoji: string
  startAt: ISODate
  endAt: ISODate
  maxParticipants: number
  participants: ChallengeParticipant[]
  status: 'active' | 'finished'
  winners?: { userId: ID; rank: number; amount: number }[]
  createdAt: ISODate
}

export interface Notification {
  id: ID
  userId: ID
  title: string
  body: string
  link?: string
  icon: string
  read: boolean
  at: ISODate
}

export interface DailyLog {
  userId: ID
  day: string // YYYY-MM-DD
  water: number // لیوان
  steps: number
  workoutMinutes: number
  calories: number
  sleepHours: number
  missionsDone: string[]
  rewardClaimed: boolean
}

export interface PlatformSettings {
  commissions: Record<RevenueModule, number> // درصد
  challengeCreationFee: number
  minWithdraw: number
}
