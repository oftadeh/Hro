import type { Transaction } from '@/core/types'
import { faDateTime, toman } from '@/core/format'
import { Empty } from '@/ui/kit'

const TX_ICON: Record<Transaction['type'], string> = {
  topup: '💳', subscription: '✨', checkin: '🏋️', coach_plan: '🧑‍🏫', shop_order: '🛍️', doctor_visit: '🩺', food_order: '🥗',
  challenge_create: '🏆', challenge_entry: '🏁', challenge_prize: '🥇', withdraw: '🏦', refund: '↩️',
}

/** فهرست تراکنش‌ها از دید یک کاربر (ورودی سبز، خروجی قرمز) */
export function TxList({ txs, userId, showCommission }: { txs: Transaction[]; userId: string; showCommission?: boolean }) {
  if (!txs.length) return <Empty icon="🧾" title="تراکنشی ثبت نشده" />
  return (
    <div className="divide-y divide-ink-100 dark:divide-white/5">
      {txs.map((t) => {
        // از دید پلتفرم فقط کمیسیون درآمد است
        const platformView = userId === 'platform'
        const incoming = platformView ? t.commission > 0 : t.to === userId
        const net = platformView ? t.commission : incoming ? t.amount - t.commission : t.amount
        return (
          <div key={t.id} className="flex items-center gap-3 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-100 text-lg dark:bg-white/5">{TX_ICON[t.type]}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{t.description}</div>
              <div className="text-[11px] text-ink-400">
                {faDateTime(t.createdAt)}
                {t.from === 'subscription' && ' · از اعتبار اشتراک'}
                {showCommission && incoming && t.commission > 0 && (platformView ? ` · مبلغ کل ${toman(t.amount)}` : ` · کمیسیون ${toman(t.commission)}`)}
              </div>
            </div>
            <div className={`text-sm font-bold ${incoming ? 'text-emerald-600' : t.from === 'subscription' ? 'text-ink-500' : 'text-rose-500'}`} dir="ltr">
              {incoming ? '+' : '−'}
              {toman(net)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
