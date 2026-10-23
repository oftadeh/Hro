import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShoppingCart } from 'lucide-react'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { addToCart, finalPrice } from '@/core/services/commerce'
import type { Product } from '@/core/types'
import { Badge, Button, Chips, Input, Orbs, PageHeader, Stars } from '@/ui/kit'
import { toast } from '@/ui/toast'
import { CartSheet, useCartCount } from './CartSheet'
import { CategoryIcon } from '@/ui/icons'
import { Shaker } from '@/ui/art'

export const CATEGORIES: Record<Product['category'], string> = { supplement: 'مکمل', equipment: 'تجهیزات', apparel: 'پوشاک', accessory: 'لوازم جانبی' }

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
      <Link to="/market" className="mb-4 flex items-center justify-between rounded-2xl bg-ink-900/[.04] px-4 py-3 text-sm dark:bg-white/[.05]">
        <span>بازار دست‌دوم: خرید و فروش لوازم کارکرده با خرید امن</span>
        <span className="text-xs text-ink-500">ورود ←</span>
      </Link>
      <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-ink-850 p-6 text-white min-h-[10rem]">
        <Orbs seed="shop" intensity={0.8} />
        <Shaker size={120} className="pointer-events-none absolute -bottom-2 left-4" />
        <div className="relative max-w-[62%]">
          <div className="text-[11px] text-white/70">مجموعه‌ی پاییز</div>
          <div className="mt-2 font-display text-[2rem] leading-[1.1]">تا ۲۰٪ تخفیف مکمل‌های منتخب</div>
          <div className="mt-1 text-[13px] text-white/75">ارسال رایگان برای خریدهای بالای ۲ میلیون تومان</div>
        </div>
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
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card dark:border dark:border-white/[.07] dark:bg-ink-900/70 dark:shadow-none">
      <Link to={`/shop/${p.id}`} className="relative flex aspect-[4/3] items-center justify-center bg-ink-900/[.035] dark:bg-white/[.04]">
        {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <CategoryIcon category={p.category} size={36} className="text-ink-400" />}
        {p.discount > 0 && <Badge color="rose" className="absolute right-2 top-2">٪{num(p.discount)}</Badge>}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <div className="text-[11px] text-ink-400">{p.brand}</div>
        <Link to={`/shop/${p.id}`} className="line-clamp-2 text-sm font-semibold leading-6">{p.name}</Link>
        <div className="mt-1"><Stars value={p.rating} /></div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {p.discount > 0 && <div className="text-[11px] text-ink-400 line-through">{num(p.price)}</div>}
            <div className="text-sm font-semibold">{toman(finalPrice(p))}</div>
          </div>
          <button
            disabled={p.stock < 1}
            onClick={() => {
              addToCart('product', p.id)
              toast.success('به سبد اضافه شد')
            }}
            className="rounded-full border hairline p-2 text-ink-800 transition hover:bg-ink-950 hover:text-white disabled:opacity-40 dark:text-ink-100 dark:hover:bg-brand-300 dark:hover:text-ink-950"
            aria-label="افزودن به سبد"
          >
            <ShoppingCart size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
