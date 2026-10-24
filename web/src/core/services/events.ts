/**
 * رویدادهای ورزشی: مسابقه‌ی دو، کوهپیمایی، تورنمنت و کارگاه.
 *  - باشگاه‌دار، مربی یا مدیر رویداد می‌سازد؛ رویدادهای غیرمدیر پس از تأیید منتشر می‌شوند.
 *  - ثبت‌نام با پرداخت ورودی به برگزارکننده (با کمیسیون) و صدور شماره‌ی سینه (bib).
 *  - انصراف تا ۴۸ ساعت قبل با بازگشت وجه؛ لغو رویداد = بازگشت وجه همه.
 *  - برگزارکننده حضور و نتایج را ثبت می‌کند؛ شرکت‌کنندگان و نفرات برتر امتیاز می‌گیرند.
 */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import { uid, now } from '../id'
import type { SportEvent } from '../types'
import { applyPayment, notify, reversePayment } from './ledger'
import { addXP } from './engagement'
import { EVENT_KINDS, GRADIENTS } from '../config'
import { faDateTime, toman } from '../format'

export const EVENT_CANCEL_HOURS = 48
const PODIUM_XP = [200, 150, 100]

const isAdmin = (id: string) => !!db().users.find((u) => u.id === id)?.roles.includes('admin')
const canManage = (e: SportEvent, me: string) => e.organizerId === me || isAdmin(me)

export type NewEvent = Pick<SportEvent, 'title' | 'kind' | 'sport' | 'description' | 'at' | 'location' | 'city' | 'fee' | 'capacity' | 'categories' | 'gender'> & { lat?: number; lng?: number }

function clean(input: NewEvent) {
  const title = String(input.title ?? '').trim()
  if (title.length < 4) throw new AppError('عنوان رویداد را کامل بنویسید')
  if (!(input.kind in EVENT_KINDS)) throw new AppError('نوع رویداد معتبر نیست')
  const at = new Date(input.at)
  if (isNaN(at.getTime()) || at.getTime() < Date.now() + 24 * 3_600_000) throw new AppError('زمان رویداد باید حداقل یک روز بعد باشد')
  if (!String(input.location ?? '').trim()) throw new AppError('محل برگزاری را بنویسید')
  if (!(input.capacity >= 2 && input.capacity <= 20_000)) throw new AppError('ظرفیت معتبر نیست')
  if (!(input.fee === 0 || input.fee >= 10_000)) throw new AppError('ورودی معتبر نیست (رایگان یا حداقل ۱۰ هزار تومان)')
  return {
    title: title.slice(0, 90), kind: input.kind, sport: String(input.sport || EVENT_KINDS[input.kind]).slice(0, 30), description: String(input.description ?? '').slice(0, 2000),
    at: at.toISOString(), location: String(input.location).trim().slice(0, 150), city: String(input.city || 'اصفهان').slice(0, 30), lat: input.lat, lng: input.lng,
    fee: Math.round(input.fee), capacity: Math.round(input.capacity), categories: (input.categories ?? []).map((c) => String(c).trim()).filter(Boolean).slice(0, 8),
    gender: (['male', 'female', 'mixed'].includes(input.gender) ? input.gender : 'mixed') as SportEvent['gender'],
  }
}

export const createEvent = svc(
  'event.create',
  (input: NewEvent) => {
    const me = currentUserId()
    const data = clean(input)
    const admin = isAdmin(me)
    const id = uid('ev-')
    mutate((d) => {
      d.events.unshift({ ...data, id, organizerId: me, cover: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)], registrations: [], approved: admin, status: 'open', createdAt: now() })
      if (!admin) d.users.filter((u) => u.roles.includes('admin')).forEach((a) => notify(d, a.id, 'رویداد جدید در انتظار تأیید', `«${data.title}»`, '', '/panel/admin/approvals'))
    })
    return id
  },
  { roles: ['gym', 'coach', 'admin'] },
)

