/** سبد خرید و سفارش برای فروشگاه و بوفه */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import type { DBState } from '../state'
import { uid, now } from '../id'
import type { CartItem, Coupon, Food, ID, Order, Product, Restaurant, Review } from '../types'
import { applyPayment, notify, reversePayment } from './ledger'
import { addXP } from './engagement'
import { discountPct } from './perks'
import { toman } from '../format'
import { dayKey } from '../format'
import { cityCenter } from '../config'

export const finalPrice = (p: Product) => Math.round((p.price * (100 - p.discount)) / 100)

export const ORDER_STEPS: Record<Order['kind'], Order['status'][]> = {
  shop: ['paid', 'preparing', 'shipped', 'delivered'],
  food: ['paid', 'preparing', 'shipped', 'delivered'],
}
export const ORDER_LABEL: Record<Order['status'], string> = { paid: 'پرداخت شد', preparing: 'در حال آماده‌سازی', shipped: 'ارسال شد', delivered: 'تحویل شد', cancelled: 'لغو شد' }

export function cartOf(userId: string, kind: CartItem['kind']) {
  return (db().carts[userId] ?? []).filter((c) => c.kind === kind)
}

export const addToCart = svc('shop.addToCart', (kind: CartItem['kind'], refId: string, delta: number = 1) => {
  const me = currentUserId()
  if (!Number.isInteger(delta) || Math.abs(delta) > 20) throw new AppError('تعداد معتبر نیست')
  mutate((d) => {
    const cart = (d.carts[me] ??= [])
    if (kind === 'food') {
      const food = d.foods.find((f) => f.id === refId)
      const rest = food && d.restaurants.find((r) => r.id === food.restaurantId)
      if (!food || !food.available || !rest?.approved) throw new AppError('این غذا در دسترس نیست')
      // سفارش غذا فقط از یک رستوران در هر بار
      const other = cart.find((c) => c.kind === 'food' && d.foods.find((f) => f.id === c.refId)?.restaurantId !== food.restaurantId)
      if (other && delta > 0) d.carts[me] = cart.filter((c) => c.kind !== 'food')
    } else {
      const p = d.products.find((x) => x.id === refId)
      if (!p || (p.review && delta > 0)) throw new AppError('محصول یافت نشد')
      const inCart = cart.find((c) => c.kind === 'product' && c.refId === refId)?.qty ?? 0
      if (delta > 0 && inCart + delta > p.stock) throw new AppError(p.stock ? `فقط ${p.stock} عدد موجود است` : 'این محصول ناموجود است')
    }
    const list = d.carts[me]
    const item = list.find((c) => c.kind === kind && c.refId === refId)
    if (item) item.qty += delta
    else if (delta > 0) list.push({ kind, refId, qty: delta })
    d.carts[me] = list.filter((c) => c.qty > 0)
  })
})

