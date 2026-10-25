import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { addToCart, checkout, previewCoupon, quote } from '@/core/services/commerce'
import type { CartItem } from '@/core/types'
import { Button, Empty, Field, Input, Sheet } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { run, runOk } from '@/ui/toast'
import { FoodIcon } from '@/ui/icons'
import { ShoppingBag } from 'lucide-react'

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
  useDB((s) => s.subscriptions)
  const [coupon, setCoupon] = useState('')
  const [applied, setApplied] = useState<{ code: string; amount: number } | null>(null)
  const base = quote(me.id, kind, undefined, useDB.getState())
  const q = { ...base, coupon: applied?.amount ?? 0, total: base.total - (applied?.amount ?? 0) }
  const { lines, gross, pct, perk: discount, shipping, total } = q
  const apply = async () => {
    const amount = await run(() => previewCoupon(coupon, kind === 'product' ? 'shop' : 'buffet', gross - discount))
    setApplied(amount ? { code: coupon, amount } : null)
  }
  const cal = lines.reduce((a, l) => a + ('calories' in l ? (l.calories as number) : 0), 0)
  const saved = me.addresses ?? []
  const [address, setAddress] = useState(saved[0]?.text ?? 'اصفهان، ')

  return (
    <Sheet open={open} onClose={onClose} title={kind === 'product' ? 'سبد خرید' : 'سفارش غذا'}>
      {lines.length === 0 ? (
        <Empty icon="" title="سبد خالی است" />
      ) : (
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={l.refId} className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3 dark:bg-white/5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-900/[.04] text-ink-500 dark:bg-white/5">{kind === 'product' ? <ShoppingBag size={18} strokeWidth={1.5} /> : <FoodIcon />}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{l.name}</div>
                <div className="text-xs text-ink-500">{toman(l.price)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => run(() => addToCart(kind, l.refId, 1))} className="rounded-lg bg-white p-1 shadow-sm dark:bg-ink-800" aria-label="افزایش"><Plus size={14} /></button>
                <span className="w-5 text-center text-sm font-semibold">{num(l.qty)}</span>
                <button onClick={() => run(() => addToCart(kind, l.refId, -1))} className="rounded-lg bg-white p-1 shadow-sm dark:bg-ink-800" aria-label="کاهش"><Minus size={14} /></button>
              </div>
            </div>
          ))}
          {kind === 'food' && <div className="text-center text-xs text-ink-500">مجموع کالری سفارش: <b>{num(cal)}</b> کالری</div>}
          <Field label="آدرس تحویل">
            {saved.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {saved.map((a) => (
                  <button key={a.id} type="button" onClick={() => setAddress(a.text)} className={`rounded-full px-3 py-1.5 text-[12px] ${address === a.text ? 'card-violet text-ink-950' : 'bg-ink-900/[.05] dark:bg-white/[.06]'}`}>
                    {a.title}
                  </button>
                ))}
              </div>
            )}
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="کد تخفیف" dir="ltr" className="text-left" />
            <Button variant="secondary" onClick={apply}>اعمال</Button>
          </div>
          <div className="space-y-1.5 rounded-2xl border border-ink-100 p-3 text-sm dark:border-white/10">
            <div className="flex justify-between text-ink-500"><span>جمع کالاها</span><span>{toman(gross)}</span></div>
            {pct > 0 && <div className="flex justify-between text-aqua-600 dark:text-aqua-400"><span>تخفیف اشتراک ({num(pct)}٪)</span><span>−{toman(discount)}</span></div>}
            {q.coupon > 0 && <div className="flex justify-between text-aqua-600 dark:text-aqua-400"><span>کد تخفیف {applied?.code}</span><span>−{toman(q.coupon)}</span></div>}
            {kind === 'product' && <div className="flex justify-between text-ink-500"><span>هزینه‌ی ارسال</span><span>{shipping ? toman(shipping) : 'رایگان'}</span></div>}
            <div className="flex items-center justify-between"><span>مبلغ قابل پرداخت</span><b className="text-lg">{toman(total)}</b></div>
          </div>
          <div className="text-xs text-ink-400">موجودی کیف پول: {toman(bal)}</div>
          <Button
            className="w-full"
            size="lg"
            onClick={async () => {
              const ok = await runOk(() => checkout(kind, address, applied?.code), 'سفارش با موفقیت ثبت شد')
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
