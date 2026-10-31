import { AppError, mutate, currentUserId, db, svc } from '../store'
import { findByVerifiedPhone } from './auth'
import type { DBState } from '../state'
import { SUBSCRIPTION_PLANS, TRIAL_TIERS } from '../config'
import { uid, now } from '../id'
import type { ID, SubscriptionPlan } from '../types'
import { applyPayment, grantReward, notify } from './ledger'
import { couponDiscount } from './commerce'
import { toman } from '../format'

export const planById = (id: string) => SUBSCRIPTION_PLANS.find((p) => p.id === id)

/* ───────── دوره‌ی آزمایشی رایگان ───────── */

export const TRIAL_PLAN_ID = 'plan-trial'
/** پلن نمایشی دوره‌ی آزمایشی (قابل خرید نیست؛ اعتبار و مدت از تنظیمات مدیر) */
export function trialPlan(s: Pick<DBState, 'settings'> = db()): SubscriptionPlan {
  const t = s.settings.trial ?? { enabled: false, credit: 0, days: 7 }
  return {
    id: TRIAL_PLAN_ID, name: 'آزمایشی', price: 0, credit: t.credit, durationDays: t.days, color: 'from-ink-700 to-ink-800', tiers: TRIAL_TIERS,
    perks: [`${toman(t.credit)} اعتبار ورود`, `${t.days} روز`], benefits: { discounts: {}, freeChallengeEntries: 0, freeDoctorVisits: 0, badge: false },
  }
}

/** کلیدهای ضدتکرار: شماره‌ی تأییدشده و ایمیل؛ با ساخت حساب تازه با همین‌ها دوباره دوره‌ی آزمایشی داده نمی‌شود */
const trialKeysOf = (u: { phone?: string; email?: string }) => [u.phone ? 'p:' + u.phone : '', u.email ? 'e:' + u.email : ''].filter(Boolean)

/** دلیل نداشتن دوره‌ی آزمایشی، یا null اگر می‌تواند فعالش کند */
export function trialBlocker(userId: ID, s: Pick<DBState, 'settings' | 'users' | 'subscriptions' | 'trialKeys'> = db()): string | null {
  if (!s.settings.trial?.enabled) return 'دوره‌ی آزمایشی فعلاً فعال نیست'
  const u = s.users.find((x) => x.id === userId)
  if (!u) return 'کاربر یافت نشد'
  if (!u.phone || u.phoneVerified === false) return 'برای دوره‌ی آزمایشی، شماره موبایلت باید با کد پیامکی تأیید شده باشد'
  if (s.subscriptions.some((x) => x.userId === userId)) return 'دوره‌ی آزمایشی فقط برای اولین عضویت است'
  // روی سرور فهرست کامل است؛ در مرورگر کاربر عادی فهرست خالی دیده می‌شود و سرور تصمیم نهایی را می‌گیرد
  if ((s.trialKeys ?? []).some((k) => trialKeysOf(u).includes(k))) return 'این شماره یا ایمیل قبلاً از دوره‌ی آزمایشی استفاده کرده است'
  return null
}

export const startTrial = svc('wallet.trial', () => {
  const userId = currentUserId()
  const why = trialBlocker(userId)
  if (why) throw new AppError(why)
  const plan = trialPlan()
  mutate((d) => {
    const u = d.users.find((x) => x.id === userId)!
    d.subscriptions.push({ userId, planId: TRIAL_PLAN_ID, credit: plan.credit, startedAt: now(), expiresAt: new Date(Date.now() + plan.durationDays * 86_400_000).toISOString(), freeChallengeUsed: 0, freeDoctorUsed: 0, trial: true })
    d.trialKeys = [...(d.trialKeys ?? []), ...trialKeysOf(u)]
    notify(d, userId, 'دوره‌ی آزمایشی فعال شد', `${toman(plan.credit)} اعتبار ورود تا ${plan.durationDays} روز؛ یک باشگاه نزدیک انتخاب کن.`, '', '/fityab')
  })
})

/** واریز شارژ تأییدشده‌ی درگاه به کیف پول (سرور پس از تأیید بانک صدا می‌زند) */
export function creditTopUp(d: DBState, userId: ID, amount: number, ref?: string) {
  d.wallets[userId] = (d.wallets[userId] ?? 0) + amount
  d.transactions.unshift({ id: uid('tx-'), type: 'topup', from: 'gateway', to: userId, payerId: userId, amount, commission: 0, refId: ref, description: ref ? `شارژ کیف پول (پیگیری ${ref})` : 'شارژ کیف پول', createdAt: now() })
  notify(d, userId, 'کیف پول شارژ شد', `${toman(amount)} به کیف پولت اضافه شد.`, '', '/wallet')
}

