import { useDB } from '@/core/db'
import { faDateTime, num, toman } from '@/core/format'
import { setOrderStatus } from '@/core/services/commerce'
import type { Order } from '@/core/types'
import { Badge, Button, Card, Empty, PageHeader } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { ORDER_STATUS } from '@/pages/Orders'

const NEXT: Partial<Record<Order['status'], { to: Order['status']; label: string }>> = {
  paid: { to: 'preparing', label: 'شروع آماده‌سازی' },
  preparing: { to: 'shipped', label: 'ارسال شد' },
  shipped: { to: 'delivered', label: 'تحویل شد' },
}

export default function VendorOrders({ kind }: { kind: Order['kind'] }) {
  const me = useMe()!
  const orders = useDB((s) => s.orders)
  const restaurants = useDB((s) => s.restaurants)
  const users = useUserMap()
  const myVendorIds = kind === 'shop' ? [me.id] : restaurants.filter((r) => r.ownerId === me.id).map((r) => r.id)
  const list = orders.filter((o) => o.kind === kind && myVendorIds.includes(o.vendorId))
  return (
    <div className="animate-fade-up">
      <PageHeader title="سفارش‌ها" subtitle={`${num(list.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length)} سفارش در جریان`} />
      {list.length === 0 && <Empty icon="" title="هنوز سفارشی ندارید" />}
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((o) => {
          const next = NEXT[o.status]
          return (
            <Card key={o.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{users[o.userId]?.name}</div>
                  <div className="text-[11px] text-ink-400">{faDateTime(o.createdAt)}</div>
                </div>
                <Badge color={ORDER_STATUS[o.status].color}>{ORDER_STATUS[o.status].label}</Badge>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                {o.items.map((i) => (
                  <div key={i.refId} className="flex justify-between">
                    <span>{i.name} × {num(i.qty)}</span>
                    <span>{toman(i.price * i.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-ink-500">{o.address}</div>
              <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-white/5">
                <b>{toman(o.total)}</b>
                <div className="flex gap-2">
                  {o.status === 'paid' && <Button size="sm" variant="ghost" className="text-coral-500" onClick={() => setOrderStatus(o.id, 'cancelled')}>لغو</Button>}
                  {next && <Button size="sm" onClick={() => setOrderStatus(o.id, next.to)}>{next.label}</Button>}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
