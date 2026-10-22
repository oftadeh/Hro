/**
 * فیت‌یاب: ورود بدون ثبت‌نام به باشگاه‌ها.
 *
 * روند کامل ورود:
 *  ۱. کاربر سانس آزاد (تا پایان امروز) یا یک کلاس گروهی را رزرو می‌کند؛ هزینه از اعتبار
 *     اشتراک یا کیف پول کسر و پس از کمیسیون به باشگاه‌دار واریز می‌شود (در ساعات خلوت با تخفیف).
 *  ۲. یک بلیت با کد ۶ رقمی و QR صادر می‌شود.
 *  ۳. پذیرش باشگاه QR را اسکن می‌کند یا کد را وارد می‌کند ← بلیت «استفاده‌شده» می‌شود.
 *     اگر کاربر بلیت نگرفته باشد، پذیرش با شماره‌ی موبایل «درخواست ورود» می‌فرستد و کاربر در اپ تأیید می‌کند.
 *  ۴. لغو سانس آزاد تا پیش از ورود و لغو کلاس تا ۲ ساعت پیش از شروع، با بازگشت کامل وجه.
 *     بلیت‌های استفاده‌نشده پس از پایان اعتبار منقضی می‌شوند.
 *  ۵. پس از ورود، کاربر می‌تواند به باشگاه امتیاز و نظر بدهد.
 */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import type { DBState } from '../state'
import { uid, now, entryCode } from '../id'
import type { CheckIn, Gym, GymClass, User } from '../types'
import { applyPayment, notify, reversePayment } from './ledger'
import { addXP, completeMission } from './engagement'
import { autoProgress } from './challenges'
import { toman } from '../format'
import { GRADIENTS } from '../config'

const HOUR = 3_600_000
/** حداقل فاصله تا شروع کلاس برای لغو با بازگشت وجه */
export const CLASS_CANCEL_HOURS = 2
/** پذیرش کلاس از این مقدار دقیقه قبل از شروع ممکن است */
const CLASS_EARLY_MIN = 45
const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
export const weekdayLabel = (w: number) => WEEKDAYS[w] ?? ''

/** روز هفته با شروع از شنبه (۰) */
export const weekdayOf = (d: Date) => (d.getDay() + 1) % 7

/** قیمت سانس در یک زمان مشخص (با احتساب تخفیف ساعات خلوت) */
export function priceAt(gym: Gym, at = new Date()) {
  const h = at.getHours()
  const op = gym.offPeak
  const offPeak = !!op && op.discountPct > 0 && h >= op.from && h < op.to
  return { price: offPeak ? Math.round((gym.sessionPrice * (100 - op!.discountPct)) / 100 / 1000) * 1000 : gym.sessionPrice, offPeak, base: gym.sessionPrice }
}

export const classPrice = (gym: Gym, c: GymClass) => c.price ?? gym.sessionPrice

/** زمان شروع یک کلاس در تاریخ مشخص */
function classStart(c: GymClass, day: Date) {
  const [hh, mm] = c.time.split(':').map(Number)
  const t = new Date(day)
  t.setHours(hh, mm, 0, 0)
  return t
}

