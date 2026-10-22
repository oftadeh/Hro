/** اجرای مزایای پلن‌های اشتراک در پرداخت‌ها */
import { db, type DBState } from '../db'
import { SUBSCRIPTION_PLANS } from '../config'
import type { ID, PlanBenefits, RevenueModule, Subscription } from '../types'

function activeSub(d: Pick<DBState, 'subscriptions'>, userId: ID): Subscription | undefined {
  return d.subscriptions.find((s) => s.userId === userId && new Date(s.expiresAt) > new Date())
}

export function benefitsOf(userId: ID, d: Pick<DBState, 'subscriptions'> = db()): PlanBenefits | null {
  const sub = activeSub(d, userId)
  return sub ? SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId)?.benefits ?? null : null
}

export function discountPct(userId: ID, module: RevenueModule, d: Pick<DBState, 'subscriptions'> = db()) {
  return benefitsOf(userId, d)?.discounts[module] ?? 0
}

export function freeChallengeLeft(userId: ID, d: Pick<DBState, 'subscriptions'> = db()) {
  const sub = activeSub(d, userId)
  const b = benefitsOf(userId, d)
  return sub && b ? Math.max(0, b.freeChallengeEntries - (sub.freeChallengeUsed ?? 0)) : 0
}

export function freeDoctorLeft(userId: ID, d: Pick<DBState, 'subscriptions'> = db()) {
  const sub = activeSub(d, userId)
  const b = benefitsOf(userId, d)
  return sub && b ? Math.max(0, b.freeDoctorVisits - (sub.freeDoctorUsed ?? 0)) : 0
}

/** مصرف یک مزیت رایگان؛ اگر باقی مانده باشد true برمی‌گرداند (داخل mutate) */
export function consumeFree(d: DBState, userId: ID, kind: 'challenge' | 'doctor') {
  const left = kind === 'challenge' ? freeChallengeLeft(userId, d) : freeDoctorLeft(userId, d)
  if (left < 1) return false
  const sub = activeSub(d, userId)!
  if (kind === 'challenge') sub.freeChallengeUsed = (sub.freeChallengeUsed ?? 0) + 1
  else sub.freeDoctorUsed = (sub.freeDoctorUsed ?? 0) + 1
  return true
}

export const hasBadge = (userId: ID, d: Pick<DBState, 'subscriptions'> = db()) => !!benefitsOf(userId, d)?.badge

/** قیمت نهایی برای نمایش در UI */
export function priceAfter(userId: ID, module: RevenueModule, amount: number) {
  const pct = discountPct(userId, module)
  return { pct, discount: Math.round((amount * pct) / 100), final: amount - Math.round((amount * pct) / 100) }
}
