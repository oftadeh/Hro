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
import type { ID, Role } from './types'
import type { DBState } from './state'
import { createEmpty, createSeed } from './seed'
import { AppError, configureCore } from './store'

export type { DBState, AIChatMessage } from './state'

const REMOTE = import.meta.env.VITE_REMOTE === '1'
export { AppError, currentUserId, db, mutate } from './store'

export const useDB = create<DBState>()(
  persist(
    immer(() => (REMOTE ? createEmpty() : createSeed())),
    {
      // در حالت سرور فقط یک کپی موقت از نمای کاربر نگه داشته می‌شود
      name: REMOTE ? 'keyfit-cache' : 'keyfit-db',
      // نسخه‌ی داده‌های نمایشی؛ با تغییر ساختار، داده‌ها به حالت اولیه برمی‌گردند
      version: 6,
      migrate: () => (REMOTE ? createEmpty() : createSeed()),
      storage: createJSONStorage(() => localStorage),
    },
  ),
)


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
      theme: 'dark',
      login: (userId, role = 'user') => set({ userId, activeRole: role }),
      logout: () => set({ userId: null, activeRole: 'user' }),
      setRole: (activeRole) => set({ activeRole }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'keyfit-session' },
  ),
)

configureCore({
  get: () => useDB.getState(),
  mutate: (fn) => useDB.setState(fn),
  userId: () => useSession.getState().userId,
})

void AppError
