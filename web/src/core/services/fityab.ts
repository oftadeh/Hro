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
import { findByVerifiedPhone } from './auth'
import type { DBState } from '../state'
import { uid, now, entryCode } from '../id'
import type { CheckIn, Gym, GymClass, ID, User } from '../types'
import { applyPayment, notify, reversePayment } from './ledger'
import { addXP, completeMission } from './engagement'
import { autoProgress } from './challenges'
import { distanceKm, num, toman } from '../format'
import { GRADIENTS, VENUE_KINDS } from '../config'
import { trainTogetherBonus } from './teams'
import { campaignOffer } from './members'
import { classEligibility } from './family'
import type { FamilyMember } from '../types'

const HOUR = 3_600_000
/** حداقل فاصله تا شروع کلاس برای لغو با بازگشت وجه */
export const CLASS_CANCEL_HOURS = 2
export const RENTAL_CANCEL_HOURS = 12
/** هر بلیت تا این چند دقیقه پس از خرید، بدون توجه به زمان شروع، قابل لغو با بازگشت کامل وجه است */
export const CANCEL_GRACE_MIN = 15
export const inCancelGrace = (t: Pick<CheckIn, 'createdAt'>) => Date.now() - new Date(t.createdAt).getTime() < CANCEL_GRACE_MIN * 60_000
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

function assertGymAccess(gym: Gym | undefined, user: Pick<User, 'gender'>) {
  if (!gym || !gym.approved) throw new AppError('باشگاه در دسترس نیست')
  if (gym.gender !== 'mixed' && user.gender && user.gender !== gym.gender) throw new AppError(gym.gender === 'female' ? 'این باشگاه ویژه‌ی بانوان است' : 'این باشگاه ویژه‌ی آقایان است')
}

/** صدور بلیت و پرداخت (داخل mutate) */
function issueTicket(
  d: DBState,
  user: User,
  gym: Gym,
  o: { prefer: 'subscription' | 'wallet'; cls?: GymClass; slotAt?: string; viaReception?: boolean; member?: FamilyMember },
): CheckIn {
  const at = new Date()
  const base = o.cls ? { price: classPrice(gym, o.cls), offPeak: false } : priceAt(gym, at)
  // تخفیف کمپین باشگاه (هزینه‌اش با خود باشگاه است)
  const offer = campaignOffer(d, user.id, gym.id, at)
  const price = offer ? Math.round((base.price * (100 - offer.pct!)) / 100 / 1000) * 1000 : base.price
  const offPeak = base.offPeak
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
    description: `${o.cls ? `کلاس ${o.cls.title}` : 'ورود'} ${o.member ? o.member.name : user.name} — ${gym.name}${offPeak ? ' (ساعت خلوت)' : ''}${offer ? ` (تخفیف ${offer.pct}٪ باشگاه)` : ''}`,
  })
  const validUntil = o.cls && o.slotAt ? new Date(new Date(o.slotAt).getTime() + (o.cls.durationMin + 30) * 60_000) : endOfDay(at)
  const t: CheckIn = {
    id, userId: user.id, gymId: gym.id, price: gym.sessionPrice, paid: price, code: entryCode(), paidWith: useSub ? 'subscription' : 'wallet',
    status: 'active', classId: o.cls?.id, slotAt: o.slotAt, validUntil: validUntil.toISOString(), offPeak, viaReception: o.viaReception, txId: tx.id, createdAt: now(),
    memberId: o.member?.id, memberName: o.member?.name, campaignId: offer?.id,
  }
  if (offer) d.campaigns.find((c) => c.id === offer.id)!.usedBy.push(user.id)
  d.checkins.unshift(t)
  addXP(d, user.id, 30)
  return t
}

export const venueKind = (g: Gym) => g.kind ?? 'gym'
export const isRental = (g: Gym) => VENUE_KINDS[venueKind(g)].booking === 'rental' && !!g.rental

