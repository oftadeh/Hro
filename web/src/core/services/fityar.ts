import { AppError, mutate, currentUserId, db, svc } from '../store'
import type { DBState } from '../state'
import { uid, now } from '../id'
import type { CoachProfile, ID, Program, Thread } from '../types'
import { applyPayment, notify } from './ledger'
import { addXP } from './engagement'
import { discountPct } from './perks'
import { toman } from '../format'
import { exerciseById } from '../catalog'

/** لینک اتاق تماس تصویری (Jitsi Meet؛ بدون نیاز به نصب) */
export const callLink = (seed: string) => `https://meet.jit.si/keyfit-${seed.replace(/[^a-z0-9]/gi, '')}`

export function findThread(a: ID, b: ID) {
  return db().threads.find((t) => t.members.includes(a) && t.members.includes(b))
}

function ensureThread(d: DBState, a: ID, b: ID, context: Thread['context']): Thread {
  let t = d.threads.find((x) => x.members.includes(a) && x.members.includes(b))
  if (!t) {
    t = { id: uid('t-'), members: [a, b], context, messages: [], updatedAt: now() }
    d.threads.unshift(t)
  }
  return t
}

export const openThread = svc('chat.open', (otherId: ID, context: Thread['context']) => {
  const me = currentUserId()
  if (me === otherId) throw new AppError('نمی‌توانید با خودتان گفتگو کنید')
  const other = db().users.find((u) => u.id === otherId)
  if (!other) throw new AppError('کاربر یافت نشد')
  if (other.blockedUsers?.includes(me)) throw new AppError('امکان ارسال پیام به این کاربر وجود ندارد')
  let id = findThread(me, otherId)?.id
  if (!id) mutate((d) => { id = ensureThread(d, me, otherId, context === 'coach' || context === 'doctor' ? context : 'direct').id })
  return id!
})

export const sendMessage = svc('chat.send', (threadId: ID, text: string) => {
  const me = currentUserId()
  const body = String(text ?? '').trim()
  if (!body) return
  if (body.length > 2000) throw new AppError('پیام خیلی طولانی است')
  mutate((d) => {
    const t = d.threads.find((x) => x.id === threadId)
    if (!t || !t.members.includes(me)) throw new AppError('گفتگو یافت نشد')
    const other = t.members.find((m) => m !== me)!
    if (d.users.find((u) => u.id === other)?.blockedUsers?.includes(me)) throw new AppError('امکان ارسال پیام به این کاربر وجود ندارد')
    t.messages.push({ id: uid('m-'), from: me, text: body, at: now(), kind: 'text' })
    t.updatedAt = now()
    const sender = d.users.find((u) => u.id === me)!
    notify(d, other, `پیام جدید از ${sender.name}`, body.slice(0, 80), '', `/messages/${t.id}`)
  })
})

/** رزرو تماس تصویری با مربی؛ لینک اتاق در گفتگو قرار می‌گیرد */
export const bookCall = svc('coach.bookCall', (coachId: ID) => {
  const me = currentUserId()
  const coach = db().coaches.find((c) => c.userId === coachId)
  if (!coach) throw new AppError('مربی یافت نشد')
  if (coachId === me) throw new AppError('نمی‌توانید با خودتان تماس رزرو کنید')
  let threadId = ''
  mutate((d) => {
    const id = uid('call-')
    applyPayment(d, { type: 'coach_plan', from: me, to: coachId, amount: coach.callPrice, module: 'fityar', refId: id, discountPct: discountPct(me, 'fityar', d), description: 'رزرو تماس مشاوره با مربی' })
    const t = ensureThread(d, me, coachId, 'coach')
    t.messages.push({ id: uid('m-'), from: me, text: `تماس تصویری ۳۰ دقیقه‌ای رزرو شد (${toman(coach.callPrice)}). زمان را در همین گفتگو هماهنگ کنید و از لینک زیر وارد شوید.`, at: now(), kind: 'call', link: callLink(id) })
    t.updatedAt = now()
    threadId = t.id
    notify(d, coachId, 'رزرو تماس جدید', 'یک ورزشکار تماس مشاوره رزرو کرد.', '', `/messages/${t.id}`)
  })
  return threadId
})

export const buyCoachPlan = svc('coach.buyPlan', (coachId: ID, planId: ID, answers: string) => {
  const me = currentUserId()
  const coach = db().coaches.find((c) => c.userId === coachId)
  const plan = coach?.plans.find((p) => p.id === planId)
  if (!coach || !plan) throw new AppError('برنامه یافت نشد')
  if (coachId === me) throw new AppError('نمی‌توانید برنامه‌ی خودتان را بخرید')
  if (String(answers ?? '').trim().length < 10) throw new AppError('لطفاً اطلاعات بدنی و هدف‌تان را کامل بنویسید')
  mutate((d) => {
    const orderId = uid('po-')
    applyPayment(d, { type: 'coach_plan', from: me, to: coachId, amount: plan.price, module: 'fityar', refId: orderId, discountPct: discountPct(me, 'fityar', d), description: `خرید «${plan.title}»` })
    d.planOrders.unshift({ id: orderId, userId: me, coachId, planId, title: plan.title, price: plan.price, status: 'pending', answers: answers.slice(0, 2000), createdAt: now() })
    const c = d.coaches.find((x) => x.userId === coachId)!
    c.students += 1
    const t = ensureThread(d, me, coachId, 'coach')
    t.messages.push({ id: uid('m-'), from: me, text: `برنامه‌ی «${plan.title}» خریداری شد.\n${answers}`, at: now(), kind: 'system' })
    t.updatedAt = now()
    addXP(d, me, 50)
    notify(d, coachId, 'سفارش برنامه‌ی جدید', `«${plan.title}» خریداری شد.`, '', '/panel/coach/orders')
  })
})

