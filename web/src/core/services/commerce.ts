/** سبد خرید و سفارش برای فروشگاه و بوفه */
import { AppError, mutate, currentUserId, db } from '../db'
import { uid, now } from '../id'
import type { CartItem, Food, Order, Product, Restaurant } from '../types'
import { applyPayment, notify } from './ledger'
import { addXP } from './engagement'
import { discountPct } from './perks'
import { toman } from '../format'

export const finalPrice = (p: Product) => Math.round((p.price * (100 - p.discount)) / 100)

export function cartOf(userId: string, kind: CartItem['kind']) {
  return (db().carts[userId] ?? []).filter((c) => c.kind === kind)
}

export function addToCart(kind: CartItem['kind'], refId: string, delta = 1) {
  const me = currentUserId()
  mutate((d) => {
    const cart = (d.carts[me] ??= [])
    if (kind === 'food') {
      // سفارش غذا فقط از یک رستوران در هر بار
      const food = d.foods.find((f) => f.id === refId)!
      const other = cart.find((c) => c.kind === 'food' && d.foods.find((f) => f.id === c.refId)?.restaurantId !== food.restaurantId)
      if (other && delta > 0) {
        d.carts[me] = cart.filter((c) => c.kind !== 'food')
      }
    }
    const list = d.carts[me]
    const item = list.find((c) => c.kind === kind && c.refId === refId)
    if (item) item.qty += delta
    else if (delta > 0) list.push({ kind, refId, qty: delta })
    d.carts[me] = list.filter((c) => c.qty > 0)
  })
}

