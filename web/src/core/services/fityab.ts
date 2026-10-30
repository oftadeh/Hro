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
import type { CheckIn, Gym, GymClass, GymTier, ID, User, WaitlistEntry } from '../types'
import { applyPayment, notify, reversePayment } from './ledger'
import { addXP, completeMission } from './engagement'
import { autoProgress } from './challenges'
import { dayKey, distanceKm, num, toman } from '../format'
import { DEFAULT_TIER_CAPS, GRADIENTS, GYM_TIERS, SUBSCRIPTION_PLANS, TRIAL_TIERS, VENUE_KINDS, cityCenter } from '../config'
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
      if (at.getTime() <= from.getTime() || dayClosed(gym, at)) continue
      if (gym.cancelledSlots?.some((x) => x.classId === c.id && x.slotAt === at.toISOString())) continue
      out.push({ cls: c, at })
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

/** شلوغی چهار بازه‌ی ۴۵ دقیقه‌ای اخیر (اول = الان)، هر کدام در سطح ۰ تا ۳ نسبت به ظرفیت */
export function crowdLevels(gym: Gym, s: Pick<DBState, 'checkins'> = db(), at = new Date()): number[] {
  const W = 45 * 60_000
  const capacity = gym.capacity || 50
  const counts = [0, 0, 0, 0]
  for (const t of s.checkins) {
    if (t.gymId !== gym.id || t.status !== 'used' || !t.usedAt) continue
    const k = Math.floor((at.getTime() - new Date(t.usedAt).getTime()) / W)
    if (k >= 0 && k < 4) counts[k]++
  }
  // ورودهای هر بازه، تقریباً نیمی از حضور هم‌زمان (هر جلسه حدود ۹۰ دقیقه)
  return counts.map((c) => {
    const r = (c * 2) / capacity
    return c === 0 ? 0 : r < 0.35 ? 1 : r < 0.7 ? 2 : 3
  })
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

/* ───────── سانس جنسیتی و تعطیلی ───────── */

const GENDER_WORD = { male: 'آقایان', female: 'بانوان' } as const
type Sex = 'male' | 'female'
const allows = (g: Gym['gender'], who?: Sex) => g === 'mixed' || !who || g === who

/** جنسیت مجاز در یک لحظه: باشگاه تک‌جنسیتی، یا سانس جنسیتی باشگاه مختلط */
export function sessionGender(gym: Gym, at = new Date()): Gym['gender'] {
  if (gym.gender !== 'mixed') return gym.gender
  const h = at.getHours() + at.getMinutes() / 60
  const w = weekdayOf(at)
  return gym.genderHours?.find((x) => (!x.days?.length || x.days.includes(w)) && h >= x.from && h < x.to)?.gender ?? 'mixed'
}

/** سانس‌های یک جنسیت در یک روز */
export function genderWindowsOn(gym: Gym, day: Date, gender: Sex) {
  return (gym.genderHours ?? []).filter((x) => x.gender === gender && (!x.days?.length || x.days.includes(weekdayOf(day)))).sort((a, b) => a.from - b.from)
}

/** پایان بازه‌ای که این جنسیت می‌تواند در سانس آزاد بماند (برای اعتبار بلیت) */
function accessUntil(gym: Gym, who: Sex | undefined, at: Date) {
  const end = endOfDay(at)
  const t = new Date(at)
  t.setMinutes(Math.floor(t.getMinutes() / 15) * 15, 0, 0)
  while (t < end) {
    t.setMinutes(t.getMinutes() + 15)
    if (!allows(sessionGender(gym, t), who)) return t
  }
  return end
}

export const dayClosed = (gym: Pick<Gym, 'closedDays'>, at: Date) => gym.closedDays?.find((c) => c.day === dayKey(at))

/** ورود سانس آزاد در این لحظه: تعطیلی و جنسیت سانس */
function assertSessionNow(gym: Gym, who: Sex | undefined, at = new Date()) {
  const closed = dayClosed(gym, at)
  if (closed) throw new AppError(`${gym.name} امروز تعطیل است${closed.reason ? `: ${closed.reason}` : ''}`)
  const g = sessionGender(gym, at)
  if (!allows(g, who)) {
    const next = who ? genderWindowsOn(gym, at, who).find((x) => x.from > at.getHours()) : undefined
    throw new AppError(`الان سانس ${GENDER_WORD[g as Sex]} است${next ? `؛ سانس ${GENDER_WORD[who!]} امروز از ساعت ${num(next.from)}` : ''}`)
  }
}

/** جنسیت مؤثر نوبت کلاس: جنسیت خود کلاس؛ وگرنه کلاس بزرگسالان از سانس همان ساعت پیروی می‌کند و کلاس کودکان مختلط است */
export const classGender = (gym: Gym, cls: GymClass, at: Date): Gym['gender'] =>
  cls.gender ?? (cls.audience === 'kids' && gym.gender === 'mixed' ? 'mixed' : sessionGender(gym, at))
export const classAllows = (gym: Gym, cls: GymClass, at: Date, who?: Sex) => allows(classGender(gym, cls, at), who)

/* ───────── سطح باشگاه و پوشش عضویت ───────── */

/** سطح از روی قیمت اعلامی (بدون تخفیف ساعت خلوت و کمپین تا سطح با تخفیف عوض نشود) */
export function tierOfPrice(price: number, s: Pick<DBState, 'settings'> = db()): GymTier {
  const c = s.settings.tierCaps ?? DEFAULT_TIER_CAPS
  return price <= c.standard ? 'standard' : price <= c.premium ? 'premium' : 'elite'
}
export const gymTier = (gym: Pick<Gym, 'sessionPrice'>, s: Pick<DBState, 'settings'> = db()) => tierOfPrice(gym.sessionPrice, s)
export const rentalTier = (gym: Pick<Gym, 'rental'>, s: Pick<DBState, 'settings'> = db()) => tierOfPrice(gym.rental?.hourlyPrice ?? 0, s)

/** سطح‌هایی که یک عضویت پوشش می‌دهد (پلن ناشناخته = همه) */
export function planTiers(planId: string): GymTier[] {
  if (planId === 'plan-trial') return TRIAL_TIERS
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId)?.tiers ?? ['standard', 'premium', 'elite']
}
export const subCovers = (planId: string | undefined, tier: GymTier) => !!planId && planTiers(planId).includes(tier)
export const tierLabel = (t: GymTier) => GYM_TIERS[t].label

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
  // سطح بر اساس قیمت اعلامی؛ اگر عضویت این سطح را پوشش ندهد، فقط از کیف پول
  const tier = tierOfPrice(o.cls ? classPrice(gym, o.cls) : gym.sessionPrice, d)
  const covered = !!sub && subCovers(sub.planId, tier)
  const useSub = o.prefer === 'subscription' && covered && sub!.credit >= price
  if (o.prefer === 'subscription' && !useSub && (d.wallets[user.id] ?? 0) < price)
    throw new AppError(
      sub && !covered
        ? `عضویت شما شامل باشگاه‌های سطح ${tierLabel(tier)} نیست؛ کیف پول را شارژ کنید یا عضویت را ارتقا دهید`
        : sub ? `اعتبار اشتراک و کیف پول کافی نیست (هزینه: ${toman(price)})` : 'اشتراک فعال ندارید و موجودی کیف پول کافی نیست',
    )
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
  const validUntil = o.cls && o.slotAt ? new Date(new Date(o.slotAt).getTime() + (o.cls.durationMin + 30) * 60_000) : accessUntil(gym, user.gender, at)
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
  const closedOn = dayClosed(gym!, start)
  if (closedOn) throw new AppError(`${gym!.name} در این روز تعطیل است${closedOn.reason ? `: ${closedOn.reason}` : ''}`)
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
    // اجاره هم مثل سانس سطح دارد (از روی اجاره‌ی یک ساعت)؛ عضویتی که این سطح را ندارد فقط کیف پول
    const useSub = prefer === 'subscription' && !!sub && subCovers(sub.planId, rentalTier(gym!, d)) && sub.credit >= price
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
  assertSessionNow(gym!, user.gender)
  const open = db().checkins.find((t) => t.userId === userId && t.gymId === gymId && !t.classId && ticketStatus(t) === 'active')
  if (open) throw new AppError('برای امروز بلیت فعال این باشگاه را دارید')
  let created!: CheckIn
  mutate((d) => {
    created = issueTicket(d, user, gym!, { prefer: prefer === 'wallet' ? 'wallet' : 'subscription' })
    notify(d, gym!.ownerId, 'ورزشکار جدید در راه است', `${user.name} برای ${gym!.name} بلیت گرفت (${toman(created.paid ?? created.price)}).`, '', '/panel/gym/checkins')
  })
  return created
})