function cleanProgram(p: Program | undefined): Program | undefined {
  if (!p) return undefined
  if (!Array.isArray(p.weeks) || !p.weeks.length || p.weeks.length > 24) throw new AppError('برنامه باید بین ۱ تا ۲۴ هفته باشد')
  return {
    notes: p.notes?.slice(0, 2000),
    weeks: p.weeks.map((w) => ({
      days: (w.days ?? []).slice(0, 7).map((day) => ({
        title: String(day.title || 'جلسه').slice(0, 60),
        meals: day.meals?.slice(0, 800),
        exercises: (day.exercises ?? []).filter((e) => exerciseById(e.exerciseId)).slice(0, 15).map((e) => ({ exerciseId: e.exerciseId, sets: Math.min(10, Math.max(1, Math.round(e.sets))), reps: String(e.reps).slice(0, 20), rest: e.rest, note: e.note?.slice(0, 120) })),
      })),
    })),
  }
}

/** تحویل برنامه: متن آزاد و/یا برنامه‌ی ساختاریافته‌ی هفتگی */
export const deliverPlan = svc(
  'coach.deliver',
  (orderId: ID, content: string, program?: Program) => {
    const me = currentUserId()
    const prog = cleanProgram(program)
    if (!prog && String(content ?? '').trim().length < 20) throw new AppError('متن برنامه خیلی کوتاه است')
    mutate((d) => {
      const o = d.planOrders.find((x) => x.id === orderId && x.coachId === me)
      if (!o) throw new AppError('سفارش یافت نشد')
      o.status = 'delivered'
      o.content = String(content ?? '').slice(0, 8000)
      if (prog) o.program = prog
      o.done ??= []
      notify(d, o.userId, 'برنامه‌ات آماده شد!', `مربی برنامه‌ی «${o.title}» را تحویل داد.`, '', `/program/${o.id}`)
    })
  },
  { roles: ['coach'] },
)

/** کاربر یک جلسه از برنامه‌ی مربی را انجام‌شده علامت می‌زند */
export const toggleProgramDay = svc('coach.programDay', (orderId: ID, week: number, day: number) => {
  const me = currentUserId()
  mutate((d) => {
    const o = d.planOrders.find((x) => x.id === orderId && x.userId === me)
    if (!o?.program?.weeks[week]?.days[day]) throw new AppError('جلسه یافت نشد')
    const key = `${week}-${day}`
    const done = (o.done ??= [])
    if (done.includes(key)) o.done = done.filter((k) => k !== key)
    else {
      done.push(key)
      addXP(d, me, 15)
      const total = o.program.weeks.reduce((a, w) => a + w.days.length, 0)
      if (done.length === total) notify(d, o.coachId, 'برنامه کامل شد', `شاگرد شما همه‌ی جلسات «${o.title}» را انجام داد.`, '', '/panel/coach/orders')
    }
  })
})

/** امتیاز به مربی پس از تحویل برنامه */
export const reviewCoach = svc('coach.review', (orderId: ID, stars: number, text: string) => {
  const me = currentUserId()
  mutate((d) => {
    const o = d.planOrders.find((x) => x.id === orderId && x.userId === me)
    if (!o || o.status !== 'delivered') throw new AppError('پس از تحویل برنامه می‌توانید نظر بدهید')
    if (d.reviews.some((r) => r.kind === 'coach' && r.userId === me && r.refId === o.coachId && r.text.startsWith(`[${o.id}]`))) throw new AppError('قبلاً برای این برنامه نظر داده‌اید')
    const s = Math.min(5, Math.max(1, Math.round(stars)))
    d.reviews.unshift({ id: uid('rv-'), kind: 'coach', refId: o.coachId, userId: me, stars: s, text: `[${o.id}] ${String(text ?? '').slice(0, 600)}`, createdAt: now() })
    const c = d.coaches.find((x) => x.userId === o.coachId)!
    const all = d.reviews.filter((r) => r.kind === 'coach' && r.refId === o.coachId)
    c.rating = Math.round((all.reduce((a, r) => a + r.stars, 0) / all.length) * 100) / 100
  })
})

const COACH_FIELDS = ['title', 'specialties', 'experienceYears', 'bio', 'online', 'callPrice', 'plans', 'certificates'] as const

export const saveCoachProfile = svc(
  'coach.saveProfile',
  (input: Partial<CoachProfile>) => {
    const me = currentUserId()
    if (input.callPrice !== undefined && input.callPrice < 0) throw new AppError('هزینه‌ی تماس معتبر نیست')
    mutate((d) => {
      let c = d.coaches.find((x) => x.userId === me)
      if (!c) {
        c = { userId: me, title: 'مربی', specialties: [], experienceYears: 1, bio: '', rating: 5, students: 0, online: true, callPrice: 100_000, plans: [], certificates: [] }
        d.coaches.push(c)
      }
      const certsBefore = c.certificates.join('|')
      for (const k of COACH_FIELDS) if (k in input) (c as unknown as Record<string, unknown>)[k] = input[k]
      c.plans = c.plans.map((p) => ({ ...p, id: p.id || uid('cp-'), price: Math.max(0, Math.round(p.price)) }))
      // تغییر مدارک نیاز به بررسی مجدد مدیر دارد
      if (c.certificates.join('|') !== certsBefore && c.verified) c.verified = false
    })
  },
  { roles: ['coach'] },
)
