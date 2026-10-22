import { useDB } from '@/core/db'
import { faDateTime, num, toman } from '@/core/format'
import { Badge, Card, Empty, PageHeader } from '@/ui/kit'
import { useMe } from '@/ui/hooks'

export const ORDER_STATUS = {
  paid: { label: 'پرداخت شده', color: 'sky' },
  preparing: { label: 'در حال آماده‌سازی', color: 'amber' },
  shipped: { label: 'ارسال شد', color: 'violet' },
  delivered: { label: 'تحویل شد', color: 'emerald' },
  cancelled: { label: 'لغو شد', color: 'rose' },
} as const

export default function Orders() {
  const me = useMe()!
  const orders = useDB((s) => s.orders)
  const restaurants = useDB((s) => s.restaurants)
  const users = useDB((s) => s.users)
  const mine = orders.filter((o) => o.userId === me.id)
  return (
    <div className="animate-fade-up">
      <PageHeader back title="سفارش‌های من" />
      {mine.length === 0 && <Empty icon="" title="سفارشی ثبت نکرده‌ای" />}
      <div className="space-y-3">
        {mine.map((o) => {
          const vendor = o.kind === 'food' ? restaurants.find((r) => r.id === o.vendorId)?.name : users.find((u) => u.id === o.vendorId)?.name
          return (
            <Card key={o.id}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{o.kind === 'food' ? '' : ''} {vendor}</div>
                <Badge color={ORDER_STATUS[o.status].color}>{ORDER_STATUS[o.status].label}</Badge>
              </div>
              <div className="mt-2 space-y-1 text-xs text-ink-500">
                {o.items.map((i) => (
                  <div key={i.refId} className="flex justify-between">
                    <span>{i.name} × {num(i.qty)}</span>
                    <span>{toman(i.price * i.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-ink-100 pt-2 text-sm dark:border-white/5">
                <span className="text-xs text-ink-400">{faDateTime(o.createdAt)}</span>
                <b>{toman(o.total)}</b>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