/* ───────── غیبت در کلاس ───────── */

/** با این تعداد غیبت در ۳۰ روز اخیر، رزرو کلاس موقتاً بسته می‌شود */
export const NO_SHOW_LIMIT = 3
const NO_SHOW_WINDOW = 30 * 86_400_000

/** غیبت‌های اخیر: بلیت کلاسی که استفاده نشد و وقتش گذشت */
export function noShows(userId: ID, s: Pick<DBState, 'checkins'> = db(), at = new Date()) {
  return s.checkins
    .filter((t) => t.userId === userId && t.classId && t.slotAt && ticketStatus(t, at) === 'expired' && at.getTime() - new Date(t.slotAt).getTime() < NO_SHOW_WINDOW)
    .map((t) => new Date(t.slotAt!).getTime())
    .sort((a, b) => a - b)
}

/** اگر رزرو کلاس به‌خاطر غیبت بسته است، تاریخ باز شدنش */
export function noShowBlockedUntil(userId: ID, s: Pick<DBState, 'checkins'> = db(), at = new Date()) {
  const list = noShows(userId, s, at)
  if (list.length < NO_SHOW_LIMIT) return null
  return new Date(list[list.length - NO_SHOW_LIMIT] + NO_SHOW_WINDOW)
}

/** بررسی مشترک رزرو و لیست انتظار: باشگاه، کلاس، نوبت، عضو خانواده و غیبت‌ها */
function classSlot(gymId: string, classId: string, slotAt: string, memberId?: string) {
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
  if (!classAllows(gym!, cls, at, (member ?? user).gender)) throw new AppError(`این نوبت ویژه‌ی ${GENDER_WORD[classGender(gym!, cls, at) as Sex]} است`)
  const key = at.toISOString()
  if (db().checkins.some((t) => t.userId === userId && t.classId === classId && t.slotAt === key && t.memberId === member?.id && isLive(t))) throw new AppError(member ? `این کلاس را قبلاً برای ${member.name} رزرو کرده‌اید` : 'این کلاس را قبلاً رزرو کرده‌اید')
  const until = noShowBlockedUntil(userId)
  if (until) throw new AppError(`به‌خاطر ${num(NO_SHOW_LIMIT)} غیبت در ۳۰ روز اخیر، رزرو کلاس تا ${until.toLocaleDateString('fa-IR')} بسته است`)
  return { userId, gym: gym!, user, member, cls, key }
}