/** نوبت‌های کلاس در n روز آینده */
export function upcomingClasses(gym: Gym, days = 7, from = new Date()) {
  const out: { cls: GymClass; at: Date }[] = []
  for (let i = 0; i < days; i++) {
    const day = new Date(from)
    day.setDate(day.getDate() + i)
    for (const c of gym.classes ?? []) {
      if (c.weekday !== weekdayOf(day)) continue
      const at = classStart(c, day)
      if (at.getTime() > from.getTime()) out.push({ cls: c, at })
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime())
}

const isLive = (t: CheckIn) => t.status === 'active' || t.status === 'used'

export function bookedCount(classId: string, slotAt: string, s: Pick<DBState, 'checkins'> = db()) {
  return s.checkins.filter((t) => t.classId === classId && t.slotAt === slotAt && isLive(t)).length
}

/** وضعیت مؤثر بلیت با احتساب انقضا */
export function ticketStatus(t: CheckIn, at = new Date()): CheckIn['status'] {
  if (t.status === 'active' && t.validUntil && new Date(t.validUntil) < at) return 'expired'
  return t.status
}

/** شلوغی لحظه‌ای: ورودهای ۹۰ دقیقه‌ی اخیر نسبت به ظرفیت */
export function occupancy(gym: Gym, s: Pick<DBState, 'checkins'> = db(), at = new Date()) {
  const since = at.getTime() - 1.5 * HOUR
  const count = s.checkins.filter((t) => t.gymId === gym.id && t.status === 'used' && t.usedAt && new Date(t.usedAt).getTime() > since).length
  const capacity = gym.capacity || 50
  const ratio = count / capacity
  return { count, capacity, ratio, label: ratio < 0.35 ? 'خلوت' : ratio < 0.7 ? 'متوسط' : 'شلوغ', tone: ratio < 0.35 ? 'emerald' : ratio < 0.7 ? 'amber' : 'rose' } as const
}

const endOfDay = (d = new Date()) => {
  const e = new Date(d)
  e.setHours(23, 59, 59, 0)
  return e
}

function assertGymAccess(gym: Gym | undefined, user: User) {
  if (!gym || !gym.approved) throw new AppError('باشگاه در دسترس نیست')
  if (gym.gender !== 'mixed' && user.gender && user.gender !== gym.gender) throw new AppError(gym.gender === 'female' ? 'این باشگاه ویژه‌ی بانوان است' : 'این باشگاه ویژه‌ی آقایان است')
}

/** صدور بلیت و پرداخت (داخل mutate) */
function issueTicket(
  d: DBState,
  user: User,
  gym: Gym,
  o: { prefer: 'subscription' | 'wallet'; cls?: GymClass; slotAt?: string; viaReception?: boolean },
): CheckIn {
  const at = new Date()
  const { price, offPeak } = o.cls ? { price: classPrice(gym, o.cls), offPeak: false } : priceAt(gym, at)
  const sub = d.subscriptions.find((s) => s.userId === user.id && new Date(s.expiresAt) > at)
  const useSub = o.prefer === 'subscription' && !!sub && sub.credit >= price
  if (o.prefer === 'subscription' && !useSub && (d.wallets[user.id] ?? 0) < price)
    throw new AppError(sub ? `اعتبار اشتراک و کیف پول کافی نیست (هزینه: ${toman(price)})` : 'اشتراک فعال ندارید و موجودی کیف پول کافی نیست')
  const id = uid('ci-')
  const tx = applyPayment(d, {
    type: 'checkin',
    from: useSub ? 'subscription' : user.id,
    payerId: user.id,
    to: gym.ownerId,
    amount: price,
    module: 'fityab',
    refId: id,
    description: `${o.cls ? `کلاس ${o.cls.title}` : 'ورود'} ${user.name} — ${gym.name}${offPeak ? ' (ساعت خلوت)' : ''}`,
  })
  const validUntil = o.cls && o.slotAt ? new Date(new Date(o.slotAt).getTime() + (o.cls.durationMin + 30) * 60_000) : endOfDay(at)
  const t: CheckIn = {
    id, userId: user.id, gymId: gym.id, price: gym.sessionPrice, paid: price, code: entryCode(), paidWith: useSub ? 'subscription' : 'wallet',
    status: 'active', classId: o.cls?.id, slotAt: o.slotAt, validUntil: validUntil.toISOString(), offPeak, viaReception: o.viaReception, txId: tx.id, createdAt: now(),
  }
  d.checkins.unshift(t)
  addXP(d, user.id, 30)
  return t
}

/** خرید سانس آزاد (معتبر تا پایان امروز) */
export const checkIn = svc('fityab.checkIn', (gymId: string, prefer: 'subscription' | 'wallet' = 'subscription'): CheckIn => {
  const userId = currentUserId()
  const gym = db().gyms.find((g) => g.id === gymId)
  const user = db().users.find((u) => u.id === userId)!
  assertGymAccess(gym, user)
  const open = db().checkins.find((t) => t.userId === userId && t.gymId === gymId && !t.classId && ticketStatus(t) === 'active')
  if (open) throw new AppError('برای امروز بلیت فعال این باشگاه را دارید')
  let created!: CheckIn
  mutate((d) => {
    created = issueTicket(d, user, gym!, { prefer: prefer === 'wallet' ? 'wallet' : 'subscription' })
    notify(d, gym!.ownerId, 'ورزشکار جدید در راه است', `${user.name} برای ${gym!.name} بلیت گرفت (${toman(created.paid ?? created.price)}).`, '', '/panel/gym/checkins')
  })
  return created
})

/** رزرو یک نوبت کلاس گروهی */
export const bookClass = svc('fityab.bookClass', (gymId: string, classId: string, slotAt: string, prefer: 'subscription' | 'wallet' = 'subscription'): CheckIn => {
  const userId = currentUserId()
  const gym = db().gyms.find((g) => g.id === gymId)
  const user = db().users.find((u) => u.id === userId)!
  assertGymAccess(gym, user)
  const cls = gym!.classes?.find((c) => c.id === classId)
  if (!cls) throw new AppError('کلاس یافت نشد')
  const at = new Date(slotAt)
  if (isNaN(at.getTime())) throw new AppError('زمان کلاس معتبر نیست')
  const valid = upcomingClasses(gym!, 8).some((x) => x.cls.id === classId && x.at.getTime() === at.getTime())
  if (!valid) throw new AppError('این نوبت کلاس در دسترس نیست')
  const key = at.toISOString()
  if (db().checkins.some((t) => t.userId === userId && t.classId === classId && t.slotAt === key && isLive(t))) throw new AppError('این کلاس را قبلاً رزرو کرده‌اید')
  if (bookedCount(classId, key) >= cls.capacity) throw new AppError('ظرفیت این کلاس تکمیل است')
  let created!: CheckIn
  mutate((d) => {
    if (bookedCount(classId, key, d) >= cls.capacity) throw new AppError('ظرفیت این کلاس تکمیل است')
    created = issueTicket(d, user, gym!, { prefer: prefer === 'wallet' ? 'wallet' : 'subscription', cls, slotAt: key })
    notify(d, gym!.ownerId, 'رزرو کلاس جدید', `${user.name} کلاس «${cls.title}» را رزرو کرد.`, '', '/panel/gym/checkins')
  })
  return created
})

/** لغو بلیت با بازگشت کامل وجه */
export const cancelTicket = svc('fityab.cancel', (ticketId: string) => {
  const me = currentUserId()
  const t = db().checkins.find((x) => x.id === ticketId && x.userId === me)
  if (!t) throw new AppError('بلیت یافت نشد')
  if (ticketStatus(t) !== 'active') throw new AppError('فقط بلیت‌های فعال قابل لغو هستند')
  if (t.slotAt && new Date(t.slotAt).getTime() - Date.now() < CLASS_CANCEL_HOURS * HOUR) throw new AppError(`لغو کلاس فقط تا ${CLASS_CANCEL_HOURS} ساعت پیش از شروع امکان‌پذیر است`)
  let refunded = 0
  mutate((d) => {
    const x = d.checkins.find((c) => c.id === ticketId)!
    const tx = d.transactions.find((r) => r.id === x.txId) ?? d.transactions.find((r) => r.type === 'checkin' && r.refId === x.id)
    if (tx) refunded = reversePayment(d, tx, 'بازگشت وجه بلیت لغوشده')
    x.status = 'cancelled'
    const gym = d.gyms.find((g) => g.id === x.gymId)
    if (gym) notify(d, gym.ownerId, 'لغو بلیت', `یک بلیت ${gym.name} لغو شد.`, '', '/panel/gym/checkins')
    notify(d, me, 'بلیت لغو شد', `${toman(refunded)} به ${x.paidWith === 'subscription' ? 'اعتبار اشتراک' : 'کیف پول'} شما برگشت.`, '', '/tickets')
  })
  return refunded
})

/** خواندن کد از QR (KEYFIT:<id>:<code>) یا کد ۶ رقمی */
export function parseEntryCode(raw: string) {
  const v = raw.trim()
  const m = v.match(/^KEYFIT:([^:]+):(\d{6})$/)
  return m ? { id: m[1], code: m[2] } : { code: v.replace(/\D/g, '') }
}

/** تأیید ورود توسط پذیرش باشگاه (اسکن QR یا وارد کردن کد) */
export const verifyEntry = svc(
  'fityab.verify',
  (raw: string) => {
    const ownerId = currentUserId()
    const myGyms = db().gyms.filter((g) => g.ownerId === ownerId).map((g) => g.id)
    const { id, code } = parseEntryCode(raw)
    const ci = db().checkins.find((c) => (id ? c.id === id : true) && c.code === code && myGyms.includes(c.gymId))
    if (!ci) throw new AppError('کد ورود معتبر نیست')
    const st = ticketStatus(ci)
    if (st === 'used') throw new AppError('این بلیت قبلاً استفاده شده است')
    if (st === 'cancelled') throw new AppError('این بلیت لغو شده است')
    if (st === 'expired') throw new AppError('اعتبار این بلیت تمام شده است')
    if (ci.slotAt && new Date(ci.slotAt).getTime() - Date.now() > CLASS_EARLY_MIN * 60_000) throw new AppError('هنوز زمان پذیرش این کلاس نرسیده است')
    mutate((d) => {
      const x = d.checkins.find((c) => c.id === ci.id)!
      x.status = 'used'
      x.usedAt = now()
      completeMission(d, x.userId, 'workout')
      autoProgress(d, x.userId, 'workouts', 1, 'checkin')
      const gym = d.gyms.find((g) => g.id === x.gymId)!
      notify(d, x.userId, `ورود به ${gym.name} ثبت شد`, 'تمرین خوبی داشته باشی! بعد از تمرین نظرت را ثبت کن.', '', '/tickets')
    })
    const u = db().users.find((x) => x.id === ci.userId)
    const gym = db().gyms.find((g) => g.id === ci.gymId)!
    return { ticketId: ci.id, userName: u?.name ?? '', avatar: u?.avatar, gymName: gym.name, className: gym.classes?.find((c) => c.id === ci.classId)?.title, paid: ci.paid ?? ci.price }
  },
  { roles: ['gym'] },
)

/** پذیرش برای ورزشکاری که بلیت نگرفته، با شماره موبایل درخواست ورود می‌فرستد */
export const requestEntry = svc(
  'fityab.requestEntry',
  (gymId: string, phone: string) => {
    const ownerId = currentUserId()
    const gym = db().gyms.find((g) => g.id === gymId && g.ownerId === ownerId)
    if (!gym) throw new AppError('باشگاه یافت نشد')
    if (!gym.approved) throw new AppError('باشگاه هنوز تأیید نشده است')
    const p = phone.replace(/\D/g, '').replace(/^98/, '0').replace(/^9/, '09')
    const user = db().users.find((u) => u.phone === p)
    if (!user) throw new AppError('کاربری با این شماره در کی‌فیت ثبت‌نام نکرده است')
    assertGymAccess(gym, user)
    const id = uid('er-')
    mutate((d) => {
      d.entryRequests.forEach((r) => {
        if (r.userId === user.id && r.gymId === gymId && r.status === 'pending') r.status = 'expired'
      })
      d.entryRequests.unshift({ id, gymId, userId: user.id, status: 'pending', createdAt: now() })
      notify(d, user.id, `درخواست ورود از ${gym.name}`, `پذیرش ${gym.name} درخواست ورود شما را ثبت کرد. برای پرداخت ${toman(priceAt(gym).price)} و ورود، تأیید کنید.`, '', `/tickets?req=${id}`)
    })
    return { requestId: id, userName: user.name }
  },
  { roles: ['gym'] },
)

/** پاسخ کاربر به درخواست ورود پذیرش */
export const answerEntryRequest = svc('fityab.answerRequest', (requestId: string, approve: boolean, prefer: 'subscription' | 'wallet' = 'subscription') => {
  const me = currentUserId()
  const r = db().entryRequests.find((x) => x.id === requestId && x.userId === me)
  if (!r || r.status !== 'pending') throw new AppError('درخواست معتبر نیست')
  if (Date.now() - new Date(r.createdAt).getTime() > 30 * 60_000) {
    mutate((d) => {
      d.entryRequests.find((x) => x.id === requestId)!.status = 'expired'
    })
    throw new AppError('درخواست منقضی شده است؛ از پذیرش بخواهید دوباره ارسال کند')
  }
  const gym = db().gyms.find((g) => g.id === r.gymId)
  const user = db().users.find((u) => u.id === me)!
  assertGymAccess(gym, user)
  mutate((d) => {
    const x = d.entryRequests.find((q) => q.id === requestId)!
    x.status = approve ? 'approved' : 'rejected'
    if (!approve) {
      notify(d, gym!.ownerId, 'درخواست ورود رد شد', `${user.name} درخواست ورود را رد کرد.`, '', '/panel/gym/checkins')
      return
    }
    const t = issueTicket(d, user, gym!, { prefer: prefer === 'wallet' ? 'wallet' : 'subscription', viaReception: true })
    t.status = 'used'
    t.usedAt = now()
    completeMission(d, me, 'workout')
    autoProgress(d, me, 'workouts', 1, 'checkin')
    notify(d, gym!.ownerId, 'ورود تأیید شد', `${user.name} ورود را تأیید و پرداخت کرد (${toman(t.paid ?? t.price)}).`, '', '/panel/gym/checkins')
  })
})

/** انقضای بلیت‌های استفاده‌نشده (بدون بازگشت وجه) */
export function expireTickets() {
  const at = new Date()
  if (!db().checkins.some((t) => ticketStatus(t, at) === 'expired' && t.status === 'active')) return
  mutate((d) => {
    d.checkins.forEach((t) => {
      if (t.status === 'active' && t.validUntil && new Date(t.validUntil) < at) t.status = 'expired'
    })
  })
}

const GYM_FIELDS = ['name', 'tagline', 'description', 'address', 'city', 'lat', 'lng', 'phone', 'sessionPrice', 'facilities', 'sports', 'hours', 'gender', 'media', 'capacity', 'classes', 'offPeak'] as const

function cleanGym(input: Partial<Gym>) {
  const out: Partial<Gym> = {}
  for (const k of GYM_FIELDS) if (k in input) (out as Record<string, unknown>)[k] = input[k]
  if (out.capacity !== undefined && (out.capacity < 1 || out.capacity > 2000)) throw new AppError('ظرفیت سالن معتبر نیست')
  if (out.offPeak) {
    const { from, to, discountPct } = out.offPeak
    if (!(from >= 0 && to <= 24 && from < to)) throw new AppError('بازه‌ی ساعات خلوت معتبر نیست')
    if (discountPct < 0 || discountPct > 60) throw new AppError('تخفیف ساعات خلوت باید بین ۰ تا ۶۰ درصد باشد')
  }
  if (out.classes) {
    out.classes = out.classes.map((c) => {
      if (!c.title?.trim()) throw new AppError('عنوان کلاس الزامی است')
      if (!/^\d{2}:\d{2}$/.test(c.time)) throw new AppError(`ساعت کلاس «${c.title}» معتبر نیست`)
      if (!(c.weekday >= 0 && c.weekday <= 6)) throw new AppError('روز کلاس معتبر نیست')
      if (!(c.capacity >= 1)) throw new AppError(`ظرفیت کلاس «${c.title}» را وارد کنید`)
      return { id: c.id || uid('k-'), title: c.title.trim(), sport: c.sport || c.title.trim(), coachName: c.coachName ?? '', weekday: c.weekday, time: c.time, durationMin: c.durationMin || 60, capacity: c.capacity, price: c.price || undefined }
    })
  }
  return out
}

export const saveGym = svc(
  'fityab.saveGym',
  (input: Partial<Gym> & { id?: string }) => {
    const ownerId = currentUserId()
    if (!input.name?.trim()) throw new AppError('نام باشگاه الزامی است')
    if (!input.sessionPrice || input.sessionPrice < 10_000) throw new AppError('هزینه‌ی هر سانس را وارد کنید')
    const data = cleanGym(input)
    let id = input.id
    mutate((d) => {
      const existing = id ? d.gyms.find((g) => g.id === id) : undefined
      if (id && (!existing || existing.ownerId !== ownerId)) throw new AppError('باشگاه یافت نشد')
      if (existing) {
        Object.assign(existing, data)
      } else {
        id = uid('g-')
        d.gyms.unshift({
          name: '', tagline: '', description: '', address: '', city: 'تهران', lat: 35.72, lng: 51.39, phone: '',
          sessionPrice: 0, facilities: [], sports: [], hours: '', gender: 'mixed', media: [], capacity: 50, classes: [],
          ...data,
          id, ownerId, cover: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)], rating: 0, reviews: 0, approved: false, createdAt: now(),
        } as Gym)
        d.users.filter((u) => u.roles.includes('admin')).forEach((a) =>
          notify(d, a.id, 'باشگاه جدید در انتظار تایید', `«${input.name}» برای فیت‌یاب ثبت شد.`, '', '/panel/admin/gyms'),
        )
      }
    })
    return id!
  },
  { roles: ['gym'] },
)