export const updateEvent = svc('event.update', (eventId: string, input: Partial<Pick<SportEvent, 'description' | 'location' | 'capacity' | 'status'>>) => {
  const me = currentUserId()
  const e = db().events.find((x) => x.id === eventId)
  if (!e || !canManage(e, me)) throw new AppError('رویداد یافت نشد')
  if (e.status === 'done' || e.status === 'cancelled') throw new AppError('این رویداد بسته شده است')
  mutate((d) => {
    const x = d.events.find((y) => y.id === eventId)!
    if (input.description !== undefined) x.description = String(input.description).slice(0, 2000)
    if (input.location !== undefined && String(input.location).trim()) x.location = String(input.location).trim().slice(0, 150)
    if (input.capacity !== undefined) {
      if (input.capacity < x.registrations.length) throw new AppError('ظرفیت از تعداد ثبت‌نام‌شده‌ها کمتر است')
      x.capacity = Math.round(input.capacity)
    }
    if (input.status === 'open' || input.status === 'closed') x.status = input.status
  })
})

export const approveEvent = svc(
  'event.approve',
  (eventId: string, approve: boolean) => {
    mutate((d) => {
      const e = d.events.find((x) => x.id === eventId)
      if (!e) throw new AppError('رویداد یافت نشد')
      if (approve) {
        e.approved = true
        notify(d, e.organizerId, 'رویداد شما منتشر شد', `«${e.title}» تأیید شد و ثبت‌نام باز است.`, '', `/events/${e.id}`)
      } else {
        e.status = 'cancelled'
        notify(d, e.organizerId, 'رویداد تأیید نشد', `«${e.title}» با قوانین کی‌فیت مطابقت نداشت.`, '', '/events')
      }
    })
  },
  { roles: ['admin'] },
)

export const registerEvent = svc('event.register', (eventId: string, category?: string) => {
  const me = currentUserId()
  const e = db().events.find((x) => x.id === eventId)
  const u = db().users.find((x) => x.id === me)!
  if (!e || !e.approved) throw new AppError('رویداد در دسترس نیست')
  if (e.status !== 'open') throw new AppError('ثبت‌نام این رویداد بسته است')
  if (new Date(e.at) < new Date()) throw new AppError('زمان رویداد گذشته است')
  if (e.organizerId === me) throw new AppError('شما برگزارکننده‌ی این رویداد هستید')
  if (e.gender !== 'mixed' && u.gender && u.gender !== e.gender) throw new AppError(e.gender === 'female' ? 'این رویداد ویژه‌ی بانوان است' : 'این رویداد ویژه‌ی آقایان است')
  if (e.registrations.some((r) => r.userId === me)) throw new AppError('قبلاً ثبت‌نام کرده‌اید')
  if (e.registrations.length >= e.capacity) throw new AppError('ظرفیت رویداد تکمیل است')
  if (e.categories.length && (!category || !e.categories.includes(category))) throw new AppError('رده/مسافت را انتخاب کنید')
  let bib = 0
  mutate((d) => {
    const x = d.events.find((y) => y.id === eventId)!
    if (x.registrations.length >= x.capacity) throw new AppError('ظرفیت رویداد تکمیل است')
    if (x.fee > 0) applyPayment(d, { type: 'event_entry', from: me, payerId: me, to: x.organizerId, amount: x.fee, module: 'event', refId: x.id, description: `ثبت‌نام «${x.title}»` })
    bib = Math.max(100, ...x.registrations.map((r) => r.bib)) + 1
    x.registrations.push({ userId: me, bib, category: category || undefined, at: now() })
    if (x.registrations.length >= x.capacity) x.status = 'closed'
    addXP(d, me, 20)
    notify(d, me, 'ثبت‌نام رویداد انجام شد', `«${x.title}» — ${faDateTime(x.at)} — شماره‌ی شما: ${bib}`, '', `/events/${x.id}`)
    notify(d, x.organizerId, 'ثبت‌نام جدید', `${u.name} در «${x.title}» ثبت‌نام کرد (${x.registrations.length}/${x.capacity}).`, '', `/events/${x.id}`)
  })
  return bib
})

export const cancelRegistration = svc('event.unregister', (eventId: string) => {
  const me = currentUserId()
  const e = db().events.find((x) => x.id === eventId)
  if (!e || !e.registrations.some((r) => r.userId === me)) throw new AppError('ثبت‌نامی یافت نشد')
  if (e.status === 'done') throw new AppError('رویداد برگزار شده است')
  if (new Date(e.at).getTime() - Date.now() < EVENT_CANCEL_HOURS * 3_600_000) throw new AppError(`انصراف فقط تا ${EVENT_CANCEL_HOURS} ساعت پیش از رویداد ممکن است`)
  let refunded = 0
  mutate((d) => {
    const x = d.events.find((y) => y.id === eventId)!
    const tx = d.transactions.find((t) => t.type === 'event_entry' && t.refId === x.id && t.payerId === me)
    if (tx) refunded = reversePayment(d, tx, `انصراف از «${x.title}»`)
    x.registrations = x.registrations.filter((r) => r.userId !== me)
    if (x.status === 'closed' && x.registrations.length < x.capacity) x.status = 'open'
  })
  return refunded
})