export function cartLines(userId: string, kind: CartItem['kind'], s: Pick<DBState, 'carts' | 'products' | 'foods' | 'restaurants'> = db()) {
  return (s.carts[userId] ?? [])
    .filter((c) => c.kind === kind)
    .map((c) => {
      if (kind === 'product') {
        const p = s.products.find((x) => x.id === c.refId)
        return p ? { ...c, name: p.name, price: finalPrice(p), emoji: p.emoji, vendorId: p.sellerId, image: p.image } : null
      }
      const f = s.foods.find((x) => x.id === c.refId)
      const r = f && s.restaurants.find((x) => x.id === f.restaurantId)
      return f && r ? { ...c, name: f.name, price: f.price, emoji: f.emoji, vendorId: r.id, calories: f.calories * c.qty, image: f.image } : null
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
}

/** هزینه‌ی ارسال فروشگاه (بوفه هزینه‌ی ارسال جدا ندارد) */
export function shippingFor(kind: CartItem['kind'], gross: number, s: Pick<DBState, 'settings'> = db()) {
  if (kind !== 'product') return 0
  const fee = s.settings.shippingFee ?? 0
  return gross >= (s.settings.freeShippingOver ?? Infinity) ? 0 : fee
}

/** اعتبارسنجی کد تخفیف و محاسبه‌ی مبلغ آن */
export function couponDiscount(code: string | undefined, module: Coupon['module'], amount: number, userId: ID, s: Pick<DBState, 'coupons'> = db()) {
  if (!code?.trim()) return { discount: 0, coupon: undefined as Coupon | undefined }
  const c = s.coupons.find((x) => x.code.toUpperCase() === code.trim().toUpperCase())
  if (!c || !c.active) throw new AppError('کد تخفیف معتبر نیست')
  if (new Date(c.expiresAt) < new Date()) throw new AppError('کد تخفیف منقضی شده است')
  if (c.module !== 'all' && c.module !== module) throw new AppError('این کد برای این بخش قابل استفاده نیست')
  if (c.usedBy.includes(userId)) throw new AppError('این کد را قبلاً استفاده کرده‌اید')
  if (c.usedBy.length >= c.maxUses) throw new AppError('ظرفیت استفاده از این کد تمام شده است')
  return { discount: Math.min(c.maxAmount, Math.round((amount * c.pct) / 100)), coupon: c }
}

/** بررسی کد تخفیف روی سرور (فهرست کدها هرگز به مرورگر ارسال نمی‌شود) */
export const previewCoupon = svc('shop.couponPreview', (code: string, module: Coupon['module'], amount: number) => couponDiscount(code, module, Math.max(0, amount), currentUserId()).discount)

/** پیش‌نمایش مبالغ سبد */
export function quote(userId: ID, kind: CartItem['kind'], code?: string, s: DBState = db()) {
  const lines = cartLines(userId, kind, s)
  const gross = lines.reduce((a, l) => a + l.price * l.qty, 0)
  const pct = discountPct(userId, kind === 'product' ? 'shop' : 'buffet', s)
  const perk = Math.round((gross * pct) / 100)
  const shipping = shippingFor(kind, gross, s)
  let couponAmt = 0
  let couponError = ''
  try {
    couponAmt = couponDiscount(code, kind === 'product' ? 'shop' : 'buffet', gross - perk, userId, s).discount
  } catch (e) {
    couponError = (e as Error).message
  }
  return { lines, gross, pct, perk, shipping, coupon: couponAmt, couponError, total: gross - perk - couponAmt + shipping }
}

export const checkout = svc('shop.checkout', (kind: CartItem['kind'], address: string, couponCode?: string) => {
  const me = currentUserId()
  if (String(address ?? '').trim().length < 5) throw new AppError('آدرس تحویل را وارد کنید')
  const q = quote(me, kind, couponCode)
  if (!q.lines.length) throw new AppError('سبد خرید خالی است')
  if (q.couponError && couponCode) throw new AppError(q.couponError)
  if (kind === 'food') {
    const r = db().restaurants.find((x) => x.id === q.lines[0].vendorId)
    if (!r?.open || !r.approved) throw new AppError('این رستوران در حال حاضر سفارش نمی‌پذیرد')
  } else if (q.lines.some((l) => db().products.find((p) => p.id === l.refId)?.review)) throw new AppError('یکی از محصولات سبد هنوز تأیید نشده است')
  if ((db().wallets[me] ?? 0) < q.total) throw new AppError(`موجودی کافی نیست. مبلغ سفارش ${toman(q.total)} است`)

  const byVendor = new Map<string, typeof q.lines>()
  q.lines.forEach((l) => byVendor.set(l.vendorId, [...(byVendor.get(l.vendorId) ?? []), l]))
  const orderIds: string[] = []
  mutate((d) => {
    const module = kind === 'product' ? 'shop' : 'buffet'
    let couponLeft = q.coupon
    let shippingLeft = q.shipping
    for (const [vendorId, items] of byVendor) {
      const orderTotal = items.reduce((a, l) => a + l.price * l.qty, 0)
      // سهم این فروشنده از تخفیف کد (به نسبت مبلغ)
      const share = byVendor.size === 1 ? couponLeft : Math.min(couponLeft, Math.round((q.coupon * orderTotal) / q.gross))
      couponLeft -= share
      const orderId = uid('o-')
      const payee = kind === 'product' ? vendorId : d.restaurants.find((r) => r.id === vendorId)!.ownerId
      applyPayment(d, {
        type: kind === 'product' ? 'shop_order' : 'food_order',
        from: me, to: payee, amount: orderTotal, module, refId: orderId, discountPct: q.pct, discountAmount: share,
        description: kind === 'product' ? 'سفارش فروشگاه' : 'سفارش غذای رژیمی',
      })
      // هزینه‌ی ارسال یک بار و بدون کمیسیون به فروشنده‌ی اول
      const ship = shippingLeft
      shippingLeft = 0
      if (ship > 0) applyPayment(d, { type: 'shop_order', from: me, to: payee, amount: ship, commissionPct: 0, refId: orderId, description: 'هزینه‌ی ارسال' })
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
        total: orderTotal, shipping: ship || undefined, discount: share + Math.round((orderTotal * q.pct) / 100) || undefined, coupon: share ? couponCode?.toUpperCase() : undefined,
        address: address.trim().slice(0, 300), status: 'paid', timeline: [{ status: 'paid', at: now() }], createdAt: now(),
      }
      d.orders.unshift(order)
      orderIds.push(orderId)
      notify(d, payee, kind === 'product' ? 'سفارش جدید' : 'سفارش غذای جدید', `مبلغ ${toman(orderTotal)}`, '', kind === 'product' ? '/panel/seller/orders' : '/panel/restaurant/orders')
    }
    if (q.coupon && couponCode) d.coupons.find((c) => c.code.toUpperCase() === couponCode.trim().toUpperCase())!.usedBy.push(me)
    d.carts[me] = (d.carts[me] ?? []).filter((c) => c.kind !== kind)
    addXP(d, me, 20)
    notify(d, me, 'سفارش ثبت شد', `مبلغ ${toman(q.total)} از کیف پول کسر شد.`, '', '/orders')
  })
  return orderIds
})

function vendorOwner(d: DBState, o: Order) {
  return o.kind === 'shop' ? o.vendorId : d.restaurants.find((r) => r.id === o.vendorId)?.ownerId
}

function cancelOrder(d: DBState, o: Order) {
  // بازگشت کامل وجه (کالا + ارسال)؛ سهم فروشنده و کمیسیون برگشت می‌خورد
  d.transactions
    .filter((t) => t.refId === o.id && (t.type === 'shop_order' || t.type === 'food_order'))
    .forEach((t) => reversePayment(d, t, 'بازگشت وجه سفارش لغوشده'))
  if (o.kind === 'shop')
    o.items.forEach((i) => {
      const p = d.products.find((x) => x.id === i.refId)
      if (p) {
        p.stock += i.qty
        p.sold -= i.qty
      }
    })
}

/** تغییر وضعیت سفارش: فروشنده مراحل را جلو می‌برد؛ خریدار فقط پیش از آماده‌سازی لغو می‌کند */
export const setOrderStatus = svc('shop.setStatus', (orderId: string, status: Order['status'], trackingCode?: string) => {
  const me = currentUserId()
  const isAdmin = db().users.find((u) => u.id === me)?.roles.includes('admin')
  mutate((d) => {
    const o = d.orders.find((x) => x.id === orderId)
    if (!o) throw new AppError('سفارش یافت نشد')
    if (o.status === 'cancelled' || o.status === 'delivered') throw new AppError('وضعیت این سفارش قابل تغییر نیست')
    const isVendor = vendorOwner(d, o) === me
    const isBuyer = o.userId === me
    if (status === 'cancelled') {
      if (!(isVendor || isAdmin || (isBuyer && o.status === 'paid'))) throw new AppError(isBuyer ? 'سفارش در حال آماده‌سازی است و قابل لغو نیست' : 'دسترسی ندارید')
      cancelOrder(d, o)
    } else {
      if (!isVendor && !isAdmin) throw new AppError('دسترسی ندارید')
      const steps = ORDER_STEPS[o.kind]
      if (steps.indexOf(status) <= steps.indexOf(o.status)) throw new AppError('وضعیت جدید باید مرحله‌ی بعدی باشد')
    }
    o.status = status
    if (trackingCode) o.trackingCode = trackingCode.slice(0, 40)
    ;(o.timeline ??= []).push({ status, at: now() })
    // غذای تحویل‌شده خودکار در کالری‌شمار ثبت می‌شود
    if (status === 'delivered' && o.kind === 'food') {
      const hour = new Date().getHours()
      const meal = hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 19 ? 'snack' : 'dinner'
      o.items.forEach((i) => {
        const f = d.foods.find((x) => x.id === i.refId)
        if (f) d.meals.push({ id: uid('ml-'), userId: o.userId, day: dayKey(), meal, name: f.name, qty: i.qty, kcal: f.calories * i.qty, protein: f.protein * i.qty, carbs: f.carbs * i.qty, fat: f.fat * i.qty, source: 'buffet', createdAt: now() })
      })
    }
    notify(d, o.userId, 'وضعیت سفارش', `سفارش شما: ${ORDER_LABEL[status]}${o.trackingCode && status === 'shipped' ? ` — کد رهگیری ${o.trackingCode}` : ''}`, '', '/orders')
  })
})

/** نظر و امتیاز پس از تحویل سفارش */
export const reviewOrder = svc('shop.review', (orderId: string, ratings: { refId: string; stars: number; text: string }[]) => {
  const me = currentUserId()
  mutate((d) => {
    const o = d.orders.find((x) => x.id === orderId && x.userId === me)
    if (!o) throw new AppError('سفارش یافت نشد')
    if (o.status !== 'delivered') throw new AppError('پس از تحویل می‌توانید نظر بدهید')
    if (o.reviewed) throw new AppError('برای این سفارش قبلاً نظر داده‌اید')
    for (const r of ratings) {
      if (!o.items.some((i) => i.refId === r.refId)) continue
      const stars = Math.min(5, Math.max(1, Math.round(r.stars)))
      const kind: Review['kind'] = o.kind === 'shop' ? 'product' : 'food'
      d.reviews.unshift({ id: uid('rv-'), kind, refId: r.refId, userId: me, stars, text: String(r.text ?? '').slice(0, 600), createdAt: now() })
      if (kind === 'product') {
        const p = d.products.find((x) => x.id === r.refId)
        if (p) {
          const n = d.reviews.filter((x) => x.kind === 'product' && x.refId === p.id).length
          p.rating = Math.round(((p.rating * (n - 1) + stars) / n) * 100) / 100
        }
      } else {
        const rest = d.restaurants.find((x) => x.id === o.vendorId)
        if (rest) {
          const ids = d.foods.filter((f) => f.restaurantId === rest.id).map((f) => f.id)
          const all = d.reviews.filter((x) => x.kind === 'food' && ids.includes(x.refId))
          rest.rating = Math.round((all.reduce((a, x) => a + x.stars, 0) / all.length) * 100) / 100
        }
      }
    }
    o.reviewed = true
    addXP(d, me, 10)
  })
})

/** پاسخ فروشنده/باشگاه/رستوران به نظر */
export const replyReview = svc('review.reply', (reviewId: string, text: string) => {
  const me = currentUserId()
  mutate((d) => {
    const r = d.reviews.find((x) => x.id === reviewId)
    if (!r) throw new AppError('نظر یافت نشد')
    const owner =
      r.kind === 'gym' ? d.gyms.find((g) => g.id === r.refId)?.ownerId
      : r.kind === 'product' ? d.products.find((p) => p.id === r.refId)?.sellerId
      : r.kind === 'food' ? d.restaurants.find((x) => x.id === d.foods.find((f) => f.id === r.refId)?.restaurantId)?.ownerId
      : r.refId
    if (owner !== me) throw new AppError('فقط صاحب کسب‌وکار می‌تواند پاسخ دهد')
    r.reply = text.trim().slice(0, 400)
    notify(d, r.userId, 'پاسخ به نظر شما', r.reply.slice(0, 80), '')
  })
})

const PRODUCT_FIELDS = ['name', 'brand', 'category', 'price', 'discount', 'stock', 'description', 'image', 'emoji', 'licenseCode'] as const
/** تغییر این فیلدها در محصول منتشرشده، بررسی دوباره‌ی مدیر لازم دارد */
const PRODUCT_REVIEW_FIELDS = ['name', 'brand', 'category', 'description', 'image', 'licenseCode'] as const
const PRODUCT_CATEGORIES = ['supplement', 'equipment', 'apparel', 'accessory']
const RESTAURANT_FIELDS = ['name', 'description', 'address', 'lat', 'lng', 'deliveryMinutes', 'open', 'cover'] as const
const FOOD_FIELDS = ['name', 'description', 'price', 'calories', 'protein', 'carbs', 'fat', 'tags', 'emoji', 'image', 'available', 'restaurantId'] as const
function pick<T extends object, K extends keyof T>(input: Partial<T>, keys: readonly K[]) {
  const out: Partial<T> = {}
  for (const k of keys) if (k in input) out[k] = input[k]
  return out
}

/** موارد ناقص محصول برای انتشار؛ همان فهرست در فرم فروشنده */
export function productMissing(p: Partial<Product>): string[] {
  const out: string[] = []
  if ((p.name ?? '').trim().length < 3) out.push('نام محصول')
  if (!(p.price && p.price >= 1000)) out.push('قیمت')
  if (!PRODUCT_CATEGORIES.includes(p.category ?? '')) out.push('دسته‌بندی')
  if (!p.image) out.push('تصویر واقعی محصول')
  if ((p.description ?? '').trim().length < 20) out.push('توضیحات (حداقل ۲۰ حرف)')
  if (p.category === 'supplement' && (p.licenseCode ?? '').trim().length < 4) out.push('کد IRC یا پروانه‌ی بهداشت مکمل')
  return out
}

export const saveProduct = svc(
  'shop.saveProduct',
  (input: Partial<Product>) => {
    const me = currentUserId()
    if (input.price !== undefined && input.price < 1000) throw new AppError('قیمت معتبر نیست')
    if (input.discount !== undefined && (input.discount < 0 || input.discount > 90)) throw new AppError('تخفیف باید بین ۰ تا ۹۰ درصد باشد')
    if (input.stock !== undefined && (input.stock < 0 || !Number.isInteger(input.stock))) throw new AppError('موجودی معتبر نیست')
    const data = pick(input, PRODUCT_FIELDS)
    for (const k of ['name', 'brand', 'licenseCode'] as const) if (data[k] !== undefined) data[k] = String(data[k] ?? '').trim().slice(0, 80)
    if (data.description !== undefined) data.description = String(data.description ?? '').trim().slice(0, 2000)
    mutate((d) => {
      const ex = input.id ? d.products.find((p) => p.id === input.id) : undefined
      if (input.id && ex?.sellerId !== me) throw new AppError('محصول یافت نشد')
      if (ex?.review?.status === 'rejected') throw new AppError('این محصول رد شده است و قابل ویرایش نیست')
      const missing = productMissing({ ...(ex ?? {}), ...data })
      if (missing.length) throw new AppError(`برای انتشار محصول این موارد لازم است: ${missing.join('، ')}`)
      const admins = d.users.filter((u) => u.roles.includes('admin'))
      if (ex) {
        const needsReview = PRODUCT_REVIEW_FIELDS.some((k) => k in data && data[k] !== ex[k])
        Object.assign(ex, data)
        if (needsReview || ex.review?.status === 'changes') {
          const was = ex.review?.status
          ex.review = { status: 'pending', note: ex.review?.note, at: now() }
          if (was !== 'pending') admins.forEach((a) => notify(d, a.id, 'محصول برای بررسی', `«${ex.name}»`, '', '/panel/admin/approvals'))
        }
      } else {
        d.products.unshift({
          brand: '', category: 'supplement', discount: 0, stock: 0, description: '', emoji: '', ...data,
          id: uid('p-'), sellerId: me, rating: 5, sold: 0, createdAt: now(), review: { status: 'pending', at: now() },
        } as Product)
        admins.forEach((a) => notify(d, a.id, 'محصول جدید برای بررسی', `«${data.name}»`, '', '/panel/admin/approvals'))
      }
    })
  },
  { roles: ['seller'] },
)

/** بررسی محصول توسط مدیر */
export const reviewProduct = svc(
  'shop.reviewProduct',
  (productId: string, decision: 'approve' | 'changes' | 'reject', note?: string) => {
    const n = String(note ?? '').trim().slice(0, 500)
    if (!['approve', 'changes', 'reject'].includes(decision)) throw new AppError('تصمیم نامعتبر است')
    if (decision !== 'approve' && n.length < 5) throw new AppError(decision === 'reject' ? 'دلیل رد را بنویسید' : 'موارد لازم برای اصلاح را بنویسید')
    mutate((d) => {
      const p = d.products.find((x) => x.id === productId)
      if (!p) throw new AppError('محصول یافت نشد')
      if (decision === 'approve') {
        const missing = productMissing(p)
        if (missing.length) throw new AppError(`ناقص است: ${missing.join('، ')}`)
        p.review = undefined
        notify(d, p.sellerId, 'محصول شما منتشر شد', `«${p.name}» در فروشگاه نمایش داده می‌شود.`, '', '/panel/seller')
      } else {
        p.review = { status: decision === 'reject' ? 'rejected' : 'changes', note: n, at: now() }
        // از سبدهای خرید دیگران برداشته می‌شود
        for (const k of Object.keys(d.carts)) d.carts[k] = d.carts[k].filter((c) => !(c.kind === 'product' && c.refId === p.id))
        notify(d, p.sellerId, decision === 'reject' ? 'محصول شما رد شد' : 'محصول شما نیاز به اصلاح دارد', `«${p.name}»: ${n}`, '', '/panel/seller')
      }
    })
  },
  { roles: ['admin'] },
)

export const deleteProduct = svc(
  'shop.deleteProduct',
  (id: string) => {
    const me = currentUserId()
    mutate((d) => {
      d.products = d.products.filter((p) => !(p.id === id && p.sellerId === me))
    })
  },
  { roles: ['seller'] },
)

export const saveRestaurant = svc(
  'buffet.saveRestaurant',
  (input: Partial<Restaurant>) => {
    const me = currentUserId()
    const data = pick(input, RESTAURANT_FIELDS)
    if (data.name !== undefined && String(data.name).trim().length < 2) throw new AppError('نام رستوران را بنویسید')
    if (data.address !== undefined && String(data.address).trim().length < 8) throw new AppError('نشانی کامل رستوران را بنویسید')
    if (data.deliveryMinutes !== undefined && !(data.deliveryMinutes >= 10 && data.deliveryMinutes <= 180)) throw new AppError('زمان ارسال باید بین ۱۰ تا ۱۸۰ دقیقه باشد')
    if (data.lat !== undefined || data.lng !== undefined) {
      const lat = Number(data.lat), lng = Number(data.lng)
      if (!(lat >= 25 && lat <= 40 && lng >= 44 && lng <= 63.5)) throw new AppError('موقعیت رستوران باید داخل ایران باشد؛ روی نقشه انتخاب کنید')
    }
    mutate((d) => {
      const ex = input.id ? d.restaurants.find((r) => r.id === input.id) : undefined
      if (input.id && ex?.ownerId !== me) throw new AppError('رستوران یافت نشد')
      if (ex?.review?.status === 'rejected') throw new AppError('ثبت این رستوران رد شده است؛ برای بررسی دوباره با پشتیبانی تماس بگیرید')
      if (ex) {
        Object.assign(ex, data)
        // ویرایش پس از «نیاز به اصلاح» دوباره برای بررسی فرستاده می‌شود
        if (ex.review?.status === 'changes' && Object.keys(data).some((k) => k !== 'open')) {
          ex.review = { status: 'pending', note: ex.review.note, at: now() }
          d.users.filter((u) => u.roles.includes('admin')).forEach((a) => notify(d, a.id, 'رستوران اصلاح‌شده برای بررسی', `«${ex.name}»`, '', '/panel/admin/approvals'))
        }
      } else {
        if (!String(data.name ?? '').trim() || String(data.address ?? '').trim().length < 8) throw new AppError('نام و نشانی کامل رستوران الزامی است')
        if (String(data.description ?? '').trim().length < 10) throw new AppError('توضیح کوتاهی درباره‌ی رستوران و غذاها بنویسید')
        const [lat, lng] = cityCenter(d.users.find((u) => u.id === me)?.city)
        if (data.lat === undefined || (Math.abs(Number(data.lat) - lat) < 1e-4 && Math.abs(Number(data.lng) - lng) < 1e-4)) throw new AppError('موقعیت دقیق رستوران را روی نقشه انتخاب کنید')
        d.restaurants.unshift({
          name: 'رستوران من', description: '', address: '', lat, lng, cover: 'from-ink-700 via-ink-800 to-brand-600', deliveryMinutes: 40, open: true, ...data,
          id: uid('r-'), ownerId: me, rating: 5, approved: false,
        } as Restaurant)
        d.users.filter((u) => u.roles.includes('admin')).forEach((a) => notify(d, a.id, 'رستوران جدید در انتظار تأیید', `«${data.name ?? 'رستوران'}» ثبت شد.`, '', '/panel/admin/approvals'))
      }
    })
  },
  { roles: ['restaurant'] },
)

export const saveFood = svc(
  'buffet.saveFood',
  (input: Partial<Food>) => {
    const me = currentUserId()
    if (String(input.name ?? '').trim().length < 2 || !input.restaurantId) throw new AppError('نام غذا و رستوران الزامی است')
    if (!(Number(input.price) >= 10_000 && Number(input.price) <= 20_000_000)) throw new AppError('قیمت غذا معتبر نیست (حداقل ۱۰ هزار تومان)')
    if (!(Number(input.calories ?? 0) >= 0 && Number(input.calories ?? 0) <= 5000)) throw new AppError('کالری معتبر نیست')
    for (const k of ['protein', 'carbs', 'fat'] as const) if (!(Number(input[k] ?? 0) >= 0 && Number(input[k] ?? 0) <= 500)) throw new AppError('مقدار درشت‌مغذی‌ها معتبر نیست')
    const data = pick(input, FOOD_FIELDS)
    mutate((d) => {
      const rest = d.restaurants.find((r) => r.id === input.restaurantId && r.ownerId === me)
      if (!rest) throw new AppError('رستوران یافت نشد')
      const ex = input.id ? d.foods.find((f) => f.id === input.id) : undefined
      if (ex && !d.restaurants.some((r) => r.id === ex.restaurantId && r.ownerId === me)) throw new AppError('غذا یافت نشد')
      if (ex) Object.assign(ex, data)
      else d.foods.unshift({ description: '', calories: 0, protein: 0, carbs: 0, fat: 0, tags: [], emoji: '', available: true, ...data, id: uid('f-') } as Food)
    })
  },
  { roles: ['restaurant'] },
)

export const deleteFood = svc(
  'buffet.deleteFood',
  (id: string) => {
    const me = currentUserId()
    mutate((d) => {
      const mine = d.restaurants.filter((r) => r.ownerId === me).map((r) => r.id)
      d.foods = d.foods.filter((f) => !(f.id === id && mine.includes(f.restaurantId)))
    })
  },
  { roles: ['restaurant'] },
)
