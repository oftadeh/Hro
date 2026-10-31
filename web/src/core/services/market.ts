/**
 * بازار دست‌دوم لوازم ورزشی با «خرید امن»:
 *  ۱. خریدار پرداخت می‌کند؛ پول در صندوق امانی کی‌فیت می‌ماند و آگهی «رزرو» می‌شود.
 *  ۲. فروشنده ارسال (یا تحویل حضوری) را ثبت می‌کند.
 *  ۳. خریدار دریافت را تأیید می‌کند ← مبلغ پس از کمیسیون به فروشنده واریز می‌شود.
 *     اگر خریدار ۷ روز پس از ارسال پاسخ ندهد، مبلغ خودکار آزاد می‌شود.
 *  پیش از ارسال، خریدار یا فروشنده می‌تواند معامله را لغو کند و پول کامل برمی‌گردد.
 */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import type { DBState } from '../state'
import { uid, now } from '../id'
import type { Listing } from '../types'
import { applyPayment, notify, reversePayment } from './ledger'
import { LISTING_CATEGORY, LISTING_CONDITION, cleanCity } from '../config'
import { toman } from '../format'

export const AUTO_RELEASE_DAYS = 7
const MAX_ACTIVE = 20

type ListingInput = Pick<Listing, 'title' | 'category' | 'condition' | 'price' | 'description' | 'photos' | 'city'>

function clean(input: ListingInput) {
  const title = String(input.title ?? '').trim()
  if (title.length < 4) throw new AppError('عنوان آگهی را کامل بنویسید')
  if (!(input.category in LISTING_CATEGORY)) throw new AppError('دسته‌بندی معتبر نیست')
  if (!(input.condition in LISTING_CONDITION)) throw new AppError('وضعیت کالا را انتخاب کنید')
  if (!(input.price >= 10_000 && input.price <= 500_000_000)) throw new AppError('قیمت معتبر نیست')
  const photos = (input.photos ?? []).filter((p) => typeof p === 'string' && p.length < 3_000_000).slice(0, 6)
  if (!photos.length) throw new AppError('حداقل یک عکس از کالا بگذارید')
  const city = cleanCity(input.city)
  if (city.length < 2) throw new AppError('شهر محل فروش را بنویسید')
  return { title: title.slice(0, 80), category: input.category, condition: input.condition, price: Math.round(input.price), description: String(input.description ?? '').slice(0, 1500), photos, city }
}

export const createListing = svc('market.create', (input: ListingInput) => {
  const me = currentUserId()
  const data = clean(input)
  if (db().listings.filter((l) => l.sellerId === me && l.status === 'active').length >= MAX_ACTIVE) throw new AppError(`حداکثر ${MAX_ACTIVE} آگهی فعال`)
  const id = uid('ls-')
  mutate((d) => {
    d.listings.unshift({ ...data, id, sellerId: me, status: 'active', createdAt: now() })
  })
  return id
})

export const updateListing = svc('market.update', (id: string, input: ListingInput) => {
  const me = currentUserId()
  const l = db().listings.find((x) => x.id === id && x.sellerId === me)
  if (!l) throw new AppError('آگهی یافت نشد')
  if (l.status !== 'active') throw new AppError('آگهی رزروشده یا فروخته‌شده قابل ویرایش نیست')
  const data = clean(input)
  mutate((d) => {
    Object.assign(d.listings.find((x) => x.id === id)!, data)
  })
})

export const removeListing = svc('market.remove', (id: string) => {
  const me = currentUserId()
  const admin = db().users.find((u) => u.id === me)?.roles.includes('admin')
  const l = db().listings.find((x) => x.id === id && (x.sellerId === me || admin))
  if (!l) throw new AppError('آگهی یافت نشد')
  if (l.status === 'reserved') throw new AppError('ابتدا معامله‌ی در جریان باید تکمیل یا لغو شود')
  mutate((d) => {
    const x = d.listings.find((y) => y.id === id)!
    x.status = 'removed'
    if (admin && x.sellerId !== me) notify(d, x.sellerId, 'آگهی شما حذف شد', `«${x.title}» به دلیل مغایرت با قوانین حذف شد.`, '', '/market')
  })
})

/** گفتگو با فروشنده درباره‌ی آگهی */
export const contactSeller = svc('market.contact', (id: string) => {
  const me = currentUserId()
  const l = db().listings.find((x) => x.id === id)
  if (!l || l.status === 'removed') throw new AppError('آگهی یافت نشد')
  if (l.sellerId === me) throw new AppError('این آگهی خودتان است')
  const seller = db().users.find((u) => u.id === l.sellerId)
  if (seller?.blockedUsers?.includes(me)) throw new AppError('امکان گفتگو با این کاربر نیست')
  let threadId = db().threads.find((t) => t.context === 'market' && t.listingId === id && t.members.includes(me))?.id
  if (!threadId)
    mutate((d) => {
      threadId = uid('t-')
      d.threads.unshift({ id: threadId, members: [me, l.sellerId], context: 'market', listingId: id, title: l.title, updatedAt: now(), messages: [{ id: uid('m-'), from: me, text: `سلام، درباره‌ی «${l.title}» (${toman(l.price)}) سؤال داشتم.`, at: now() }] })
      notify(d, l.sellerId, 'پیام درباره‌ی آگهی شما', `«${l.title}»`, '', `/messages/${threadId}`)
    })
  return threadId!
})

