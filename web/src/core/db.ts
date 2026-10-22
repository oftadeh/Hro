/**
 * «بک‌اند محلی» کی‌فیت.
 *
 * فعلاً داده‌ها در localStorage مرورگر نگه داشته می‌شوند تا وب‌اپ بدون سرور
 * کار کند. همه‌ی تغییرات فقط از طریق `core/services/*` انجام می‌شود؛ برای
 * اتصال به سرور واقعی کافی است بدنه‌ی سرویس‌ها با فراخوانی API جایگزین شود.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  Appointment, CartItem, Challenge, CheckIn, CoachProfile, DailyLog, DoctorProfile, Food, Gym, ID, Notification,
  Order, Payout, PlanOrder, PlatformSettings, Post, Product, Restaurant, Role, Story, Subscription, Thread,
  Transaction, User,
} from './types'
import { createSeed } from './seed'

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
  carts: Record<ID, CartItem[]>
  aiChats: Record<ID, AIChatMessage[]>
  settings: PlatformSettings
}

export const useDB = create<DBState>()(
  persist(
    immer(() => createSeed()),
    {
      name: 'keyfit-db',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/** اعمال تغییر روی دیتابیس (معادل یک تراکنش سمت سرور) */
export const mutate = (fn: (db: DBState) => void) => useDB.setState(fn)
export const db = () => useDB.getState()

export function resetDemo() {
  useDB.setState(createSeed(), true)
}

interface SessionState {
  userId: ID | null
  activeRole: Role
  theme: 'light' | 'dark'
  login: (userId: ID, role?: Role) => void
  logout: () => void
  setRole: (role: Role) => void
  toggleTheme: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      activeRole: 'user',
      theme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      login: (userId, role = 'user') => set({ userId, activeRole: role }),
      logout: () => set({ userId: null, activeRole: 'user' }),
      setRole: (activeRole) => set({ activeRole }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'keyfit-session' },
  ),
)

export function currentUserId(): ID {
  const id = useSession.getState().userId
  if (!id) throw new AppError('ابتدا وارد حساب کاربری شوید')
  return id
}

export class AppError extends Error {}