/** رزرو یک نوبت کلاس گروهی */
export const bookClass = svc('fityab.bookClass', (gymId: string, classId: string, slotAt: string, prefer: 'subscription' | 'wallet' = 'subscription', memberId?: string): CheckIn => {
  const { gym, user, member, cls, key } = classSlot(gymId, classId, slotAt, memberId)
  if (bookedCount(classId, key) >= cls.capacity) throw new AppError('ظرفیت این کلاس تکمیل است؛ می‌توانی در لیست انتظار بمانی')
  let created!: CheckIn
  mutate((d) => {
    if (bookedCount(classId, key, d) >= cls.capacity) throw new AppError('ظرفیت این کلاس تکمیل است')
    created = issueTicket(d, user, gym, { prefer: prefer === 'wallet' ? 'wallet' : 'subscription', cls, slotAt: key, member })
    // اگر در صف همین نوبت بود (مثلاً ظرفیت بیشتر شد و خودش رزرو کرد)، از صف خارج می‌شود
    d.waitlist = (d.waitlist ?? []).filter((w) => !(w.userId === user.id && w.classId === cls.id && w.slotAt === key && w.memberId === member?.id))
    notify(d, gym.ownerId, 'رزرو کلاس جدید', `${member ? `${member.name} (${user.name})` : user.name} کلاس «${cls.title}» را رزرو کرد.`, '', '/panel/gym/checkins')
  })
  return created
})

/* ───────── لیست انتظار ───────── */

export const WAITLIST_MAX = 30

