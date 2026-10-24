import { useState } from 'react'
import clsx from 'clsx'
import { Star } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, num, toman } from '@/core/format'
import { ORDER_STEPS, reviewOrder, setOrderStatus } from '@/core/services/commerce'
import type { Order } from '@/core/types'
import { Badge, Button, Card, Empty, PageHeader, Sheet, Textarea } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { runOk, ask } from '@/ui/toast'

export const ORDER_STATUS = {
  paid: { label: 'پرداخت شده', color: 'sky' },
  preparing: { label: 'در حال آماده‌سازی', color: 'amber' },
  shipped: { label: 'ارسال شد', color: 'violet' },
  delivered: { label: 'تحویل شد', color: 'emerald' },
  cancelled: { label: 'لغو شد', color: 'rose' },
} as const

/** نوار پیشرفت مراحل سفارش */
export function OrderSteps({ o }: { o: Order }) {
  if (o.status === 'cancelled') return null
  const steps = ORDER_STEPS[o.kind]
  const idx = steps.indexOf(o.status)
  return (
    <div className="mt-3 flex items-center gap-1">
      {steps.map((st, i) => (
        <div key={st} className="flex flex-1 flex-col items-center gap-1">
          <div className={clsx('h-1.5 w-full rounded-full', i <= idx ? 'bg-brand-400' : 'bg-ink-900/[.08] dark:bg-white/10')} />
          <span className={clsx('text-[9px]', i <= idx ? 'text-ink-700 dark:text-ink-200' : 'text-ink-400')}>{ORDER_STATUS[st].label}</span>
        </div>
      ))}
    </div>
  )
}

export default function Orders() {
  const me = useMe()!
  const orders = useDB((s) => s.orders)
  const restaurants = useDB((s) => s.restaurants)
  const users = useDB((s) => s.users)
  const mine = orders.filter((o) => o.userId === me.id)
  const [review, setReview] = useState<Order>()
  const [rates, setRates] = useState<Record<string, { stars: number; text: string }>>({})
  return (
    <div className="animate-fade-up">
      <PageHeader back title="سفارش‌های من" />
      {mine.length === 0 && <Empty title="سفارشی ثبت نکرده‌ای" />}
      <div className="space-y-3">
        {mine.map((o) => {
          const vendor = o.kind === 'food' ? restaurants.find((r) => r.id === o.vendorId)?.name : users.find((u) => u.id === o.vendorId)?.name
          return (
            <Card key={o.id}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{vendor}</div>
                <Badge color={ORDER_STATUS[o.status].color}>{ORDER_STATUS[o.status].label}</Badge>
              </div>
              <OrderSteps o={o} />
              <div className="mt-3 space-y-1 text-xs text-ink-500">
                {o.items.map((i) => (
                  <div key={i.refId} className="flex justify-between">
                    <span>
                      {i.name} × {num(i.qty)}
                    </span>
                    <span>{toman(i.price * i.qty)}</span>
                  </div>
                ))}
                {!!o.shipping && (
                  <div className="flex justify-between">
                    <span>ارسال</span>
                    <span>{toman(o.shipping)}</span>
                  </div>
                )}
                {!!o.discount && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>تخفیف{o.coupon ? ` (${o.coupon})` : ''}</span>
                    <span>−{toman(o.discount)}</span>
                  </div>
                )}
              </div>
              {o.trackingCode && (
                <div className="mt-2 text-xs">
                  کد رهگیری مرسوله: <b dir="ltr">{o.trackingCode}</b>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2 text-sm dark:border-white/5">
                <span className="text-xs text-ink-400">{faDateTime(o.createdAt)}</span>
                <b>{toman(o.total + (o.shipping ?? 0) - (o.discount ?? 0))}</b>
              </div>
              <div className="mt-3 flex gap-2">
                {o.status === 'paid' && (
                  <Button size="sm" variant="ghost" className="text-coral-500" onClick={async () => (await ask('سفارش لغو و مبلغ به کیف پول برگردد؟')) && runOk(() => setOrderStatus(o.id, 'cancelled'), 'سفارش لغو شد و مبلغ برگشت داده شد')}>
                    لغو سفارش
                  </Button>
                )}
                {o.status === 'delivered' && !o.reviewed && (
                  <Button size="sm" variant="secondary" icon={<Star size={14} />} onClick={() => setReview(o)}>
                    ثبت نظر
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
      <Sheet open={!!review} onClose={() => setReview(undefined)} title="نظر شما درباره‌ی سفارش">
        {review && (
          <div className="space-y-4">
            {review.items.map((i) => {
              const r = rates[i.refId] ?? { stars: 5, text: '' }
              return (
                <div key={i.refId} className="rounded-2xl bg-ink-900/[.03] p-3 dark:bg-white/[.04]">
                  <div className="text-sm font-medium">{i.name}</div>
                  <div className="mt-2 flex gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setRates({ ...rates, [i.refId]: { ...r, stars: s } })} aria-label={`${s} ستاره`}>
                        <Star size={22} strokeWidth={1.5} className={s <= r.stars ? 'fill-gold-300 text-gold-300' : 'text-ink-300'} />
                      </button>
                    ))}
                  </div>
                  <Textarea rows={2} className="mt-2" value={r.text} onChange={(e) => setRates({ ...rates, [i.refId]: { ...r, text: e.target.value } })} placeholder="کیفیت، اصالت، بسته‌بندی…" />
                </div>
              )
            })}
            <Button
              className="w-full"
              onClick={async () => {
                const list = review.items.map((i) => ({ refId: i.refId, ...(rates[i.refId] ?? { stars: 5, text: '' }) }))
                if (await runOk(() => reviewOrder(review.id, list), 'ممنون از نظرت!')) setReview(undefined)
              }}
            >
              ثبت نظر
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
