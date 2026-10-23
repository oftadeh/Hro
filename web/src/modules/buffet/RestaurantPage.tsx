import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Clock, MapPin } from 'lucide-react'
import { useDB } from '@/core/db'
import { num } from '@/core/format'
import { addToCart } from '@/core/services/commerce'
import { Card, Cover, Empty, PageHeader, Stars } from '@/ui/kit'
import { toast } from '@/ui/toast'
import { CartSheet } from '@/modules/shop/CartSheet'
import { CartButton } from '@/modules/shop/Shop'
import { FoodRow } from './FoodRow'

export default function RestaurantPage() {
  const { id } = useParams()
  const r = useDB((s) => s.restaurants.find((x) => x.id === id))
  const foods = useDB((s) => s.foods)
  const [cart, setCart] = useState(false)
  if (!r) return <Empty icon="" title="رستوران یافت نشد" />
  const menu = foods.filter((f) => f.restaurantId === r.id && f.available)
  return (
    <div className="animate-fade-up">
      <PageHeader back="/buffet" title={r.name} subtitle={r.description} actions={<CartButton kind="food" onClick={() => setCart(true)} />} />
      <Cover gradient={r.cover} emoji="" className="h-40 rounded-3xl" />
      <Card className="-mt-8 mx-4 relative flex flex-wrap items-center justify-between gap-2 text-xs">
        <Stars value={r.rating} />
        <span className="flex items-center gap-1"><Clock size={14} /> ارسال {num(r.deliveryMinutes)} دقیقه</span>
        <span className="flex items-center gap-1"><MapPin size={14} /> {r.address}</span>
      </Card>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {menu.map((f) => (
          <FoodRow
            key={f.id}
            f={f}
            onAdd={() => {
              addToCart('food', f.id)
              toast.success(`${f.name} اضافه شد`)
            }}
          />
        ))}
      </div>
      <CartSheet kind="food" open={cart} onClose={() => setCart(false)} />
    </div>
  )
}
