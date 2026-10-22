import { useDB, useSession } from '@/core/db'
import { useShallow } from 'zustand/react/shallow'

export function useMe() {
  const id = useSession((s) => s.userId)
  return useDB((s) => s.users.find((u) => u.id === id)) ?? null
}

/** کاربر فعلی که در صفحات محافظت‌شده همیشه وجود دارد */
export function useMeStrict() {
  const me = useMe()
  if (!me) throw new Error('not logged in')
  return me
}

export const useUserMap = () =>
  useDB(useShallow((s) => Object.fromEntries(s.users.map((u) => [u.id, u]))))

export function useBalance(id: string | undefined) {
  return useDB((s) => (id ? s.wallets[id] ?? 0 : 0))
}