/** نوبت‌های آزاد اجاره‌ی یک روز (شروع هر ساعت) */
export function rentalSlots(gym: Gym, day: Date, s: Pick<DBState, 'checkins'> = db()) {
  if (!gym.rental) return []
  const taken = s.checkins.filter((c) => c.gymId === gym.id && c.rentalEnd && c.slotAt && (c.status === 'active' || c.status === 'used'))
  const out: { start: Date; free: boolean }[] = []
  for (let h = gym.rental.openFrom; h < gym.rental.openTo; h++) {
    const start = new Date(day)
    start.setHours(h, 0, 0, 0)
    const end = start.getTime() + 3_600_000
    const busy = taken.some((c) => new Date(c.slotAt!).getTime() < end && new Date(c.rentalEnd!).getTime() > start.getTime())
    out.push({ start, free: !busy && start.getTime() > Date.now() })
  }
  return out
}

export const rentalPrice = (gym: Gym, start: Date, hours: number) => {
  const op = gym.offPeak
  let total = 0
  for (let i = 0; i < hours; i++) {
    const h = start.getHours() + i
    const off = !!op && op.discountPct > 0 && h >= op.from && h < op.to
    total += off ? Math.round((gym.rental!.hourlyPrice * (100 - op!.discountPct)) / 100 / 1000) * 1000 : gym.rental!.hourlyPrice
  }
  return total
}

/** اجاره‌ی ساعتی سالن یا زمین (اختیاری برای یک تیم هم‌تمرینی) */
export const bookRental = svc('fityab.rent', (gymId: string, startAt: string, hours: number, prefer: 'subscription' | 'wallet' = 'wallet', teamId?: ID): CheckIn => {
  const userId = currentUserId()
  const gym = db().gyms.find((g) => g.id === gymId)
  const user = db().users.find((u) => u.id === userId)!
  assertGymAccess(gym, user)
  if (!isRental(gym!)) throw new AppError('این مجموعه اجاره‌ی ساعتی ندارد')
  const r = gym!.rental!
  const start = new Date(startAt)
  if (isNaN(start.getTime()) || start.getMinutes() !== 0) throw new AppError('ساعت شروع معتبر نیست')
  if (start.getTime() < Date.now()) throw new AppError('زمان انتخاب‌شده گذشته است')
  if (start.getTime() - Date.now() > 14 * 86_400_000) throw new AppError('رزرو حداکثر تا ۱۴ روز آینده ممکن است')
  if (!(Number.isInteger(hours) && hours >= 1 && hours <= r.maxHours)) throw new AppError(`مدت اجاره بین ۱ تا ${r.maxHours} ساعت است`)
  if (start.getHours() < r.openFrom || start.getHours() + hours > r.openTo) throw new AppError('خارج از ساعات کاری مجموعه است')
  const end = new Date(start.getTime() + hours * 3_600_000)
  const overlap = (d: Pick<DBState, 'checkins'>) => d.checkins.some((c) => c.gymId === gymId && c.rentalEnd && c.slotAt && (c.status === 'active' || c.status === 'used') && new Date(c.slotAt) < end && new Date(c.rentalEnd) > start)
  if (overlap(db())) throw new AppError('این بازه قبلاً رزرو شده است')
  const team = teamId ? db().teams.find((t) => t.id === teamId && t.members.includes(userId)) : undefined
  if (teamId && !team) throw new AppError('تیم یافت نشد')
  const price = rentalPrice(gym!, start, hours)
  let created!: CheckIn
  mutate((d) => {
    if (overlap(d)) throw new AppError('این بازه قبلاً رزرو شده است')
    const sub = d.subscriptions.find((x) => x.userId === userId && new Date(x.expiresAt) > new Date())
    const useSub = prefer === 'subscription' && !!sub && sub.credit >= price
    const id = uid('ci-')
    const tx = applyPayment(d, { type: 'rental', from: useSub ? 'subscription' : userId, payerId: userId, to: gym!.ownerId, amount: price, module: 'fityab', refId: id, description: `اجاره‌ی ${gym!.name} — ${hours} ساعت` })
    created = {
      id, userId, gymId, price, paid: price, code: entryCode(), paidWith: useSub ? 'subscription' : 'wallet', status: 'active',
      slotAt: start.toISOString(), rentalEnd: end.toISOString(), validUntil: end.toISOString(), teamId: team?.id, txId: tx.id, createdAt: now(),
    }
    d.checkins.unshift(created)
    addXP(d, userId, 30)
    notify(d, gym!.ownerId, 'رزرو اجاره‌ی جدید', `${user.name}: ${hours} ساعت از ${start.toLocaleString('fa-IR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}`, '', '/panel/gym/checkins')
    if (team) {
      const t = d.teams.find((x) => x.id === team.id)!
      t.sessions.push({ id: uid('ts-'), title: `${VENUE_KINDS[venueKind(gym!)].label} — ${gym!.name}`, at: start.toISOString(), gymId, note: `${hours} ساعت (رزرو شده)`, createdBy: userId, going: [userId], notGoing: [] })
      t.sessions.sort((a, b) => a.at.localeCompare(b.at))
      t.members.filter((m) => m !== userId).forEach((m) => notify(d, m, `${t.name}: زمین رزرو شد`, `${user.name} ${gym!.name} را برای تیم رزرو کرد.`, '', `/teams/${t.id}`))
    }
  })
  return created
})

