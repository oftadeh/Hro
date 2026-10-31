/**
 * اشتراک سازمانی: شرکت برای کارکنانش «صندلی» اشتراک می‌خرد (با تخفیف سازمانی)،
 * کارکنان با کد سازمان عضو می‌شوند و اشتراک‌شان خودکار فعال می‌شود؛ رتبه‌بندی و چالش‌های تیمی.
 */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import type { DBState } from '../state'
import { uid, now } from '../id'
import type { ID } from '../types'
import { applyPayment, notify } from './ledger'
import { activatePlan, planById } from './wallet'
import { weekXpOf } from './engagement'
import { toman } from '../format'

export function seatPrice(planId: string, s: Pick<DBState, 'settings'> = db()) {
  const plan = planById(planId)
  if (!plan) return 0
  return Math.round((plan.price * (100 - (s.settings.orgDiscountPct ?? 0))) / 100)
}

const orgCode = (name: string) => (name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'ORG') + Math.floor(1000 + Math.random() * 9000)

export const createOrg = svc(
  'org.create',
  (name: string, planId: string, seats: number) => {
    const me = currentUserId()
    if (String(name ?? '').trim().length < 2) throw new AppError('نام سازمان را وارد کنید')
    if (!planById(planId)) throw new AppError('پلن یافت نشد')
    if (!(seats >= 3 && seats <= 5000)) throw new AppError('تعداد صندلی باید بین ۳ تا ۵۰۰۰ باشد')
    if (db().orgs.some((o) => o.adminId === me)) throw new AppError('شما قبلاً یک سازمان ثبت کرده‌اید')
    const total = seatPrice(planId) * Math.round(seats)
    let id = ''
    mutate((d) => {
      id = uid('org-')
      applyPayment(d, { type: 'org_seats', from: me, to: 'platform', amount: total, description: `اشتراک سازمانی ${name} — ${seats} نفر` })
      d.orgs.unshift({ id, name: name.trim().slice(0, 60), adminId: me, code: orgCode(name), planId, seats: Math.round(seats), members: [me], createdAt: now() })
      const u = d.users.find((x) => x.id === me)!
      u.orgId = id
      activatePlan(d, me, planById(planId)!, id)
    })
    return id
  },
  { roles: ['company'] },
)

export const addSeats = svc(
  'org.addSeats',
  (count: number) => {
    const me = currentUserId()
    const org = db().orgs.find((o) => o.adminId === me)
    if (!org) throw new AppError('سازمان یافت نشد')
    if (!(count >= 1 && count <= 5000)) throw new AppError('تعداد معتبر نیست')
    mutate((d) => {
      applyPayment(d, { type: 'org_seats', from: me, to: 'platform', amount: seatPrice(org.planId) * Math.round(count), description: `افزودن ${count} صندلی به ${org.name}` })
      d.orgs.find((o) => o.id === org.id)!.seats += Math.round(count)
    })
  },
  { roles: ['company'] },
)

/** تمدید اشتراک همه‌ی اعضا برای یک دوره‌ی دیگر */
export const renewOrg = svc(
  'org.renew',
  () => {
    const me = currentUserId()
    const org = db().orgs.find((o) => o.adminId === me)
    if (!org) throw new AppError('سازمان یافت نشد')
    const plan = planById(org.planId)!
    mutate((d) => {
      applyPayment(d, { type: 'org_seats', from: me, to: 'platform', amount: seatPrice(org.planId) * org.members.length, description: `تمدید اشتراک ${org.members.length} عضو ${org.name}` })
      org.members.forEach((m) => activatePlan(d, m, plan, org.id))
    })
  },
  { roles: ['company'] },
)

export const joinOrg = svc('org.join', (code: string) => {
  const me = currentUserId()
  const org = db().orgs.find((o) => o.code === String(code ?? '').trim().toUpperCase())
  if (!org) throw new AppError('کد سازمان معتبر نیست')
  if (org.members.includes(me)) throw new AppError('شما عضو این سازمان هستید')
  if (db().users.find((u) => u.id === me)?.orgId) throw new AppError('شما عضو سازمان دیگری هستید')
  if (org.members.length >= org.seats) throw new AppError('ظرفیت اشتراک سازمان تکمیل است؛ با مسئول سازمان تماس بگیرید')
  mutate((d) => {
    const o = d.orgs.find((x) => x.id === org.id)!
    o.members.push(me)
    const u = d.users.find((x) => x.id === me)!
    u.orgId = o.id
    activatePlan(d, me, planById(o.planId)!, o.id)
    notify(d, o.adminId, 'عضو جدید سازمان', `${u.name} به ${o.name} پیوست (${o.members.length}/${o.seats}).`, '', '/panel/company')
  })
})

export const removeMember = svc(
  'org.removeMember',
  (userId: ID) => {
    const me = currentUserId()
    if (userId === me) throw new AppError('مسئول سازمان قابل حذف نیست')
    mutate((d) => {
      const o = d.orgs.find((x) => x.adminId === me)
      if (!o || !o.members.includes(userId)) throw new AppError('عضو یافت نشد')
      o.members = o.members.filter((m) => m !== userId)
      const u = d.users.find((x) => x.id === userId)
      if (u) u.orgId = undefined
      // اعتبار باقی‌مانده تا پایان دوره برای کاربر می‌ماند اما تمدید نمی‌شود
      const sub = d.subscriptions.find((s) => s.userId === userId && s.orgId === o.id)
      if (sub) sub.orgId = undefined
      notify(d, userId, 'عضویت سازمانی پایان یافت', `از ${o.name} خارج شدید؛ اشتراک فعلی تا پایان دوره معتبر است.`, '')
    })
  },
  { roles: ['company'] },
)

export const leaveOrg = svc('org.leave', () => {
  const me = currentUserId()
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    const o = d.orgs.find((x) => x.id === u.orgId)
    if (!o) throw new AppError('عضو سازمانی نیستید')
    if (o.adminId === me) throw new AppError('مسئول سازمان نمی‌تواند خارج شود')
    o.members = o.members.filter((m) => m !== me)
    u.orgId = undefined
  })
})

/** رتبه‌بندی هفتگی اعضای سازمان */
export function orgLeaderboard(orgId: ID, s: Pick<DBState, 'orgs' | 'users'> = db()) {
  const o = s.orgs.find((x) => x.id === orgId)
  if (!o) return []
  return o.members
    .map((id) => s.users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({ user: u, xp: weekXpOf(u) }))
    .sort((a, b) => b.xp - a.xp)
}

export { toman }