export const cancelEvent = svc('event.cancel', (eventId: string) => {
  const me = currentUserId()
  const e = db().events.find((x) => x.id === eventId)
  if (!e || !canManage(e, me)) throw new AppError('رویداد یافت نشد')
  if (e.status === 'done' || e.status === 'cancelled') throw new AppError('این رویداد بسته شده است')
  mutate((d) => {
    const x = d.events.find((y) => y.id === eventId)!
    x.status = 'cancelled'
    for (const r of x.registrations) {
      const tx = d.transactions.find((t) => t.type === 'event_entry' && t.refId === x.id && t.payerId === r.userId)
      const back = tx ? reversePayment(d, tx, `لغو رویداد «${x.title}»`) : 0
      notify(d, r.userId, 'رویداد لغو شد', `«${x.title}» لغو شد${back ? ` و ${toman(back)} به کیف پول شما برگشت` : ''}.`, '', '/events')
    }
  })
})

/** ثبت حضور در روز رویداد با شماره‌ی سینه */
export const checkInEvent = svc('event.checkIn', (eventId: string, bib: number) => {
  const me = currentUserId()
  const e = db().events.find((x) => x.id === eventId)
  if (!e || !canManage(e, me)) throw new AppError('رویداد یافت نشد')
  if (Math.abs(new Date(e.at).getTime() - Date.now()) > 24 * 3_600_000) throw new AppError('ثبت حضور فقط در روز رویداد ممکن است')
  const r = e.registrations.find((x) => x.bib === Number(bib))
  if (!r) throw new AppError('این شماره ثبت‌نام نشده است')
  if (r.checkedIn) throw new AppError('حضور این شرکت‌کننده قبلاً ثبت شده است')
  mutate((d) => {
    d.events.find((y) => y.id === eventId)!.registrations.find((x) => x.bib === r.bib)!.checkedIn = true
  })
  return db().users.find((u) => u.id === r.userId)?.name ?? ''
})

/** ثبت نتایج و پایان رویداد */
export const publishResults = svc('event.results', (eventId: string, results: { bib: number; rank?: number; time?: string; note?: string }[]) => {
  const me = currentUserId()
  const e = db().events.find((x) => x.id === eventId)
  if (!e || !canManage(e, me)) throw new AppError('رویداد یافت نشد')
  if (e.status === 'cancelled') throw new AppError('رویداد لغو شده است')
  if (new Date(e.at) > new Date()) throw new AppError('نتایج پس از برگزاری ثبت می‌شود')
  const ranks = results.filter((r) => r.rank).map((r) => r.rank)
  if (new Set(ranks).size !== ranks.length) throw new AppError('رتبه‌ی تکراری وارد شده است')
  mutate((d) => {
    const x = d.events.find((y) => y.id === eventId)!
    const first = x.status !== 'done'
    for (const r of results) {
      const reg = x.registrations.find((y) => y.bib === Number(r.bib))
      if (!reg) continue
      reg.result = { rank: r.rank ? Math.round(r.rank) : undefined, time: r.time?.slice(0, 12) || undefined, note: r.note?.slice(0, 80) || undefined }
      reg.checkedIn = true
    }
    x.status = 'done'
    if (!first) return
    for (const reg of x.registrations.filter((y) => y.checkedIn)) {
      const rank = reg.result?.rank
      addXP(d, reg.userId, 50 + (rank && rank <= 3 ? PODIUM_XP[rank - 1] : 0))
      notify(d, reg.userId, `نتایج «${x.title}» منتشر شد`, rank ? `رتبه‌ی شما: ${rank}${reg.result?.time ? ` — زمان ${reg.result.time}` : ''}` : 'از حضورت ممنونیم! نتایج را ببین.', '', `/events/${x.id}`)
    }
  })
})
