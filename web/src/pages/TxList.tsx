import type { Transaction } from '@/core/types'
import { faDateTime, toman } from '@/core/format'
import { Empty } from '@/ui/kit'
import { TxIcon } from '@/ui/icons'


/** فهرست تراکنش‌ها از دید یک کاربر (ورودی سبز، خروجی قرمز) */
export function TxList({ txs, userId, showCommission }: { txs: Transaction[]; userId: string; showCommission?: boolean }) {
  if (!txs.length) return <Empty icon="" title="تراکنشی ثبت نشده" />
  return (
    <div className="divide-y divide-ink-100 dark:divide-white/5">
      {txs.map((t) => {
        // از دید پلتفرم فقط کمیسیون درآمد است
        const platformView = userId === 'platform'
        const incoming = platformView ? t.commission - (t.discount ?? 0) >= 0 : t.to === userId
        const net = platformView ? Math.abs(t.commission - (t.discount ?? 0)) : incoming ? t.amount - t.commission : t.amount - (t.discount ?? 0)
        return (
          <div key={t.id} className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border hairline text-ink-500"><TxIcon type={t.type} size={15} /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t.description}</div>
              <div className="text-[11px] text-ink-400">
                {faDateTime(t.createdAt)}
                {t.from === 'subscription' && ' · از اعتبار اشتراک'}
                {!incoming && !platformView && t.discount ? ` · تخفیف اشتراک ${toman(t.discount)}` : ''}
                {showCommission && incoming && t.commission > 0 && (platformView ? ` · مبلغ کل ${toman(t.amount)}` : ` · کمیسیون ${toman(t.commission)}`)}
              </div>
            </div>
            <div className={`text-sm font-semibold ${incoming ? 'text-emerald-600' : t.from === 'subscription' ? 'text-ink-500' : 'text-coral-500'}`} dir="ltr">
              {incoming ? '+' : '−'}
              {toman(net)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
