import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { addToCart, cartLines, checkout } from '@/core/services/commerce'
import type { CartItem } from '@/core/types'
import { Button, Empty, Field, Input, Sheet } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

export function useCartCount(kind: CartItem['kind']) {
  const me = useMe()!
  return useDB((s) => (s.carts[me.id] ?? []).filter((c) => c.kind === kind).reduce((a, c) => a + c.qty, 0))
}

export function CartSheet({ kind, open, onClose }: { kind: CartItem['kind']; open: boolean; onClose: () => void }) {
  const me = useMe()!
  useDB((s) => s.carts[me.id])
  useDB((s) => s.products)
  useDB((s) => s.foods)
  const nav = useNavigate()
  const bal = useBalance(me.id)
  const lines = cartLines(me.id, kind)
  const total = lines.reduce((a, l) => a + l.price * l.qty, 0)
  const cal = lines.reduce((a, l) => a + ('calories' in l ? (l.calories as number) : 0), 0)
  const [address, setAddress] = useState('تهران، ')

  return (
    <Sheet open={open} onClose={onClose} title={kind === 'product' ? '🛒 سبد خرید' : '🥗 سفارش غذا'}>
      {lines.length === 0 ? (
        <Empty icon="🛒" title="سبد خالی است" />
      ) : (
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={l.refId} className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3 dark:bg-white/5">
              <span className="text-2xl">{l.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{l.name}</div>
                <div className="text-xs text-ink-500">{toman(l.price)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => addToCart(kind, l.refId, 1)} className="rounded-lg bg-white p-1 shadow-sm dark:bg-ink-800" aria-label="افزایش"><Plus size={14} /></button>
                <span className="w-5 text-center text-sm font-bold">{num(l.qty)}</span>
                <button onClick={() => addToCart(kind, l.refId, -1)} className="rounded-lg bg-white p-1 shadow-sm dark:bg-ink-800" aria-label="کاهش"><Minus size={14} /></button>
              </div>
            </div>
          ))}
          {kind === 'food' && <div className="text-center text-xs text-ink-500">مجموع کالری سفارش: <b>{num(cal)}</b> کالری</div>}
          <Field label="آدرس تحویل">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded-2xl border border-ink-100 p-3 dark:border-white/10">
            <span className="text-sm">مبلغ قابل پرداخت</span>
            <b className="text-lg">{toman(total)}</b>
          </div>
          <div className="text-xs text-ink-400">موجودی کیف پول: {toman(bal)}</div>
          <Button
            className="w-full"
            size="lg"
            onClick={async () => {
              const ok = await runOk(() => checkout(kind, address), 'سفارش با موفقیت ثبت شد ✅')
              if (ok) {
                onClose()
                nav('/orders')
              }
            }}
          >
            پرداخت از کیف پول
          </Button>
          {bal < total && (
            <Button variant="secondary" className="w-full" onClick={() => nav('/wallet')}>
              شارژ کیف پول
            </Button>
          )}
        </div>
      )}
    </Sheet>
  )
}
