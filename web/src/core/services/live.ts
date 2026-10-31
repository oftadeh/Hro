/**
 * کلاس آنلاین زنده: مربی کلاس گروهی (یوگا، HIIT، پیلاتس…) زمان‌بندی می‌کند و بلیت می‌فروشد.
 *  - پرداخت از کیف پول به مربی با کمیسیون فیت‌یار؛ تخفیف اشتراک هم اعمال می‌شود.
 *  - لغو ثبت‌نام تا ۲ ساعت پیش از شروع با بازگشت کامل وجه؛ لغو کلاس توسط مربی = بازگشت وجه همه.
 *  - لینک کلاس فقط به ثبت‌نام‌شده‌ها داده می‌شود و ورود به کلاس، تمرین روز را ثبت می‌کند.
 */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import { uid, now } from '../id'
import type { LiveClass } from '../types'
import { applyPayment, notify, reversePayment } from './ledger'
import { discountPct } from './perks'
import { addXP, completeMission } from './engagement'
import { autoProgress } from './challenges'
import { callLink } from './fityar'
import { dayKey, faDateTime, toman } from '../format'

export const LIVE_CANCEL_HOURS = 2
/** ورود به کلاس از این مقدار دقیقه قبل از شروع باز می‌شود */
export const LIVE_EARLY_MIN = 15
export const LIVE_LEVEL = { beginner: 'مبتدی', intermediate: 'متوسط', advanced: 'پیشرفته', all: 'همه‌ی سطوح' } as const

export const liveEnd = (c: Pick<LiveClass, 'at' | 'durationMin'>) => new Date(new Date(c.at).getTime() + c.durationMin * 60_000)
export const isLiveNow = (c: LiveClass, at = new Date()) =>
  c.status === 'scheduled' && at.getTime() >= new Date(c.at).getTime() - LIVE_EARLY_MIN * 60_000 && at < liveEnd(c)

export const createLiveClass = svc(
  'live.create',
  (input: Pick<LiveClass, 'title' | 'sport' | 'description' | 'level' | 'at' | 'durationMin' | 'price' | 'capacity'>) => {
    const me = currentUserId()
    const coach = db().coaches.find((c) => c.userId === me)
    if (!coach?.verified) throw new AppError('پس از تأیید مدارک مربیگری می‌توانید کلاس آنلاین برگزار کنید')
    const title = String(input.title ?? '').trim()
    if (title.length < 3) throw new AppError('عنوان کلاس را بنویسید')
    const at = new Date(input.at)
    if (isNaN(at.getTime()) || at.getTime() < Date.now() + 30 * 60_000) throw new AppError('زمان کلاس باید حداقل ۳۰ دقیقه بعد باشد')
    if (at.getTime() - Date.now() > 30 * 86_400_000) throw new AppError('کلاس را حداکثر تا ۳۰ روز آینده زمان‌بندی کنید')
    if (!(input.durationMin >= 15 && input.durationMin <= 180)) throw new AppError('مدت کلاس بین ۱۵ تا ۱۸۰ دقیقه است')
    if (!(input.capacity >= 1 && input.capacity <= 500)) throw new AppError('ظرفیت کلاس معتبر نیست')
    if (!(input.price === 0 || input.price >= 10_000)) throw new AppError('بهای بلیت معتبر نیست (رایگان یا حداقل ۱۰ هزار تومان)')
    const level = input.level in LIVE_LEVEL ? input.level : 'all'
    const end = new Date(at.getTime() + input.durationMin * 60_000)
    const clash = db().liveClasses.some((c) => c.hostId === me && c.status === 'scheduled' && new Date(c.at) < end && liveEnd(c) > at)
    if (clash) throw new AppError('در این بازه کلاس دیگری دارید')
    const id = uid('lc-')
    mutate((d) => {
      d.liveClasses.unshift({
        id, hostId: me, title: title.slice(0, 80), sport: String(input.sport || 'فیتنس').slice(0, 30), description: String(input.description ?? '').slice(0, 800), level,
        at: at.toISOString(), durationMin: Math.round(input.durationMin), price: Math.round(input.price), capacity: Math.round(input.capacity),
        attendees: [], joined: [], link: callLink(id + Math.random().toString(36).slice(2, 8)), status: 'scheduled', createdAt: now(),
      })
      // شاگردان مربی (خریداران برنامه) باخبر می‌شوند
      const students = [...new Set(d.planOrders.filter((o) => o.coachId === me).map((o) => o.userId))]
      students.forEach((u) => notify(d, u, 'کلاس آنلاین جدید مربی شما', `«${title}» — ${faDateTime(at.toISOString())}`, '', `/live/${id}`))
    })
    return id
  },
  { roles: ['coach'] },
)