export const buyListing = svc('market.buy', (id: string, address: string) => {
  const me = currentUserId()
  const l = db().listings.find((x) => x.id === id)
  if (!l || l.status !== 'active') throw new AppError('این کالا دیگر در دسترس نیست')
  if (l.sellerId === me) throw new AppError('نمی‌توانید کالای خودتان را بخرید')
  if (String(address ?? '').trim().length < 10) throw new AppError('نشانی کامل یا محل تحویل حضوری را بنویسید')
  mutate((d) => {
    const x = d.listings.find((y) => y.id === id)!
    if (x.status !== 'active') throw new AppError('این کالا دیگر در دسترس نیست')
    applyPayment(d, { type: 'market_buy', from: me, payerId: me, to: 'escrow', amount: x.price, commissionPct: 0, refId: x.id, description: `خرید امن «${x.title}» (نزد کی‌فیت تا تأیید دریافت)` })
    x.status = 'reserved'
    x.deal = { buyerId: me, status: 'paid', address: String(address).trim().slice(0, 300), paidAt: now() }
    const buyer = d.users.find((u) => u.id === me)!
    notify(d, x.sellerId, 'کالای شما فروخته شد', `${buyer.name} «${x.title}» را با خرید امن پرداخت کرد. کالا را ارسال و در اپ ثبت کنید.`, '', `/market/${x.id}`)
    notify(d, me, 'پرداخت امن انجام شد', `مبلغ تا تأیید دریافت نزد کی‌فیت می‌ماند.`, '', `/market/${x.id}`)
  })
})

export const markShipped = svc('market.ship', (id: string, tracking?: string) => {
  const me = currentUserId()
  const l = db().listings.find((x) => x.id === id && x.sellerId === me)
  if (!l?.deal || l.deal.status !== 'paid') throw new AppError('معامله‌ی در انتظار ارسال یافت نشد')
  mutate((d) => {
    const x = d.listings.find((y) => y.id === id)!
    x.deal!.status = 'shipped'
    x.deal!.shippedAt = now()
    x.deal!.tracking = tracking?.trim().slice(0, 40) || undefined
    notify(d, x.deal!.buyerId, 'کالا ارسال شد', `«${x.title}»${x.deal!.tracking ? ` — کد رهگیری ${x.deal!.tracking}` : ''}. پس از دریافت، تأیید کنید.`, '', `/market/${x.id}`)
  })
})

/** آزادسازی مبلغ از صندوق امانی به فروشنده (داخل mutate) */
function release(d: DBState, x: Listing, auto = false) {
  const pct = d.settings.commissions.market ?? 5
  const commission = Math.round((x.price * pct) / 100)
  d.wallets.escrow = (d.wallets.escrow ?? 0) - x.price
  d.wallets[x.sellerId] = (d.wallets[x.sellerId] ?? 0) + x.price - commission
  d.wallets.platform = (d.wallets.platform ?? 0) + commission
  d.transactions.unshift({ id: uid('tx-'), type: 'market_release', from: 'escrow', to: x.sellerId, amount: x.price, commission, module: 'market', refId: x.id, description: `فروش «${x.title}»${auto ? ' (آزادسازی خودکار)' : ''}`, createdAt: now() })
  x.deal!.status = 'done'
  x.deal!.doneAt = now()
  x.status = 'sold'
  notify(d, x.sellerId, 'مبلغ فروش واریز شد', `${toman(x.price - commission)} بابت «${x.title}» به کیف پول شما واریز شد.`, '', '/wallet')
}

export const confirmReceived = svc('market.confirm', (id: string) => {
  const me = currentUserId()
  const l = db().listings.find((x) => x.id === id && x.deal?.buyerId === me)
  if (!l?.deal || l.deal.status !== 'shipped') throw new AppError('ابتدا فروشنده باید ارسال را ثبت کند')
  mutate((d) => release(d, d.listings.find((y) => y.id === id)!))
})

export const cancelDeal = svc('market.cancel', (id: string) => {
  const me = currentUserId()
  const l = db().listings.find((x) => x.id === id && (x.sellerId === me || x.deal?.buyerId === me))
  if (!l?.deal || l.deal.status !== 'paid') throw new AppError('پس از ارسال، لغو فقط از طریق پشتیبانی ممکن است')
  mutate((d) => {
    const x = d.listings.find((y) => y.id === id)!
    const tx = d.transactions.find((t) => t.type === 'market_buy' && t.refId === x.id && t.payerId === x.deal!.buyerId)
    const back = tx ? reversePayment(d, tx, `لغو خرید «${x.title}»`) : 0
    const buyer = x.deal!.buyerId
    x.deal!.status = 'cancelled'
    x.deal = undefined
    x.status = 'active'
    notify(d, buyer, 'خرید لغو شد', `${toman(back)} به کیف پول شما برگشت.`, '', '/wallet')
    notify(d, x.sellerId, 'خرید لغو شد', `معامله‌ی «${x.title}» لغو شد و آگهی دوباره فعال است.`, '', `/market/${x.id}`)
  })
})

/** آزادسازی خودکار معامله‌هایی که خریدار پس از ارسال تأیید نکرده است (cron) */
export function autoReleaseDeals() {
  const limit = Date.now() - AUTO_RELEASE_DAYS * 86_400_000
  const due = db().listings.filter((l) => l.deal?.status === 'shipped' && l.deal.shippedAt && new Date(l.deal.shippedAt).getTime() < limit)
  if (!due.length) return
  mutate((d) => {
    for (const l of due) release(d, d.listings.find((y) => y.id === l.id)!, true)
  })
}