/** خرید سانس آزاد (معتبر تا پایان امروز) */
export const checkIn = svc('fityab.checkIn', (gymId: string, prefer: 'subscription' | 'wallet' = 'subscription'): CheckIn => {
  const userId = currentUserId()
  const gym = db().gyms.find((g) => g.id === gymId)
  const user = db().users.find((u) => u.id === userId)!
  assertGymAccess(gym, user)
  if (isRental(gym!)) throw new AppError('این مجموعه به‌صورت اجاره‌ی ساعتی رزرو می‌شود')
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
export const bookClass = svc('fityab.bookClass', (gymId: string, classId: string, slotAt: string, prefer: 'subscription' | 'wallet' = 'subscription', memberId?: string): CheckIn => {
  const userId = currentUserId()
  const gym = db().gyms.find((g) => g.id === gymId)
  const user = db().users.find((u) => u.id === userId)!
  const member = memberId ? user.family?.find((m) => m.id === memberId) : undefined
  if (memberId && !member) throw new AppError('عضو خانواده یافت نشد')
  // محدودیت جنسیتی باشگاه برای خود شرکت‌کننده بررسی می‌شود
  assertGymAccess(gym, member ?? user)
  const cls = gym!.classes?.find((c) => c.id === classId)
  if (!cls) throw new AppError('کلاس یافت نشد')
  const notOk = classEligibility(cls, member)
  if (notOk) throw new AppError(notOk)
  const at = new Date(slotAt)
  if (isNaN(at.getTime())) throw new AppError('زمان کلاس معتبر نیست')
  const valid = upcomingClasses(gym!, 8).some((x) => x.cls.id === classId && x.at.getTime() === at.getTime())
  if (!valid) throw new AppError('این نوبت کلاس در دسترس نیست')
  const key = at.toISOString()
  if (db().checkins.some((t) => t.userId === userId && t.classId === classId && t.slotAt === key && t.memberId === member?.id && isLive(t))) throw new AppError(member ? `این کلاس را قبلاً برای ${member.name} رزرو کرده‌اید` : 'این کلاس را قبلاً رزرو کرده‌اید')
  if (bookedCount(classId, key) >= cls.capacity) throw new AppError('ظرفیت این کلاس تکمیل است')
  let created!: CheckIn
  mutate((d) => {
    if (bookedCount(classId, key, d) >= cls.capacity) throw new AppError('ظرفیت این کلاس تکمیل است')
    created = issueTicket(d, user, gym!, { prefer: prefer === 'wallet' ? 'wallet' : 'subscription', cls, slotAt: key, member })
    notify(d, gym!.ownerId, 'رزرو کلاس جدید', `${member ? `${member.name} (${user.name})` : user.name} کلاس «${cls.title}» را رزرو کرد.`, '', '/panel/gym/checkins')
  })
  return created
})

/** لغو بلیت با بازگشت کامل وجه */
export const cancelTicket = svc('fityab.cancel', (ticketId: string) => {
  const me = currentUserId()
  const t = db().checkins.find((x) => x.id === ticketId && x.userId === me)
  if (!t) throw new AppError('بلیت یافت نشد')
  if (ticketStatus(t) !== 'active') throw new AppError('فقط بلیت‌های فعال قابل لغو هستند')
  const window = t.rentalEnd ? RENTAL_CANCEL_HOURS : CLASS_CANCEL_HOURS
  if (t.slotAt && !inCancelGrace(t) && new Date(t.slotAt).getTime() - Date.now() < window * HOUR) throw new AppError(`لغو ${t.rentalEnd ? 'اجاره' : 'کلاس'} فقط تا ${window} ساعت پیش از شروع امکان‌پذیر است`)
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
      trainTogetherBonus(d, x.userId, x.gymId)
      const gym = d.gyms.find((g) => g.id === x.gymId)!
      notify(d, x.userId, `ورود به ${gym.name} ثبت شد`, 'تمرین خوبی داشته باشی! بعد از تمرین نظرت را ثبت کن.', '', '/tickets')
    })
    const u = db().users.find((x) => x.id === ci.userId)
    const gym = db().gyms.find((g) => g.id === ci.gymId)!
    const member = ci.memberId ? u?.family?.find((m) => m.id === ci.memberId) : undefined
    return { ticketId: ci.id, userId: ci.userId, userName: u?.name ?? '', avatar: u?.avatar, gymName: gym.name, className: gym.classes?.find((c) => c.id === ci.classId)?.title, paid: ci.paid ?? ci.price, memberName: ci.memberName, memberNotes: member?.notes }
  },
  { roles: ['gym'] },
)

