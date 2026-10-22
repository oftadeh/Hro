import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShoppingCart } from 'lucide-react'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { addToCart, finalPrice } from '@/core/services/commerce'
import type { Product } from '@/core/types'
import { Badge, Button, Chips, Input, PageHeader, Stars } from '@/ui/kit'
import { toast } from '@/ui/toast'
import { CartSheet, useCartCount } from './CartSheet'

export const CATEGORIES: Record<Product['category'], string> = { supplement: '💊 مکمل', equipment: '🏋️ تجهیزات', apparel: '👕 پوشاک', accessory: '⌚ لوازم جانبی' }

export function CartButton({ kind, onClick }: { kind: 'product' | 'food'; onClick: () => void }) {
  const count = useCartCount(kind)
  return (
    <Button variant="dark" size="sm" onClick={onClick} icon={<ShoppingCart size={16} />}>
      {count > 0 ? num(count) : 'سبد'}
    </Button>
  )
}

export default function Shop() {
  const products = useDB((s) => s.products)
  const [cat, setCat] = useState<'all' | Product['category']>('all')
  const [q, setQ] = useState('')
  const [cart, setCart] = useState(false)
  const list = useMemo(() => products.filter((p) => (cat === 'all' || p.category === cat) && (!q || p.name.includes(q) || p.brand.toLowerCase().includes(q.toLowerCase()))), [products, cat, q])

  return (
    <div className="animate-fade-up">
      <PageHeader title="فروشگاه" subtitle="مکمل اصل و لوازم ورزشی با ضمانت" actions={<CartButton kind="product" onClick={() => setCart(true)} />} />
      <div className="relative mb-3 overflow-hidden rounded-[2rem] bg-gradient-to-l from-violet-600 to-fuchsia-500 p-5 text-white">
        <div className="text-xs opacity-80">جشنواره‌ی پاییزه</div>
        <div className="text-xl font-black">تا ۲۰٪ تخفیف مکمل‌ها 🔥</div>
        <div className="text-xs opacity-80">ارسال رایگان برای خریدهای بالای ۲ میلیون</div>
        <div className="absolute -left-4 -top-2 text-8xl opacity-30">💊</div>
      </div>
      <div className="relative mb-3">
        <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی محصول یا برند…" className="pr-10" />
      </div>
      <Chips value={cat} onChange={setCat} items={[{ value: 'all', label: 'همه' }, ...Object.entries(CATEGORIES).map(([value, label]) => ({ value: value as Product['category'], label }))]} />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      <CartSheet kind="product" open={cart} onClose={() => setCart(false)} />
    </div>
  )
}

function ProductCard({ p }: { p: Product }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-card dark:border dark:border-white/[.07] dark:bg-ink-900/70 dark:shadow-none">
      <Link to={`/shop/${p.id}`} className="relative flex h-36 items-center justify-center bg-gradient-to-br from-ink-50 to-violet-50 text-6xl dark:from-white/5 dark:to-violet-500/10">
        {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : p.emoji}
        {p.discount > 0 && <Badge color="rose" className="absolute right-2 top-2">٪{num(p.discount)}</Badge>}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <div className="text-[11px] text-ink-400">{p.brand}</div>
        <Link to={`/shop/${p.id}`} className="line-clamp-2 text-sm font-bold leading-6">{p.name}</Link>
        <div className="mt-1"><Stars value={p.rating} /></div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {p.discount > 0 && <div className="text-[11px] text-ink-400 line-through">{num(p.price)}</div>}
            <div className="text-sm font-black">{toman(finalPrice(p))}</div>
          </div>
          <button
            disabled={p.stock < 1}
            onClick={() => {
              addToCart('product', p.id)
              toast.success('به سبد اضافه شد')
            }}
            className="rounded-xl bg-violet-600 p-2 text-white disabled:opacity-40"
            aria-label="افزودن به سبد"
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