export function cartLines(userId: string, kind: CartItem['kind']) {
  const s = db()
  return cartOf(userId, kind)
    .map((c) => {
      if (kind === 'product') {
        const p = s.products.find((x) => x.id === c.refId)
        return p ? { ...c, name: p.name, price: finalPrice(p), emoji: p.emoji, vendorId: p.sellerId } : null
      }
      const f = s.foods.find((x) => x.id === c.refId)
      const r = f && s.restaurants.find((x) => x.id === f.restaurantId)
      return f && r ? { ...c, name: f.name, price: f.price, emoji: f.emoji, vendorId: r.id, calories: f.calories * c.qty } : null
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
}

export function checkout(kind: CartItem['kind'], address: string) {
  const me = currentUserId()
  if (address.trim().length < 5) throw new AppError('آدرس تحویل را وارد کنید')
  const lines = cartLines(me, kind)
  if (!lines.length) throw new AppError('سبد خرید خالی است')
  const gross = lines.reduce((a, l) => a + l.price * l.qty, 0)
  const pct = discountPct(me, kind === 'product' ? 'shop' : 'buffet')
  const total = gross - Math.round((gross * pct) / 100)
  if ((db().wallets[me] ?? 0) < total) throw new AppError(`موجودی کافی نیست. مبلغ سفارش ${toman(total)} است`)

  const byVendor = new Map<string, typeof lines>()
  lines.forEach((l) => byVendor.set(l.vendorId, [...(byVendor.get(l.vendorId) ?? []), l]))
  const orderIds: string[] = []
  mutate((d) => {
    for (const [vendorId, items] of byVendor) {
      const orderTotal = items.reduce((a, l) => a + l.price * l.qty, 0)
      const orderId = uid('o-')
      const payee = kind === 'product' ? vendorId : d.restaurants.find((r) => r.id === vendorId)!.ownerId
      applyPayment(d, {
        type: kind === 'product' ? 'shop_order' : 'food_order',
        from: me, to: payee, amount: orderTotal, module: kind === 'product' ? 'shop' : 'buffet', refId: orderId, discountPct: pct,
        description: kind === 'product' ? 'سفارش فروشگاه' : 'سفارش غذای رژیمی',
      })
      if (kind === 'product') {
        items.forEach((l) => {
          const p = d.products.find((x) => x.id === l.refId)!
          if (p.stock < l.qty) throw new AppError(`موجودی «${p.name}» کافی نیست`)
          p.stock -= l.qty
          p.sold += l.qty
        })
      }
      const order: Order = {
        id: orderId, kind: kind === 'product' ? 'shop' : 'food', userId: me, vendorId,
        items: items.map((l) => ({ refId: l.refId, name: l.name, price: l.price, qty: l.qty })),
        total: orderTotal, address, status: 'paid', createdAt: now(),
      }
      d.orders.unshift(order)
      orderIds.push(orderId)
      notify(d, payee, kind === 'product' ? 'سفارش جدید' : 'سفارش غذای جدید', `مبلغ ${toman(orderTotal)}`, kind === 'product' ? '' : '', kind === 'product' ? '/panel/seller/orders' : '/panel/restaurant/orders')
    }
    d.carts[me] = (d.carts[me] ?? []).filter((c) => c.kind !== kind)
    addXP(d, me, 20)
    notify(d, me, 'سفارش ثبت شد', `مبلغ ${toman(total)} از کیف پول کسر شد.`, '', '/orders')
  })
  return orderIds
}

export function setOrderStatus(orderId: string, status: Order['status']) {
  mutate((d) => {
    const o = d.orders.find((x) => x.id === orderId)
    if (!o || o.status === 'cancelled' || o.status === 'delivered') return
    if (status === 'cancelled') {
      // بازگشت کامل وجه به خریدار؛ سهم فروشنده و کمیسیون برگشت می‌خورد
      const tx = d.transactions.find((t) => t.refId === o.id && (t.type === 'shop_order' || t.type === 'food_order'))
      if (tx) {
        d.wallets[tx.to] = (d.wallets[tx.to] ?? 0) - (tx.amount - tx.commission)
        d.wallets.platform = (d.wallets.platform ?? 0) - tx.commission
        // تخفیفی که کی‌فیت پرداخته بود به حساب پلتفرم برمی‌گردد
        const paid = tx.amount - (tx.discount ?? 0)
        d.wallets.platform += tx.discount ?? 0
        d.wallets[o.userId] = (d.wallets[o.userId] ?? 0) + paid
        d.transactions.unshift({ id: uid('tx-'), type: 'refund', from: tx.to, to: o.userId, amount: paid, commission: 0, refId: o.id, description: 'بازگشت وجه سفارش لغوشده', createdAt: now() })
      }
      if (o.kind === 'shop')
        o.items.forEach((i) => {
          const p = d.products.find((x) => x.id === i.refId)
          if (p) {
            p.stock += i.qty
            p.sold -= i.qty
          }
        })
    }
    o.status = status
    const labels: Record<Order['status'], string> = { paid: 'پرداخت شد', preparing: 'در حال آماده‌سازی', shipped: 'ارسال شد', delivered: 'تحویل شد', cancelled: 'لغو شد' }
    notify(d, o.userId, 'وضعیت سفارش', `سفارش شما: ${labels[status]}`, '', '/orders')
  })
}

export function saveProduct(input: Partial<Product>) {
  const me = currentUserId()
  if (!input.name?.trim() || !input.price) throw new AppError('نام و قیمت محصول الزامی است')
  mutate((d) => {
    const ex = input.id ? d.products.find((p) => p.id === input.id && p.sellerId === me) : undefined
    if (ex) Object.assign(ex, input)
    else
      d.products.unshift({
        id: uid('p-'), sellerId: me, name: '', brand: '', category: 'supplement', price: 0, discount: 0, stock: 0,
        description: '', emoji: '', rating: 5, sold: 0, createdAt: now(), ...input,
      } as Product)
  })
}

export function deleteProduct(id: string) {
  const me = currentUserId()
  mutate((d) => {
    d.products = d.products.filter((p) => !(p.id === id && p.sellerId === me))
  })
}

export function saveRestaurant(input: Partial<Restaurant>) {
  const me = currentUserId()
  mutate((d) => {
    const ex = input.id ? d.restaurants.find((r) => r.id === input.id && r.ownerId === me) : undefined
    if (ex) Object.assign(ex, input)
    else
      d.restaurants.unshift({
        id: uid('r-'), ownerId: me, name: 'رستوران من', description: '', address: '', lat: 35.72, lng: 51.39,
        cover: 'from-ink-700 via-ink-800 to-brand-600', rating: 5, deliveryMinutes: 40, open: true, approved: true, ...input,
      } as Restaurant)
  })
}

export function saveFood(input: Partial<Food>) {
  if (!input.name?.trim() || !input.price || !input.restaurantId) throw new AppError('نام، قیمت و رستوران الزامی است')
  mutate((d) => {
    const ex = input.id ? d.foods.find((f) => f.id === input.id) : undefined
    if (ex) Object.assign(ex, input)
    else
      d.foods.unshift({
        id: uid('f-'), description: '', calories: 0, protein: 0, carbs: 0, fat: 0, tags: [], emoji: '', available: true, ...input,
      } as Food)
  })
}

export function deleteFood(id: string) {
  mutate((d) => {
    d.foods = d.foods.filter((f) => f.id !== id)
  })
}