/** صف یک نوبت کلاس به ترتیب ثبت */
export function waitlistFor(classId: string, slotAt: string, s: Pick<DBState, 'waitlist'> = db()) {
  return (s.waitlist ?? []).filter((w) => w.classId === classId && w.slotAt === slotAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** پیوستن به لیست انتظار کلاس پر؛ با خالی شدن جا خودکار رزرو و پرداخت می‌شود */
export const joinWaitlist = svc('fityab.waitlist', (gymId: string, classId: string, slotAt: string, prefer: 'subscription' | 'wallet' = 'subscription', memberId?: string) => {
  const { userId, member, cls, key } = classSlot(gymId, classId, slotAt, memberId)
  if (bookedCount(classId, key) < cls.capacity) throw new AppError('این کلاس هنوز جای خالی دارد؛ همین حالا رزرو کن')
  const queue = waitlistFor(classId, key)
  if (queue.some((w) => w.userId === userId && w.memberId === member?.id)) throw new AppError('در لیست انتظار این کلاس هستی')
  if (queue.length >= WAITLIST_MAX) throw new AppError('لیست انتظار این کلاس پر است')
  mutate((d) => {
    d.waitlist = [...(d.waitlist ?? []), { id: uid('w-'), userId, gymId, classId, slotAt: key, memberId: member?.id, prefer: prefer === 'wallet' ? 'wallet' : 'subscription', createdAt: now() }]
  })
  return queue.length + 1
})

export const leaveWaitlist = svc('fityab.leaveWaitlist', (entryId: string) => {
  const me = currentUserId()
  if (!(db().waitlist ?? []).some((w) => w.id === entryId && w.userId === me)) throw new AppError('در این لیست انتظار نیستی')
  mutate((d) => {
    d.waitlist = d.waitlist.filter((w) => w.id !== entryId)
  })
})

/** با خالی شدن جا، صف به ترتیب رزرو می‌شود؛ کسی که اعتبار ندارد، رزرو کلاس برایش بسته است یا خودش بلیت دارد رد می‌شود (داخل mutate) */
function promoteSlot(d: DBState, gymId: ID, classId: ID, slotAt: string) {
  if (new Date(slotAt).getTime() <= Date.now()) return
  const gym = d.gyms.find((g) => g.id === gymId)
  const cls = gym?.classes?.find((c) => c.id === classId)
  if (!gym || !cls) return
  for (const w of waitlistFor(classId, slotAt, d)) {
    if (bookedCount(cls.id, slotAt, d) >= cls.capacity) return
    d.waitlist = d.waitlist.filter((x) => x.id !== w.id)
    const user = d.users.find((u) => u.id === w.userId)
    if (!user || user.blocked) continue
    if (d.checkins.some((t) => t.userId === user.id && t.classId === classId && t.slotAt === slotAt && t.memberId === w.memberId && isLive(t))) continue
    if (noShowBlockedUntil(user.id, d)) {
      notify(d, user.id, 'نوبتت در لیست انتظار رسید', `برای کلاس «${cls.title}» جا باز شد، ولی رزرو کلاس به‌خاطر غیبت‌های اخیر موقتاً بسته است.`, '', '/tickets')
      continue
    }
    const member = w.memberId ? user.family?.find((m) => m.id === w.memberId) : undefined
    try {
      issueTicket(d, user, gym, { prefer: w.prefer, cls, slotAt, member })
      notify(d, user.id, 'جای خالی پیدا شد!', `${member ? `${member.name} در` : 'در'} کلاس «${cls.title}» ${gym.name} رزرو شد؛ بلیت آماده است.`, '', '/tickets')
      notify(d, gym.ownerId, 'رزرو از لیست انتظار', `${user.name} از لیست انتظار وارد کلاس «${cls.title}» شد.`, '', '/panel/gym/checkins')
    } catch {
      notify(d, user.id, 'نوبتت در لیست انتظار رسید', `برای کلاس «${cls.title}» جا باز شد ولی اعتبار یا موجودی کافی نبود؛ نفر بعدی جایت را گرفت.`, '', '/wallet')
    }
  }
}

/* ───────── لغو از طرف باشگاه: نوبت، روز تعطیل، تغییر برنامه ───────── */

/** بازگشت کامل مبلغ بلیت‌های فعالِ منطبق و خبر دادن به ورزشکار (داخل mutate) */
function providerCancel(d: DBState, gym: Gym, match: (t: CheckIn) => boolean, reason: string) {
  let n = 0
  for (const x of d.checkins) {
    if (x.gymId !== gym.id || x.status !== 'active' || !match(x)) continue
    const tx = d.transactions.find((r) => r.id === x.txId) ?? d.transactions.find((r) => r.type === 'checkin' && r.refId === x.id)
    if (tx) reversePayment(d, tx, `لغو از طرف ${gym.name}`)
    if (x.campaignId) {
      const c = d.campaigns.find((k) => k.id === x.campaignId)
      if (c) c.usedBy = c.usedBy.filter((u) => u !== x.userId)
    }
    x.status = 'cancelled'
    n++
    notify(d, x.userId, `${gym.name}: نوبت لغو شد`, `${reason}؛ مبلغ کامل برگشت داده شد.`, '', '/tickets')
  }
  return n
}

/** پاک کردن صف نوبت‌هایی که دیگر برگزار نمی‌شوند و خبر دادن به افراد صف (داخل mutate) */
function dropWaitlist(d: DBState, gym: Gym, match: (w: WaitlistEntry) => boolean, reason: string) {
  const gone = (d.waitlist ?? []).filter((w) => w.gymId === gym.id && match(w))
  if (!gone.length) return
  d.waitlist = d.waitlist.filter((w) => !gone.includes(w))
  gone.forEach((w) => notify(d, w.userId, `${gym.name}: نوبت لغو شد`, `${reason}؛ از لیست انتظار خارج شدی.`, '', `/fityab/${gym.id}`))
}

const myGym = (gymId: ID) => {
  const gym = db().gyms.find((g) => g.id === gymId && g.ownerId === currentUserId())
  if (!gym) throw new AppError('باشگاه یافت نشد')
  return gym
}

/** لغو یک نوبت کلاس از طرف باشگاه با بازگشت کامل وجه به همه */
export const cancelClassSlot = svc(
  'fityab.cancelSlot',
  (gymId: ID, classId: ID, slotAt: string, reason: string) => {
    const gym = myGym(gymId)
    const at = new Date(slotAt)
    const slot = upcomingClasses(gym, 8).find((x) => x.cls.id === classId && x.at.getTime() === at.getTime())
    if (!slot) throw new AppError('این نوبت در برنامه‌ی پیش رو نیست')
    const why = String(reason ?? '').trim().slice(0, 120) || 'باشگاه این نوبت را لغو کرد'
    const key = at.toISOString()
    let n = 0
    mutate((d) => {
      const g = d.gyms.find((x) => x.id === gymId)!
      g.cancelledSlots = [...(g.cancelledSlots ?? []).filter((x) => new Date(x.slotAt).getTime() > Date.now()), { classId, slotAt: key, reason: why }]
      n = providerCancel(d, g, (t) => t.classId === classId && t.slotAt === key, `کلاس «${slot.cls.title}» ${why}`)
      dropWaitlist(d, g, (w) => w.classId === classId && w.slotAt === key, `کلاس «${slot.cls.title}» ${why}`)
    })
    return n
  },
  { roles: ['gym'] },
)

/** تعطیلی یک روز (تعطیل رسمی، تعمیرات…)؛ همه‌ی بلیت‌های آن روز با بازگشت کامل لغو می‌شوند. closed=false دوباره باز می‌کند */
export const setClosedDay = svc(
  'fityab.closeDay',
  (gymId: ID, day: string, reason: string, closed = true) => {
    myGym(gymId)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new AppError('تاریخ معتبر نیست')
    const today = dayKey()
    const limit = dayKey(new Date(Date.now() + 60 * 86_400_000))
    if (closed && (day < today || day > limit)) throw new AppError('تعطیلی را برای امروز تا ۶۰ روز آینده ثبت کنید')
    const why = String(reason ?? '').trim().slice(0, 120) || 'تعطیلی باشگاه'
    let n = 0
    mutate((d) => {
      const g = d.gyms.find((x) => x.id === gymId)!
      const rest = (g.closedDays ?? []).filter((c) => c.day !== day && c.day >= today)
      g.closedDays = closed ? [...rest, { day, reason: why }].sort((a, b) => a.day.localeCompare(b.day)) : rest
      if (!closed) return
      const onDay = (iso?: string) => !!iso && dayKey(new Date(iso)) === day
      n = providerCancel(d, g, (t) => (t.slotAt ? onDay(t.slotAt) : onDay(t.createdAt)), `${g.name} در این روز تعطیل است (${why})`)
      dropWaitlist(d, g, (w) => onDay(w.slotAt), `${g.name} در این روز تعطیل است (${why})`)
    })
    return n
  },
  { roles: ['gym'] },
)

/** بعد از ویرایش برنامه: رزرو نوبت‌های حذف‌شده برمی‌گردد، صف آن‌ها پاک می‌شود و اگر ظرفیت بیشتر شده صف جلو می‌رود (داخل mutate) */
function reconcileSchedule(d: DBState, gym: Gym) {
  const now = Date.now()
  const valid = new Set(upcomingClasses(gym, 8).map((x) => `${x.cls.id}|${x.at.toISOString()}`))
  const gone = (classId?: string, slotAt?: string) => !!classId && !!slotAt && new Date(slotAt).getTime() > now && !valid.has(`${classId}|${slotAt}`)
  // جنسیت شرکت‌کننده (عضو خانواده یا خود کاربر) با جنسیت جدید نوبت نمی‌خواند
  const sexOf = (userId: ID, memberId?: ID) => {
    const u = d.users.find((x) => x.id === userId)
    return (memberId ? u?.family?.find((m) => m.id === memberId) : u)?.gender
  }
  const misfit = (classId: string | undefined, slotAt: string | undefined, userId: ID, memberId?: ID) => {
    const cls = gym.classes?.find((c) => c.id === classId)
    return !!cls && !!slotAt && new Date(slotAt).getTime() > now && !classAllows(gym, cls, new Date(slotAt), sexOf(userId, memberId))
  }
  providerCancel(d, gym, (t) => !t.rentalEnd && gone(t.classId, t.slotAt), 'برنامه‌ی این کلاس تغییر کرد')
  providerCancel(d, gym, (t) => !t.rentalEnd && misfit(t.classId, t.slotAt, t.userId, t.memberId), 'این نوبت ویژه‌ی جنسیت دیگری شد')
  dropWaitlist(d, gym, (w) => gone(w.classId, w.slotAt), 'برنامه‌ی این کلاس تغییر کرد')
  dropWaitlist(d, gym, (w) => misfit(w.classId, w.slotAt, w.userId, w.memberId), 'این نوبت ویژه‌ی جنسیت دیگری شد')
  const slots = new Set((d.waitlist ?? []).filter((w) => w.gymId === gym.id).map((w) => `${w.classId}|${w.slotAt}`))
  slots.forEach((k) => {
    const [classId, slotAt] = k.split('|')
    promoteSlot(d, gym.id, classId, slotAt)
  })
}

/* ───────── شعبه‌ها ───────── */

/** نام کامل: «برند · شعبه» یا نام باشگاه */
export const gymTitle = (g: Pick<Gym, 'name' | 'branch'>) => (g.branch ? `${g.name} · ${g.branch}` : g.name)

/** برند یک باشگاه؛ اگر برند جدا ثبت نشده، نام خود باشگاه */
export const brandOf = (g: Pick<Gym, 'brand' | 'name'>) => (g.brand || g.name).trim()

/** شعبه‌های دیگر همان برند؛ فقط باشگاه‌های همان صاحب تا کسی نتواند خودش را شعبه‌ی برند دیگری جا بزند */
export function branchesOf(gym: Gym, all: Gym[]) {
  const key = brandOf(gym)
  return all.filter((g) => g.id !== gym.id && g.approved && g.ownerId === gym.ownerId && brandOf(g) === key)
}

/* ───────── جست‌وجوی کلاس در همه‌ی باشگاه‌ها ───────── */

/** کلاس‌های همه‌ی باشگاه‌ها بین دو زمان، به ترتیب شروع */
export function classesBetween(gyms: Gym[], from: Date, to: Date) {
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1)
  return gyms
    .flatMap((gym) => upcomingClasses(gym, days, from).filter((x) => x.at < to).map((x) => ({ gym, ...x })))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
}

/**
 * پیش‌نمایش لغو: تا مهلت لغو (۲ ساعت پیش از کلاس، ۱۲ ساعت پیش از اجاره) یا ۱۵ دقیقه‌ی اول پس از خرید، بازگشت کامل؛
 * بعد از آن تا شروع، با کسر درصد لغو دیرهنگام؛ بعد از شروع، غیرقابل لغو
 */
export function cancelQuote(t: CheckIn, at = Date.now(), s: Pick<DBState, 'settings'> = db()) {
  const paid = t.paid ?? t.price
  const window = t.rentalEnd ? RENTAL_CANCEL_HOURS : CLASS_CANCEL_HOURS
  const start = t.slotAt ? new Date(t.slotAt).getTime() : 0
  if (t.slotAt && start <= at) return { allowed: false, late: true, fee: paid, refund: 0, window }
  const late = !!t.slotAt && !inCancelGrace(t) && start - at < window * HOUR
  const pct = Math.min(100, Math.max(0, s.settings.lateCancelFeePct ?? 50))
  const fee = late ? Math.min(paid, Math.round((paid * pct) / 100 / 1000) * 1000) : 0
  return { allowed: true, late, fee, refund: paid - fee, window }
}

/** لغو بلیت؛ بازگشت کامل یا با کسر هزینه‌ی لغو دیرهنگام */
export const cancelTicket = svc('fityab.cancel', (ticketId: string) => {
  const me = currentUserId()
  const t = db().checkins.find((x) => x.id === ticketId && x.userId === me)
  if (!t) throw new AppError('بلیت یافت نشد')
  if (ticketStatus(t) !== 'active') throw new AppError('فقط بلیت‌های فعال قابل لغو هستند')
  const q = cancelQuote(t)
  if (!q.allowed) throw new AppError('این نوبت شروع شده و دیگر قابل لغو نیست')
  let refunded = 0
  mutate((d) => {
    const x = d.checkins.find((c) => c.id === ticketId)!
    const gym = d.gyms.find((g) => g.id === x.gymId)
    const tx = d.transactions.find((r) => r.id === x.txId) ?? d.transactions.find((r) => r.type === 'checkin' && r.refId === x.id)
    if (tx) refunded = reversePayment(d, tx, 'بازگشت وجه بلیت لغوشده')
    // لغو دیرهنگام: بخشی از بها به باشگاه می‌رسد چون جا دیر آزاد شده است
    if (tx && q.fee > 0 && gym) {
      try {
        applyPayment(d, { type: 'checkin', from: x.paidWith === 'subscription' ? 'subscription' : me, payerId: me, to: gym.ownerId, amount: q.fee, module: 'fityab', refId: x.id, description: `هزینه‌ی لغو دیرهنگام — ${gym.name}` })
        refunded -= q.fee
      } catch {
        /* اگر اعتبار برگشتی دیگر در دسترس نبود، هزینه‌ای گرفته نمی‌شود */
      }
    }
    // لغو کامل: پیشنهاد تخفیف باشگاه دوباره قابل استفاده می‌شود
    if (q.fee === 0 && x.campaignId) {
      const c = d.campaigns.find((k) => k.id === x.campaignId)
      if (c) c.usedBy = c.usedBy.filter((u) => u !== me)
    }
    x.status = 'cancelled'
    if (gym) notify(d, gym.ownerId, 'لغو بلیت', `یک بلیت ${gym.name} لغو شد${q.late ? ' (دیرهنگام)' : ''}.`, '', '/panel/gym/checkins')
    notify(d, me, 'بلیت لغو شد', `${toman(refunded)} به ${x.paidWith === 'subscription' ? 'اعتبار اشتراک' : 'کیف پول'} شما برگشت.`, '', '/tickets')
    if (x.classId && x.slotAt) promoteSlot(d, x.gymId, x.classId, x.slotAt)
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
  if (!open) assertSessionNow(gym, user.gender)
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
    assertSessionNow(gym, user.gender)
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
  if (approve) assertSessionNow(gym!, user.gender)
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

/** موقعیت داخل محدوده‌ی ایران */
export const inIran = (lat?: number, lng?: number) => typeof lat === 'number' && typeof lng === 'number' && lat >= 25 && lat <= 40 && lng >= 44 && lng <= 63.5

/** موقعیت هنوز همان مرکز پیش‌فرض شهر است (یعنی روی نقشه انتخاب نشده) */
export function isDefaultSpot(g: Pick<Partial<Gym>, 'city' | 'lat' | 'lng'>) {
  const [lat, lng] = cityCenter(g.city)
  return Math.abs((g.lat ?? 0) - lat) < 1e-4 && Math.abs((g.lng ?? 0) - lng) < 1e-4
}

export const MIN_GYM_PHOTOS = 3
const digits = (v: unknown) => String(v ?? '').replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
export const cleanGymPhone = (v: unknown) => digits(v).replace(/\D/g, '').replace(/^98/, '0')

/** موارد ناقص برای ثبت باشگاه؛ همان فهرستی که در فرم و روی سرور بررسی می‌شود */
export function gymMissing(g: Partial<Gym>): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const add = (key: string, label: string) => out.push({ key, label })
  const rental = VENUE_KINDS[(g.kind ?? 'gym') as keyof typeof VENUE_KINDS]?.booking === 'rental'
  if (!g.name?.trim() || g.name.trim().length < 2) add('name', 'نام مجموعه')
  if (!g.city?.trim()) add('city', 'شهر')
  if (!/^0\d{10}$/.test(cleanGymPhone(g.phone))) add('phone', 'تلفن ۱۱ رقمی (ثابت با کد شهر یا همراه)')
  if ((g.description ?? '').trim().length < 30) add('description', 'معرفی کامل (حداقل ۳۰ حرف)')
  if (!(g.sports ?? []).length) add('sports', 'حداقل یک رشته')
  if (!rental && !(g.hours ?? '').trim()) add('hours', 'ساعات کاری')
  if ((g.address ?? '').trim().length < 8) add('address', 'نشانی کامل')
  if (!inIran(g.lat, g.lng) || isDefaultSpot(g)) add('location', 'موقعیت دقیق روی نقشه')
  if ((g.media ?? []).filter((m) => m.type === 'image').length < MIN_GYM_PHOTOS) add('photos', `حداقل ${MIN_GYM_PHOTOS} عکس واقعی از مجموعه`)
  if (!g.license?.number || g.license.number.trim().length < 4) add('licenseNo', 'شماره‌ی پروانه یا مجوز')
  if (!g.license?.doc) add('licenseDoc', 'تصویر پروانه یا مجوز')
  return out
}

const GYM_FIELDS = ['name', 'tagline', 'description', 'address', 'city', 'lat', 'lng', 'phone', 'sessionPrice', 'facilities', 'sports', 'hours', 'gender', 'media', 'capacity', 'classes', 'offPeak', 'kind', 'rental', 'genderHours', 'brand', 'branch', 'license'] as const

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
  if (out.genderHours) {
    if (out.genderHours.length > 21) throw new AppError('سانس‌های جنسیتی بیش از حد است')
    out.genderHours = out.genderHours.map((w) => {
      const from = Math.round(Number(w.from))
      const to = Math.round(Number(w.to))
      if (!(from >= 0 && to <= 24 && from < to)) throw new AppError('ساعت سانس بانوان/آقایان معتبر نیست')
      if (w.gender !== 'male' && w.gender !== 'female') throw new AppError('جنسیت سانس را انتخاب کنید')
      const days = [...new Set((w.days ?? []).map(Number))].filter((x) => x >= 0 && x <= 6).sort()
      return { from, to, gender: w.gender, days: days.length && days.length < 7 ? days : undefined }
    })
    // دو سانس متفاوت نباید در یک ساعت از یک روز روی هم بیفتند
    for (let w = 0; w < 7; w++) {
      const list = out.genderHours.filter((x) => !x.days || x.days.includes(w)).sort((a, b) => a.from - b.from)
      for (let i = 1; i < list.length; i++) if (list[i].from < list[i - 1].to) throw new AppError(`سانس‌های ${weekdayLabel(w)} روی هم افتاده‌اند`)
    }
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
        gender: c.gender === 'male' || c.gender === 'female' ? c.gender : undefined,
        audience: kids ? ('kids' as const) : undefined, ageMin: kids ? Math.max(2, Math.round(c.ageMin || 4)) : undefined, ageMax: kids ? Math.min(18, Math.round(c.ageMax || 12)) : undefined,
      }
    })
  }
  if (out.phone !== undefined) out.phone = cleanGymPhone(out.phone).slice(0, 11)
  for (const k of ['name', 'tagline', 'address', 'hours'] as const) if (out[k] !== undefined) out[k] = String(out[k] ?? '').trim().slice(0, k === 'address' ? 200 : 80)
  if (out.description !== undefined) out.description = String(out.description ?? '').trim().slice(0, 3000)
  if (out.lat !== undefined || out.lng !== undefined) {
    if (!inIran(Number(out.lat), Number(out.lng))) throw new AppError('موقعیت باید داخل ایران باشد؛ روی نقشه انتخاب کنید')
    out.lat = +Number(out.lat).toFixed(5)
    out.lng = +Number(out.lng).toFixed(5)
  }
  if (out.media) out.media = out.media.filter((m) => m && (m.type === 'image' || m.type === 'video') && typeof m.url === 'string').slice(0, 20)
  if (out.license !== undefined) {
    const l = out.license as { number?: unknown; doc?: unknown } | undefined
    const doc = String(l?.doc ?? '')
    if (doc && !/^doc-[A-Za-z0-9-]+\.(jpg|png|webp|pdf)$/.test(doc)) throw new AppError('فایل مجوز معتبر نیست')
    out.license = l ? { number: digits(l.number).trim().slice(0, 40), doc } : undefined
  }
  if (out.brand !== undefined) out.brand = String(out.brand ?? '').trim().replace(/\s+/g, ' ').slice(0, 40) || undefined
  if (out.branch !== undefined) out.branch = String(out.branch ?? '').trim().replace(/\s+/g, ' ').slice(0, 40) || undefined
  // باشگاه تک‌جنسیتی سانس‌بندی و کلاس جنسیت‌دار ندارد
  if (out.gender && out.gender !== 'mixed') {
    out.genderHours = undefined
    if (out.classes) out.classes = out.classes.map((c) => ({ ...c, gender: undefined }))
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
    // فایل مجوز باید از همین حساب بارگذاری شده باشد (یا همان فایل قبلی همین باشگاه باشد)
    const prev = input.id ? db().gyms.find((g) => g.id === input.id) : undefined
    if (data.license?.doc && data.license.doc !== prev?.license?.doc && !data.license.doc.startsWith(`doc-${ownerId.replace(/[^A-Za-z0-9]/g, '')}-`)) throw new AppError('فایل مجوز را دوباره بارگذاری کنید')
    if (prev?.review?.status === 'rejected') throw new AppError('ثبت این باشگاه رد شده است؛ برای بررسی دوباره با پشتیبانی تماس بگیرید')
    // باشگاه تازه یا منتشرنشده باید کامل باشد؛ باشگاه منتشرشده‌ی قدیمی فقط نباید موردی را که داشته از دست بدهد
    const merged = { ...(prev ?? {}), ...data }
    const before = new Set(prev?.approved ? gymMissing(prev).map((x) => x.key) : [])
    const missing = gymMissing(merged).filter((x) => !before.has(x.key))
    if (missing.length) throw new AppError(`برای ثبت باشگاه این موارد لازم است: ${missing.map((x) => x.label).join('، ')}`)
    let id = input.id
    mutate((d) => {
      const existing = id ? d.gyms.find((g) => g.id === id) : undefined
      if (id && (!existing || existing.ownerId !== ownerId)) throw new AppError('باشگاه یافت نشد')
      const admins = d.users.filter((u) => u.roles.includes('admin'))
      if (existing) {
        Object.assign(existing, data)
        reconcileSchedule(d, existing)
        // پس از «نیاز به اصلاح»، ذخیره یعنی ارسال دوباره برای بررسی
        if (existing.review?.status === 'changes') {
          existing.review = { status: 'pending', note: existing.review.note, at: now() }
          admins.forEach((a) => notify(d, a.id, 'باشگاه اصلاح‌شده برای بررسی', `«${gymTitle(existing)}»`, '', '/panel/admin/gyms'))
        }
      } else {
        id = uid('g-')
        d.gyms.unshift({
          name: '', tagline: '', description: '', address: '', city: '', lat: 0, lng: 0, phone: '',
          sessionPrice: 0, facilities: [], sports: [], hours: '', gender: 'mixed', media: [], capacity: 50, classes: [],
          ...data,
          id, ownerId, cover: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)], rating: 0, reviews: 0, approved: false, review: { status: 'pending', at: now() }, createdAt: now(),
        } as Gym)
        admins.forEach((a) => notify(d, a.id, 'باشگاه جدید در انتظار تأیید', `«${gymTitle(data as Gym)}» برای فیت‌یاب ثبت شد.`, '', '/panel/admin/gyms'))
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
