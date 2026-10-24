import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { priceAfter } from '@/core/services/perks'
import type { RevenueModule } from '@/core/types'

/** قیمت با اعمال مزیت اشتراک کاربر (تخفیف درصدی یا رایگان) */
export function PerkPrice({ userId, module, amount, free }: { userId: string; module: RevenueModule; amount: number; free?: boolean }) {
  useDB((s) => s.subscriptions)
  const { pct, final } = priceAfter(userId, module, amount)
  if (free)
    return (
      <span className="flex items-center gap-2">
        <span className="text-ink-400 line-through">{toman(amount)}</span>
        <b className="text-emerald-600 dark:text-emerald-400">رایگان با اشتراک</b>
      </span>
    )
  if (!pct) return <b>{toman(amount)}</b>
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-ink-400 line-through">{toman(amount)}</span>
      <b>{toman(final)}</b>
      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">{num(pct)}٪ اشتراک</span>
    </span>
  )
}
