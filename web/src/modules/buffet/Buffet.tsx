import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useDB } from '@/core/db'
import { num } from '@/core/format'
import { addToCart } from '@/core/services/commerce'
import { Badge, Chips, Cover, PageHeader, SectionTitle, Stars, Orbs } from '@/ui/kit'
import { toast } from '@/ui/toast'
import { CartSheet } from '@/modules/shop/CartSheet'
import { CartButton } from '@/modules/shop/Shop'
import { FoodRow } from './FoodRow'
import { SaladBowl } from '@/ui/art'

export default function Buffet() {
  const restaurants = useDB((s) => s.restaurants)
  const foods = useDB((s) => s.foods)
  const [tag, setTag] = useState('all')
  const [cart, setCart] = useState(false)
  const tags = useMemo(() => [...new Set(foods.flatMap((f) => f.tags))], [foods])
  const filtered = foods.filter((f) => f.available && (tag === 'all' || f.tags.includes(tag)))

  return (
    <div className="animate-fade-up">
      <PageHeader title="بوفه" subtitle="غذای رژیمی و سالم از رستوران‌های اطراف" actions={<CartButton kind="food" onClick={() => setCart(true)} />} />
      <div className="relative mb-6 min-h-[10rem] overflow-hidden rounded-[2rem] bg-ink-850 p-6 text-white">
        <Orbs seed="buffet" intensity={0.8} />
        <SaladBowl size={140} className="pointer-events-none absolute -bottom-3 left-3" />
        <div className="relative max-w-[60%]">
          <div className="text-[12px] text-white/70">تغذیه‌ی هوشمند</div>
          <div className="mt-2 font-display text-[2rem] leading-[1.1]">غذای سالم، با کالری دقیق</div>
          <div className="mt-1 text-[13px] text-white/75">با تخفیف ویژه‌ی اعضای کی‌فیت</div>
        </div>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {restaurants.filter((r) => r.approved).map((r) => (
          <Link key={r.id} to={`/buffet/${r.id}`} className="w-64 shrink-0 overflow-hidden rounded-2xl bg-white shadow-card dark:border dark:border-white/[.07] dark:bg-ink-900/70 dark:shadow-none">
            <Cover gradient={r.cover} emoji="" className="h-24" />
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{r.name}</div>
                <Stars value={r.rating} />
              </div>
              <div className="truncate text-xs text-ink-500">{r.description}</div>
              <div className="mt-1 flex items-center gap-1 text-[12px] text-ink-400">
                <Clock size={12} /> {num(r.deliveryMinutes)} دقیقه {!r.open && <Badge color="rose">بسته</Badge>}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <SectionTitle title="منوی سالم امروز" />
      <Chips value={tag} onChange={setTag} items={[{ value: 'all', label: 'همه' }, ...tags.map((t) => ({ value: t, label: t }))]} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {filtered.map((f) => (
          <FoodRow
            key={f.id}
            f={f}
            restaurant={restaurants.find((r) => r.id === f.restaurantId)?.name}
            onAdd={() => {
              addToCart('food', f.id)
              toast.success(`${f.name} اضافه شد`)
            }}
          />
        ))}
      </div>
      <CartSheet kind="food" open={cart} onClose={() => setCart(false)} />
      <p className="mt-6 text-center text-xs text-ink-400">در هر سفارش می‌توانید از یک رستوران خرید کنید. قیمت‌ها شامل هزینه‌ی ارسال است.</p>
    </div>
  )
}