/* ───────── ورود با اسکن QR چاپی باشگاه ───────── */

/** حداکثر فاصله‌ی گوشی ورزشکار از باشگاه هنگام اسکن QR (متر) */
export const ENTRY_RADIUS_M = 300

/** ساخت یا تعویض رمز QR ورودی باشگاه (QR قبلی باطل می‌شود) */
export const rotateEntryCode = svc(
  'fityab.rotateEntryCode',
  (gymId: string) => {
    const ownerId = currentUserId()
    const gym = db().gyms.find((g) => g.id === gymId && g.ownerId === ownerId)
    if (!gym) throw new AppError('باشگاه یافت نشد')
    const code = uid('q').replace(/[^A-Za-z0-9]/g, '').slice(-12)
    mutate((d) => {
      d.gyms.find((g) => g.id === gymId)!.entryCode = code
    })
    return code
  },
  { roles: ['gym'] },
)

/** ورزشکار QR دم در باشگاه را اسکن می‌کند: موقعیت بررسی، بلیت امروز صادر (یا بلیت موجود استفاده) و ورود ثبت می‌شود */
export const scanEntry = svc('fityab.scanEntry', (gymId: string, code: string, lat?: number, lng?: number) => {
  const userId = currentUserId()
  const gym = db().gyms.find((g) => g.id === gymId)
  if (!gym || !gym.approved || !gym.entryCode || gym.entryCode !== String(code)) throw new AppError('این کد QR معتبر نیست؛ کد نصب‌شده دم در باشگاه را اسکن کنید')
  if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) throw new AppError('برای ثبت ورود، دسترسی به موقعیت مکانی گوشی را فعال کنید')
  const meters = distanceKm([lat, lng], [gym.lat, gym.lng]) * 1000
  if (meters > ENTRY_RADIUS_M) throw new AppError(`برای ثبت ورود باید در محل ${gym.name} باشید (فاصله‌ی فعلی حدود ${num(Math.round(meters))} متر)`)
  const user = db().users.find((u) => u.id === userId)!
  assertGymAccess(gym, user)
  if (isRental(gym)) throw new AppError('این مجموعه به‌صورت اجاره‌ی ساعتی رزرو می‌شود؛ بلیت رزرو را به پذیرش نشان دهید')
  const recent = db().checkins.find((t) => t.userId === userId && t.gymId === gymId && !t.memberId && t.status === 'used' && t.usedAt && Date.now() - new Date(t.usedAt).getTime() < 3 * HOUR)
  if (recent) throw new AppError(`ورود شما به ${gym.name} همین امروز ثبت شده است`)
  const open = db().checkins.find(
    (t) => t.userId === userId && t.gymId === gymId && !t.memberId && ticketStatus(t) === 'active' && (!t.slotAt || new Date(t.slotAt).getTime() - Date.now() <= CLASS_EARLY_MIN * 60_000),
  )
  let ticketId = ''
  mutate((d) => {
    const x = open ? d.checkins.find((c) => c.id === open.id)! : issueTicket(d, user, gym, { prefer: 'subscription' })
    x.status = 'used'
    x.usedAt = now()
    ticketId = x.id
    completeMission(d, userId, 'workout')
    autoProgress(d, userId, 'workouts', 1, 'checkin')
    trainTogetherBonus(d, userId, gymId)
    notify(d, gym.ownerId, 'ورود جدید با QR', `${user.name} وارد ${gym.name} شد.`, '', '/panel/gym/checkins')
    notify(d, userId, `ورود به ${gym.name} ثبت شد`, 'تمرین خوبی داشته باشی! بعد از تمرین نظرت را ثبت کن.', '', '/tickets')
  })
  const t = db().checkins.find((c) => c.id === ticketId)!
  return { ticketId, gymName: gym.name, paid: t.paid ?? t.price, paidWith: t.paidWith, at: t.usedAt! }
})