/** شارژ آزمایشی (فقط در حالت نمایشی؛ در نسخه‌ی سرور از درگاه بانکی استفاده می‌شود) */
export const topUp = svc('demo.topUp', (amount: number) => {
  if (!(amount >= 10_000)) throw new AppError('حداقل مبلغ شارژ ۱۰٬۰۰۰ تومان است')
  if (amount > 200_000_000) throw new AppError('مبلغ بیش از حد مجاز است')
  const userId = currentUserId()
  mutate((d) => creditTopUp(d, userId, Math.round(amount)))
})

/** تمدید تا این چند روز پس از پایان اشتراک، اعتبار باقی‌مانده را نگه می‌دارد */
export const RENEW_GRACE_DAYS = 7

/**
 * اعتبار منتقل‌شده به دوره‌ی بعد: باقی‌مانده‌ی دوره‌ی قبل تا سقف اعتبار پلن جدید.
 * اعتبار دوره‌ی آزمایشی منتقل نمی‌شود؛ پس از مهلت تمدید هم اعتبار قبلی از بین رفته است.
 */
export function carryOver(existing: { credit: number; expiresAt: string; trial?: boolean } | undefined, plan: SubscriptionPlan, at = Date.now()) {
  if (!existing || existing.trial) return 0
  if (at - new Date(existing.expiresAt).getTime() > RENEW_GRACE_DAYS * 86_400_000) return 0
  return Math.min(Math.max(0, existing.credit), plan.credit)
}

/** فعال‌سازی یا تمدید اشتراک (داخل mutate) */
export function activatePlan(d: DBState, userId: ID, plan: SubscriptionPlan, orgId?: ID) {
  const existing = d.subscriptions.find((s) => s.userId === userId)
  const start = new Date()
  const base = existing && new Date(existing.expiresAt) > start && !existing.trial ? new Date(existing.expiresAt) : start
  const expires = new Date(base.getTime() + plan.durationDays * 86_400_000).toISOString()
  if (existing) {
    const carried = carryOver(existing, plan)
    existing.planId = plan.id
    existing.trial = undefined
    existing.credit = carried + plan.credit
    existing.expiresAt = expires
    existing.startedAt = now()
    existing.freeChallengeUsed = 0
    existing.freeDoctorUsed = 0
    existing.orgId = orgId
  } else {
    d.subscriptions.push({ userId, planId: plan.id, credit: plan.credit, startedAt: now(), expiresAt: expires, freeChallengeUsed: 0, freeDoctorUsed: 0, orgId })
  }
  notify(d, userId, `اشتراک ${plan.name} فعال شد`, `${toman(plan.credit)} اعتبار ورود به باشگاه‌ها گرفتی.`, '', '/fityab')
}

/** پاداش معرفی: با اولین خرید اشتراک کاربر معرفی‌شده، به هر دو نفر اعتبار داده می‌شود */
function rewardReferral(d: DBState, userId: ID) {
  const u = d.users.find((x) => x.id === userId)
  if (!u?.referredBy || u.referralRewarded) return
  const amount = d.settings.referralReward ?? 0
  u.referralRewarded = true
  if (!amount) return
  grantReward(d, userId, amount, 'هدیه‌ی عضویت با کد معرفی')
  grantReward(d, u.referredBy, amount, `پاداش معرفی ${u.name}`)
  notify(d, u.referredBy, 'پاداش معرفی!', `${u.name} با کد شما عضو شد؛ ${toman(amount)} به کیف پولتان اضافه شد.`, '', '/wallet')
  notify(d, userId, 'هدیه‌ی معرفی', `${toman(amount)} هدیه به کیف پولتان اضافه شد.`, '', '/wallet')
}

