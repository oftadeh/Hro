import { AppError, mutate, currentUserId, db, type DBState } from '../db'
import { uid, now } from '../id'
import type { CoachProfile, ID, Thread } from '../types'
import { applyPayment, notify } from './ledger'
import { addXP } from './engagement'
import { toman } from '../format'

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

export function openThread(otherId: ID, context: Thread['context']) {
  const me = currentUserId()
  if (me === otherId) throw new AppError('نمی‌توانید با خودتان گفتگو کنید')
  let id = findThread(me, otherId)?.id
  if (!id) mutate((d) => { id = ensureThread(d, me, otherId, context).id })
  return id!
}

export function sendMessage(threadId: ID, text: string) {
  const me = currentUserId()
  if (!text.trim()) return
  mutate((d) => {
    const t = d.threads.find((x) => x.id === threadId)
    if (!t) throw new AppError('گفتگو یافت نشد')
    t.messages.push({ id: uid('m-'), from: me, text: text.trim(), at: now(), kind: 'text' })
    t.updatedAt = now()
    const other = t.members.find((m) => m !== me)!
    const sender = d.users.find((u) => u.id === me)!
    notify(d, other, `پیام جدید از ${sender.name}`, text.slice(0, 80), '💬', `/messages/${t.id}`)
  })
}

/** رزرو تماس تصویری/صوتی با مربی */
export function bookCall(coachId: ID) {
  const me = currentUserId()
  const coach = db().coaches.find((c) => c.userId === coachId)
  if (!coach) throw new AppError('مربی یافت نشد')
  let threadId = ''
  mutate((d) => {
    applyPayment(d, { type: 'coach_plan', from: me, to: coachId, amount: coach.callPrice, module: 'fityar', refId: coachId, description: 'رزرو تماس مشاوره با مربی' })
    const t = ensureThread(d, me, coachId, 'coach')
    t.messages.push({ id: uid('m-'), from: me, text: `📞 یک تماس مشاوره ۳۰ دقیقه‌ای رزرو شد (${toman(coach.callPrice)})`, at: now(), kind: 'call' })
    t.updatedAt = now()
    threadId = t.id
    notify(d, coachId, 'رزرو تماس جدید 📞', 'یک ورزشکار تماس مشاوره رزرو کرد.', '📞', `/messages/${t.id}`)
  })
  return threadId
}

export function buyCoachPlan(coachId: ID, planId: ID, answers: string) {
  const me = currentUserId()
  const coach = db().coaches.find((c) => c.userId === coachId)
  const plan = coach?.plans.find((p) => p.id === planId)
  if (!coach || !plan) throw new AppError('برنامه یافت نشد')
  if (answers.trim().length < 10) throw new AppError('لطفاً اطلاعات بدنی و هدف‌تان را کامل بنویسید')
  mutate((d) => {
    const orderId = uid('po-')
    applyPayment(d, { type: 'coach_plan', from: me, to: coachId, amount: plan.price, module: 'fityar', refId: orderId, description: `خرید «${plan.title}»` })
    d.planOrders.unshift({ id: orderId, userId: me, coachId, planId, title: plan.title, price: plan.price, status: 'pending', answers, createdAt: now() })
    const c = d.coaches.find((x) => x.userId === coachId)!
    c.students += 1
    const t = ensureThread(d, me, coachId, 'coach')
    t.messages.push({ id: uid('m-'), from: me, text: `🧾 برنامه‌ی «${plan.title}» خریداری شد.\n${answers}`, at: now(), kind: 'system' })
    t.updatedAt = now()
    addXP(d, me, 50)
    notify(d, coachId, 'سفارش برنامه‌ی جدید 🧾', `«${plan.title}» خریداری شد.`, '🧾', '/panel/coach/orders')
  })
}

export function deliverPlan(orderId: ID, content: string) {
  const me = currentUserId()
  if (content.trim().length < 20) throw new AppError('متن برنامه خیلی کوتاه است')
  mutate((d) => {
    const o = d.planOrders.find((x) => x.id === orderId && x.coachId === me)
    if (!o) throw new AppError('سفارش یافت نشد')
    o.status = 'delivered'
    o.content = content
    notify(d, o.userId, 'برنامه‌ات آماده شد! 🎯', `مربی برنامه‌ی «${o.title}» را تحویل داد.`, '🎯', '/fityar?tab=plans')
  })
}

export function saveCoachProfile(input: Partial<CoachProfile>) {
  const me = currentUserId()
  mutate((d) => {
    let c = d.coaches.find((x) => x.userId === me)
    if (!c) {
      c = { userId: me, title: 'مربی', specialties: [], experienceYears: 1, bio: '', rating: 5, students: 0, online: true, callPrice: 100_000, plans: [], certificates: [] }
      d.coaches.push(c)
    }
    Object.assign(c, input, { userId: me })
  })
}