/** امتیاز و نظر پس از ورود */
export const reviewGym = svc('fityab.review', (gymId: string, stars: number, text: string, image?: string) => {
  const me = currentUserId()
  if (!(stars >= 1 && stars <= 5)) throw new AppError('امتیاز را انتخاب کنید')
  const t = db().checkins.find((c) => c.userId === me && c.gymId === gymId && c.status === 'used' && !c.reviewed)
  if (!t) throw new AppError('پس از ورود به باشگاه می‌توانید نظر بدهید')
  if (text.length > 600) throw new AppError('متن نظر حداکثر ۶۰۰ کاراکتر است')
  mutate((d) => {
    const g = d.gyms.find((x) => x.id === gymId)!
    g.rating = Math.round(((g.rating * g.reviews + stars) / (g.reviews + 1)) * 100) / 100
    g.reviews += 1
    d.checkins.find((c) => c.id === t.id)!.reviewed = true
    d.reviews.unshift({ id: uid('rv-'), kind: 'gym', refId: gymId, userId: me, stars: Math.round(stars), text: text.trim(), image, createdAt: now() })
    addXP(d, me, 10)
    notify(d, g.ownerId, 'نظر جدید', `${'★'.repeat(Math.round(stars))} — ${text.slice(0, 60)}`, '', `/fityab/${gymId}`)
  })
})

export const toggleFavoriteGym = svc('fityab.favorite', (gymId: string) => {
  const me = currentUserId()
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    const f = u.favoriteGyms ?? []
    u.favoriteGyms = f.includes(gymId) ? f.filter((x) => x !== gymId) : [...f, gymId]
  })
})