export const buySubscription = svc('wallet.buySub', (planId: string, couponCode?: string) => {
  const userId = currentUserId()
  const plan = planById(planId)
  if (!plan) throw new AppError('پلن یافت نشد')
  const { discount } = couponDiscount(couponCode, 'subscription', plan.price, userId)
  mutate((d) => {
    applyPayment(d, { type: 'subscription', from: userId, to: 'platform', amount: plan.price, discountAmount: discount, description: `خرید اشتراک ${plan.name}${discount ? ` (کد ${couponCode!.toUpperCase()})` : ''}` })
    if (discount) d.coupons.find((c) => c.code.toUpperCase() === couponCode!.trim().toUpperCase())!.usedBy.push(userId)
    activatePlan(d, userId, plan)
    rewardReferral(d, userId)
  })
})

const giftCode = () => 'G' + Math.random().toString(36).slice(2, 8).toUpperCase() + Math.floor(Math.random() * 90 + 10)

/** خرید اشتراک هدیه برای یک شماره موبایل */
export const giftSubscription = svc('wallet.gift', (planId: string, toPhone: string, message?: string) => {
  const me = currentUserId()
  const plan = planById(planId)
  if (!plan) throw new AppError('پلن یافت نشد')
  const phone = String(toPhone ?? '').replace(/\D/g, '').replace(/^98/, '0').replace(/^9/, '09')
  if (!/^09\d{9}$/.test(phone)) throw new AppError('شماره موبایل گیرنده معتبر نیست')
  let code = ''
  mutate((d) => {
    code = giftCode()
    applyPayment(d, { type: 'gift', from: me, to: 'platform', amount: plan.price, description: `اشتراک هدیه ${plan.name} برای ${phone}` })
    d.giftCards.unshift({ id: uid('gc-'), code, planId, fromId: me, toPhone: phone, message: message?.slice(0, 200), createdAt: now() })
    const sender = d.users.find((u) => u.id === me)!
    const to = findByVerifiedPhone(d.users, phone)
    if (to) notify(d, to.id, `${sender.name} برای شما اشتراک هدیه خرید!`, `کد هدیه: ${code} — از کیف پول فعالش کنید.`, '', `/wallet?gift=${code}`)
  })
  return code
})

export const redeemGift = svc('wallet.redeem', (code: string) => {
  const me = currentUserId()
  const g = db().giftCards.find((x) => x.code === String(code ?? '').trim().toUpperCase())
  if (!g) throw new AppError('کد هدیه معتبر نیست')
  if (g.redeemedBy) throw new AppError('این کد هدیه قبلاً استفاده شده است')
  const plan = planById(g.planId)!
  mutate((d) => {
    d.giftCards.find((x) => x.id === g.id)!.redeemedBy = me
    activatePlan(d, me, plan)
    const u = d.users.find((x) => x.id === me)!
    notify(d, g.fromId, 'هدیه‌ی شما فعال شد', `${u.name} اشتراک ${plan.name} را فعال کرد.`, '')
  })
})

export function activeSubscription(userId: string, s: Pick<DBState, 'subscriptions'> = db()) {
  const x = s.subscriptions.find((v) => v.userId === userId)
  if (!x || new Date(x.expiresAt) < new Date()) return null
  return { ...x, plan: planById(x.planId) ?? trialPlan() }
}

export const requestWithdraw = svc('wallet.withdraw', (rawAmount: number, iban: string) => {
  const userId = currentUserId()
  const amount = Math.floor(Number(rawAmount))
  if (!Number.isFinite(amount)) throw new AppError('مبلغ معتبر نیست')
  const { minWithdraw } = db().settings
  if (!(amount >= minWithdraw)) throw new AppError(`حداقل مبلغ برداشت ${toman(minWithdraw)} است`)
  const clean = String(iban ?? '').replace(/\s/g, '').toUpperCase()
  if (!/^IR\d{24}$/.test(clean)) throw new AppError('شماره شبا معتبر نیست (IR + ۲۴ رقم)')
  mutate((d) => {
    const bal = d.wallets[userId] ?? 0
    if (bal < amount) throw new AppError('موجودی کافی نیست')
    d.wallets[userId] = bal - amount
    d.payouts.unshift({ id: uid('po-'), userId, amount: Math.round(amount), iban: clean, status: 'pending', createdAt: now() })
    d.transactions.unshift({ id: uid('tx-'), type: 'withdraw', from: userId, to: 'bank', payerId: userId, amount: Math.round(amount), commission: 0, description: 'درخواست تسویه به حساب بانکی', createdAt: now() })
    d.users.filter((u) => u.roles.includes('admin')).forEach((a) => notify(d, a.id, 'درخواست تسویه', toman(amount), '', '/panel/admin/finance'))
  })
})