/** پذیرش برای ورزشکاری که بلیت نگرفته، با شماره موبایل درخواست ورود می‌فرستد */
export const requestEntry = svc(
  'fityab.requestEntry',
  (gymId: string, phone: string) => {
    const ownerId = currentUserId()
    const gym = db().gyms.find((g) => g.id === gymId && g.ownerId === ownerId)
    if (!gym) throw new AppError('باشگاه یافت نشد')
    if (!gym.approved) throw new AppError('باشگاه هنوز تأیید نشده است')
    const p = phone.replace(/\D/g, '').replace(/^98/, '0').replace(/^9/, '09')
    const user = findByVerifiedPhone(db().users, p)
    if (!user) throw new AppError('کاربری با این شماره‌ی تأییدشده در کی‌فیت نیست')
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
    trainTogetherBonus(d, me, gym!.id)
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

const GYM_FIELDS = ['name', 'tagline', 'description', 'address', 'city', 'lat', 'lng', 'phone', 'sessionPrice', 'facilities', 'sports', 'hours', 'gender', 'media', 'capacity', 'classes', 'offPeak', 'kind', 'rental'] as const

function cleanGym(input: Partial<Gym>) {
  const out: Partial<Gym> = {}
  for (const k of GYM_FIELDS) if (k in input) (out as Record<string, unknown>)[k] = input[k]
  if (out.capacity !== undefined && (out.capacity < 1 || out.capacity > 2000)) throw new AppError('ظرفیت سالن معتبر نیست')
  if (out.kind !== undefined && !(out.kind in VENUE_KINDS)) throw new AppError('نوع مجموعه معتبر نیست')
  if (out.rental) {
    const r = out.rental
    if (!(r.hourlyPrice >= 50_000)) throw new AppError('اجاره‌ی هر ساعت را وارد کنید')
    if (!(r.openFrom >= 0 && r.openTo <= 24 && r.openFrom < r.openTo)) throw new AppError('ساعات کاری اجاره معتبر نیست')
    out.rental = { hourlyPrice: Math.round(r.hourlyPrice), openFrom: Math.round(r.openFrom), openTo: Math.round(r.openTo), maxHours: Math.min(6, Math.max(1, Math.round(r.maxHours || 2))) }
  }
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
      const kids = c.audience === 'kids'
      if (kids && c.ageMin && c.ageMax && c.ageMin > c.ageMax) throw new AppError(`بازه‌ی سنی کلاس «${c.title}» معتبر نیست`)
      return {
        id: c.id || uid('k-'), title: c.title.trim(), sport: c.sport || c.title.trim(), coachName: c.coachName ?? '', weekday: c.weekday, time: c.time, durationMin: c.durationMin || 60, capacity: c.capacity, price: c.price || undefined,
        audience: kids ? ('kids' as const) : undefined, ageMin: kids ? Math.max(2, Math.round(c.ageMin || 4)) : undefined, ageMax: kids ? Math.min(18, Math.round(c.ageMax || 12)) : undefined,
      }
    })
  }
  return out
}

export const saveGym = svc(
  'fityab.saveGym',
  (input: Partial<Gym> & { id?: string }) => {
    const ownerId = currentUserId()
    if (!input.name?.trim()) throw new AppError('نام باشگاه الزامی است')
    const rentalKind = VENUE_KINDS[(input.kind ?? 'gym') as keyof typeof VENUE_KINDS]?.booking === 'rental'
    if (rentalKind && !input.rental) throw new AppError('اجاره‌ی ساعتی را تنظیم کنید')
    if (!rentalKind && (!input.sessionPrice || input.sessionPrice < 10_000)) throw new AppError('هزینه‌ی هر سانس را وارد کنید')
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
          name: '', tagline: '', description: '', address: '', city: 'اصفهان', lat: 32.6546, lng: 51.668, phone: '',
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
