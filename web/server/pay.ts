/**
 * درگاه پرداخت زرین‌پال (API نسخه‌ی ۴).
 * مبالغ اپ به تومان است و با currency=IRT ارسال می‌شود. بدون مرچنت (حالت آزمایشی) پرداخت شبیه‌سازی می‌شود.
 */
import crypto from 'node:crypto'
import { sql } from './storage'
import { env } from './env'
import { HttpError } from './auth'

const base = () => (env.zarinpal.sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com')

export interface Payment {
  id: string
  user_id: string
  amount: number
  authority: string | null
  status: 'pending' | 'paid' | 'failed'
  ref_id: string | null
}

export async function startPayment(userId: string, amount: number, mobile?: string): Promise<{ url: string; simulated?: string }> {
  if (!Number.isInteger(amount) || amount < 10_000 || amount > 200_000_000) throw new HttpError(400, 'مبلغ معتبر نیست (حداقل ۱۰٬۰۰۰ تومان)')
  const id = crypto.randomUUID()
  if (!env.zarinpal.merchant) {
    // پرداخت شبیه‌سازی‌شده فقط در حالت نمایشی؛ در نسخه‌ی واقعی بدون درگاه، شارژ رایگان ممنوع است
    if (!env.demo) throw new HttpError(503, 'درگاه پرداخت هنوز فعال نشده است؛ به‌زودی امکان شارژ کیف پول فراهم می‌شود')
    sql.prepare('INSERT INTO payments (id, user_id, amount, authority, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, amount, 'SIM-' + id, 'pending', Date.now())
    return { url: `${env.publicUrl}/api/pay/callback?Authority=SIM-${id}&Status=OK`, simulated: id }
  }
  const res = await fetch(`${base()}/pg/v4/payment/request.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      merchant_id: env.zarinpal.merchant,
      amount,
      currency: 'IRT',
      callback_url: `${env.publicUrl}/api/pay/callback`,
      description: 'شارژ کیف پول کی‌فیت',
      metadata: mobile ? { mobile } : undefined,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as { data?: { code?: number; authority?: string } }
  if (data.data?.code !== 100 || !data.data.authority) throw new HttpError(502, 'اتصال به درگاه بانکی ناموفق بود')
  sql.prepare('INSERT INTO payments (id, user_id, amount, authority, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, amount, data.data.authority, 'pending', Date.now())
  return { url: `${base()}/pg/StartPay/${data.data.authority}` }
}

/** تأیید پرداخت پس از بازگشت از بانک؛ فقط یک بار شارژ می‌شود */
export async function verifyPayment(authority: string, status: string): Promise<{ payment: Payment; ok: boolean; refId?: string; already?: boolean }> {
  const p = sql.prepare('SELECT * FROM payments WHERE authority = ?').get(authority) as Payment | undefined
  if (!p) throw new HttpError(404, 'تراکنش یافت نشد')
  if (p.status === 'paid') return { payment: p, ok: true, refId: p.ref_id ?? undefined, already: true }
  if (status !== 'OK') {
    sql.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").run(p.id)
    return { payment: p, ok: false }
  }
  let refId: string
  if (authority.startsWith('SIM-') && !env.demo) throw new HttpError(403, 'تراکنش آزمایشی در نسخه‌ی واقعی پذیرفته نمی‌شود')
  if (authority.startsWith('SIM-')) refId = 'SIM' + Math.floor(Math.random() * 1e8)
  else {
    const res = await fetch(`${base()}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ merchant_id: env.zarinpal.merchant, amount: p.amount, authority }),
    })
    const data = (await res.json().catch(() => ({}))) as { data?: { code?: number; ref_id?: number } }
    const code = data.data?.code
    if (code !== 100 && code !== 101) {
      sql.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").run(p.id)
      return { payment: p, ok: false }
    }
    refId = String(data.data!.ref_id)
  }
  // اتمیک: فقط اگر هنوز pending باشد
  const r = sql.prepare("UPDATE payments SET status = 'paid', ref_id = ? WHERE id = ? AND status = 'pending'").run(refId, p.id)
  return { payment: p, ok: true, refId, already: Number(r.changes) === 0 }
}
