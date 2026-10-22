import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShieldCheck, Truck } from 'lucide-react'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { addToCart, finalPrice } from '@/core/services/commerce'
import { Badge, Button, Card, Empty, PageHeader, Stars } from '@/ui/kit'
import { useUserMap } from '@/ui/hooks'
import { toast } from '@/ui/toast'
import { CartSheet } from './CartSheet'
import { CartButton, CATEGORIES } from './Shop'

export default function ProductDetail() {
  const { id } = useParams()
  const p = useDB((s) => s.products.find((x) => x.id === id))
  const users = useUserMap()
  const [cart, setCart] = useState(false)
  if (!p) return <Empty icon="🔍" title="محصول یافت نشد" />
  return (
    <div className="animate-fade-up">
      <PageHeader back="/shop" title={p.name} subtitle={p.brand} actions={<CartButton kind="product" onClick={() => setCart(true)} />} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink-100 to-violet-100 text-[9rem] dark:from-white/5 dark:to-violet-500/10">
          {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : p.emoji}
        </div>
        <div className="space-y-4">
          <Card>
            <Badge color="violet">{CATEGORIES[p.category]}</Badge>
            <h1 className="mt-2 text-xl font-extrabold leading-9">{p.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-xs text-ink-500">
              <Stars value={p.rating} />
              <span>{num(p.sold)} فروش</span>
              <span>فروشنده: {users[p.sellerId]?.name}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-ink-600 dark:text-ink-300">{p.description}</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                {p.discount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-ink-400 line-through">{toman(p.price)}</span>
                    <Badge color="rose">٪{num(p.discount)} تخفیف</Badge>
                  </div>
                )}
                <div className="text-2xl font-black">{toman(finalPrice(p))}</div>
              </div>
              <div className="text-xs text-ink-400">{p.stock > 0 ? `${num(p.stock)} عدد موجود` : 'ناموجود'}</div>
            </div>
            <Button
              size="lg"
              className="mt-4 w-full"
              disabled={p.stock < 1}
              onClick={() => {
                addToCart('product', p.id)
                toast.success('به سبد اضافه شد')
                setCart(true)
              }}
            >
              افزودن به سبد خرید
            </Button>
          </Card>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Card className="flex items-center gap-2"><ShieldCheck className="text-brand-500" /> ضمانت اصالت کالا</Card>
            <Card className="flex items-center gap-2"><Truck className="text-sky-500" /> ارسال سریع تهران</Card>
          </div>
        </div>
      </div>
      <CartSheet kind="product" open={cart} onClose={() => setCart(false)} />
    </div>
  )
}