export const registerLiveClass = svc('live.register', (classId: string) => {
  const me = currentUserId()
  const c = db().liveClasses.find((x) => x.id === classId)
  if (!c || c.status !== 'scheduled') throw new AppError('کلاس در دسترس نیست')
  if (c.hostId === me) throw new AppError('شما مدرس این کلاس هستید')
  if (liveEnd(c) < new Date()) throw new AppError('این کلاس تمام شده است')
  if (c.attendees.includes(me)) throw new AppError('قبلاً ثبت‌نام کرده‌اید')
  if (c.attendees.length >= c.capacity) throw new AppError('ظرفیت کلاس تکمیل است')
  mutate((d) => {
    const x = d.liveClasses.find((y) => y.id === classId)!
    if (x.attendees.length >= x.capacity) throw new AppError('ظرفیت کلاس تکمیل است')
    if (x.price > 0)
      applyPayment(d, { type: 'live_class', from: me, payerId: me, to: x.hostId, amount: x.price, module: 'fityar', refId: x.id, discountPct: discountPct(me, 'fityar', d), description: `کلاس آنلاین «${x.title}»` })
    x.attendees.push(me)
    const u = d.users.find((y) => y.id === me)!
    notify(d, x.hostId, 'ثبت‌نام جدید در کلاس آنلاین', `${u.name} در «${x.title}» ثبت‌نام کرد (${x.attendees.length}/${x.capacity}).`, '', '/panel/coach/live')
    notify(d, me, 'ثبت‌نام کلاس آنلاین انجام شد', `${faDateTime(x.at)} — از ${LIVE_EARLY_MIN} دقیقه قبل دکمه‌ی ورود فعال می‌شود.`, '', `/live/${x.id}`)
  })
})

export const leaveLiveClass = svc('live.leave', (classId: string) => {
  const me = currentUserId()
  const c = db().liveClasses.find((x) => x.id === classId)
  if (!c || !c.attendees.includes(me)) throw new AppError('ثبت‌نامی یافت نشد')
  if (new Date(c.at).getTime() - Date.now() < LIVE_CANCEL_HOURS * 3_600_000) throw new AppError(`انصراف فقط تا ${LIVE_CANCEL_HOURS} ساعت پیش از شروع ممکن است`)
  let refunded = 0
  mutate((d) => {
    const x = d.liveClasses.find((y) => y.id === classId)!
    const tx = d.transactions.find((t) => t.type === 'live_class' && t.refId === x.id && t.payerId === me)
    if (tx) refunded = reversePayment(d, tx, `انصراف از کلاس «${x.title}»`)
    x.attendees = x.attendees.filter((a) => a !== me)
  })
  return refunded
})

/** لغو کلاس توسط مربی: بازگشت وجه همه‌ی ثبت‌نام‌شده‌ها */
export const cancelLiveClass = svc(
  'live.cancel',
  (classId: string) => {
    const me = currentUserId()
    const c = db().liveClasses.find((x) => x.id === classId && x.hostId === me)
    if (!c || c.status !== 'scheduled') throw new AppError('کلاس یافت نشد')
    if (liveEnd(c) < new Date()) throw new AppError('کلاس برگزار شده است')
    mutate((d) => {
      const x = d.liveClasses.find((y) => y.id === classId)!
      x.status = 'cancelled'
      for (const a of x.attendees) {
        const tx = d.transactions.find((t) => t.type === 'live_class' && t.refId === x.id && t.payerId === a)
        const back = tx ? reversePayment(d, tx, `لغو کلاس «${x.title}» توسط مربی`) : 0
        notify(d, a, 'کلاس آنلاین لغو شد', `«${x.title}» لغو شد${back ? ` و ${toman(back)} به کیف پول شما برگشت` : ''}.`, '', '/live')
      }
    })
  },
  { roles: ['coach'] },
)

/** ورود به کلاس: لینک را برمی‌گرداند و یک بار تمرین روز را ثبت می‌کند */
export const enterLiveClass = svc('live.enter', (classId: string) => {
  const me = currentUserId()
  const c = db().liveClasses.find((x) => x.id === classId)
  if (!c || c.status !== 'scheduled') throw new AppError('کلاس در دسترس نیست')
  const host = c.hostId === me
  if (!host && !c.attendees.includes(me)) throw new AppError('ابتدا در کلاس ثبت‌نام کنید')
  if (!isLiveNow(c)) throw new AppError(new Date() < new Date(c.at) ? `ورود از ${LIVE_EARLY_MIN} دقیقه قبل از شروع باز می‌شود` : 'این کلاس تمام شده است')
  if (!host && !c.joined.includes(me))
    mutate((d) => {
      const x = d.liveClasses.find((y) => y.id === classId)!
      x.joined.push(me)
      d.workouts.unshift({ id: uid('w-'), userId: me, day: dayKey(), title: `کلاس آنلاین: ${x.title}`, durationMin: x.durationMin, exercises: [], liveClassId: x.id, createdAt: now() })
      const day = dayKey()
      let log = d.dailyLogs.find((l) => l.userId === me && l.day === day)
      if (!log) d.dailyLogs.push((log = { userId: me, day, water: 0, steps: 0, workoutMinutes: 0, calories: 0, sleepHours: 0, missionsDone: [], rewardClaimed: false }))
      log.workoutMinutes = Math.min(600, log.workoutMinutes + x.durationMin)
      if (x.durationMin >= 20) completeMission(d, me, 'workout')
      autoProgress(d, me, 'workouts', 1, 'workout')
      autoProgress(d, me, 'minutes', x.durationMin, 'workout')
      addXP(d, me, 30)
    })
  return c.link
})
