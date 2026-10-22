import { AppError, mutate, currentUserId, db } from '../db'
import { SUBSCRIPTION_PLANS } from '../config'
import { uid, now } from '../id'
import { applyPayment, notify } from './ledger'
import { toman } from '../format'

/** شارژ کیف پول از درگاه پرداخت (فعلاً شبیه‌سازی شده) */
export async function topUp(amount: number) {
  if (amount < 10_000) throw new AppError('حداقل مبلغ شارژ ۱۰٬۰۰۰ تومان است')
  const userId = currentUserId()
  await new Promise((r) => setTimeout(r, 700)) // شبیه‌سازی رفت و برگشت به درگاه
  mutate((d) => {
    d.wallets[userId] = (d.wallets[userId] ?? 0) + amount
    d.transactions.unshift({ id: uid('tx-'), type: 'topup', from: 'gateway', to: userId, payerId: userId, amount, commission: 0, description: 'شارژ کیف پول', createdAt: now() })
    notify(d, userId, 'کیف پول شارژ شد', `${toman(amount)} به کیف پولت اضافه شد.`, '', '/wallet')
  })
}

export function buySubscription(planId: string) {
  const userId = currentUserId()
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)
  if (!plan) throw new AppError('پلن یافت نشد')
  mutate((d) => {
    applyPayment(d, { type: 'subscription', from: userId, to: 'platform', amount: plan.price, description: `خرید اشتراک ${plan.name}` })
    const existing = d.subscriptions.find((s) => s.userId === userId)
    const start = new Date()
    const base = existing && new Date(existing.expiresAt) > start ? new Date(existing.expiresAt) : start
    const expires = new Date(base.getTime() + plan.durationDays * 86_400_000).toISOString()
    if (existing) {
      existing.planId = plan.id
      existing.credit += plan.credit
      existing.expiresAt = expires
      existing.startedAt = now()
      existing.freeChallengeUsed = 0
      existing.freeDoctorUsed = 0
    } else {
      d.subscriptions.push({ userId, planId: plan.id, credit: plan.credit, startedAt: now(), expiresAt: expires, freeChallengeUsed: 0, freeDoctorUsed: 0 })
    }
    notify(d, userId, `اشتراک ${plan.name} فعال شد`, `${toman(plan.credit)} اعتبار ورود به باشگاه‌ها گرفتی.`, '', '/fityab')
  })
}

export function activeSubscription(userId: string) {
  const s = db().subscriptions.find((x) => x.userId === userId)
  if (!s || new Date(s.expiresAt) < new Date()) return null
  return { ...s, plan: SUBSCRIPTION_PLANS.find((p) => p.id === s.planId)! }
}

export function requestWithdraw(amount: number, iban: string) {
  const userId = currentUserId()
  const { minWithdraw } = db().settings
  if (amount < minWithdraw) throw new AppError(`حداقل مبلغ برداشت ${toman(minWithdraw)} است`)
  if (!/^IR\d{24}$/.test(iban.replace(/\s/g, ''))) throw new AppError('شماره شبا معتبر نیست (IR + ۲۴ رقم)')
  mutate((d) => {
    const bal = d.wallets[userId] ?? 0
    if (bal < amount) throw new AppError('موجودی کافی نیست')
    d.wallets[userId] = bal - amount
    d.payouts.unshift({ id: uid('po-'), userId, amount, iban: iban.replace(/\s/g, ''), status: 'pending', createdAt: now() })
    d.transactions.unshift({ id: uid('tx-'), type: 'withdraw', from: userId, to: 'bank', payerId: userId, amount, commission: 0, description: 'درخواست تسویه به حساب بانکی', createdAt: now() })
  })
}
