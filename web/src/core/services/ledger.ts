import { AppError, mutate, db } from '../store'
import type { DBState } from '../state'
import { uid, now } from '../id'
import type { ID, RevenueModule, Transaction, TxType } from '../types'
import { toman } from '../format'

export const balanceOf = (userId: ID) => db().wallets[userId] ?? 0

interface PayInput {
  type: TxType
  from: ID | 'gateway' | 'subscription'
  to: ID | 'platform' | 'escrow'
  amount: number
  module?: RevenueModule
  /** اگر مشخص نشود از تنظیمات ماژول خوانده می‌شود */
  commissionPct?: number
  refId?: ID
  description: string
  /** وقتی from = subscription باید صاحب اشتراک مشخص باشد */
  payerId?: ID
  /** درصد تخفیف اشتراک (۰ تا ۱۰۰) که از سهم کی‌فیت کسر می‌شود */
  discountPct?: number
  /** تخفیف ریالی اضافه (کد تخفیف) که آن هم از سهم کی‌فیت پرداخت می‌شود */
  discountAmount?: number
}

/**
 * هسته‌ی مالی: انتقال وجه + کسر کمیسیون کی‌فیت در یک تراکنش اتمیک.
 * باید داخل `mutate` صدا زده شود.
 */
export function applyPayment(d: DBState, input: PayInput): Transaction {
  const { amount } = input
  if (amount < 0) throw new AppError('مبلغ نامعتبر است')
  // کاربر مبلغ پس از تخفیف را می‌پردازد؛ ارائه‌دهنده سهم کامل خود را می‌گیرد
  const discount = Math.min(amount, Math.round((amount * Math.min(100, Math.max(0, input.discountPct ?? 0))) / 100) + Math.max(0, Math.round(input.discountAmount ?? 0)))
  const charged = amount - discount

  if (input.from === 'subscription') {
    const sub = d.subscriptions.find((s) => s.userId === input.payerId)
    if (!sub || new Date(sub.expiresAt) < new Date()) throw new AppError('اشتراک فعال ندارید')
    if (sub.credit < charged) throw new AppError('اعتبار اشتراک کافی نیست')
    sub.credit -= charged
  } else if (input.from !== 'gateway') {
    const bal = d.wallets[input.from] ?? 0
    if (bal < charged) throw new AppError(`موجودی کیف پول کافی نیست (موجودی: ${toman(bal)})`)
    d.wallets[input.from] = bal - charged
  }

  const pct = input.to === 'platform' ? 100 : input.commissionPct ?? (input.module ? d.settings.commissions[input.module] : 0)
  const commission = Math.round((amount * pct) / 100)
  d.wallets[input.to] = (d.wallets[input.to] ?? 0) + amount - (input.to === 'platform' ? 0 : commission)
  if (input.to !== 'platform') d.wallets.platform = (d.wallets.platform ?? 0) + commission
  if (discount) d.wallets.platform = (d.wallets.platform ?? 0) - discount

  const tx: Transaction = {
    id: uid('tx-'),
    type: input.type,
    from: input.from === 'subscription' ? 'subscription' : input.from,
    to: input.to,
    payerId: input.payerId ?? (input.from === 'gateway' || input.from === 'subscription' ? undefined : input.from),
    amount,
    commission: input.to === 'platform' ? amount : commission,
    discount: discount || undefined,
    module: input.module,
    refId: input.refId,
    description: input.description,
    createdAt: now(),
  }
  d.transactions.unshift(tx)
  return tx
}

export function pay(input: PayInput) {
  let tx: Transaction | undefined
  mutate((d) => {
    tx = applyPayment(d, input)
  })
  return tx!
}

export function notify(d: DBState, userId: ID, title: string, body: string, icon = '', link?: string) {
  d.notifications.unshift({ id: uid('n-'), userId, title, body, icon, link, read: false, at: now() })
}

/**
 * برگشت کامل یک پرداخت (لغو بلیت/سفارش): سهم ارائه‌دهنده و کمیسیون برمی‌گردد،
 * تخفیفی که کی‌فیت پرداخته بود به حساب پلتفرم برمی‌گردد و مبلغ پرداختی به منبع (کیف پول یا اعتبار اشتراک) بازگردانده می‌شود.
 */
export function reversePayment(d: DBState, tx: Transaction, description: string): number {
  const charged = tx.amount - (tx.discount ?? 0)
  if (tx.to === 'platform') d.wallets.platform = (d.wallets.platform ?? 0) - tx.amount
  else {
    d.wallets[tx.to] = (d.wallets[tx.to] ?? 0) - (tx.amount - tx.commission)
    d.wallets.platform = (d.wallets.platform ?? 0) - tx.commission
  }
  if (tx.discount) d.wallets.platform += tx.discount
  const payer = tx.payerId ?? tx.from
  if (tx.from === 'subscription') {
    const sub = d.subscriptions.find((s) => s.userId === tx.payerId)
    if (sub) sub.credit += charged
  } else if (tx.from !== 'gateway' && tx.from !== 'escrow') {
    d.wallets[tx.from] = (d.wallets[tx.from] ?? 0) + charged
  }
  d.transactions.unshift({ id: uid('tx-'), type: 'refund', from: tx.to === 'bank' ? 'escrow' : tx.to, to: payer, payerId: tx.to === 'platform' || tx.to === 'escrow' || tx.to === 'bank' ? undefined : tx.to, amount: charged, commission: 0, module: tx.module, refId: tx.refId, description, createdAt: now() })
  return charged
}

/** واریز پاداش از حساب کی‌فیت (معرفی، جبران و...) */
export function grantReward(d: DBState, userId: ID, amount: number, description: string) {
  d.wallets.platform = (d.wallets.platform ?? 0) - amount
  d.wallets[userId] = (d.wallets[userId] ?? 0) + amount
  d.transactions.unshift({ id: uid('tx-'), type: 'reward', from: 'gateway', to: userId, amount, commission: 0, description, createdAt: now() })
}
