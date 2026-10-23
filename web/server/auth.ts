/** ورود با کد یکبار مصرف پیامکی و نشست‌های امن */
import crypto from 'node:crypto'
import { sql } from './storage'
import { env } from './env'

const OTP_TTL = 2 * 60_000
const SESSION_TTL = 60 * 86_400_000
const hash = (v: string) => crypto.createHmac('sha256', env.secret).update(v).digest('hex')

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/* ───────── پیامک ───────── */

async function sendSms(phone: string, code: string) {
  if (!env.sms.kavenegarKey) {
    if (!env.otpEcho) throw new HttpError(503, 'سرویس پیامک تنظیم نشده است')
    console.log(`[OTP] ${phone}: ${code}`)
    return
  }
  // سرویس Verify Lookup کاوه‌نگار (قالب با توکن %token در پنل کاوه‌نگار تعریف شود)
  const url = `https://api.kavenegar.com/v1/${env.sms.kavenegarKey}/verify/lookup.json?receptor=${encodeURIComponent(phone)}&token=${encodeURIComponent(code)}&template=${encodeURIComponent(env.sms.kavenegarTemplate)}`
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    console.error('SMS error', res.status, await res.text().catch(() => ''))
    throw new HttpError(502, 'ارسال پیامک ناموفق بود؛ چند دقیقه‌ی دیگر دوباره تلاش کنید')
  }
}

export async function requestOtp(phone: string): Promise<{ demo: boolean; devCode?: string }> {
  if (env.demo) return { demo: true }
  const row = sql.prepare('SELECT sent_at FROM otps WHERE phone = ?').get(phone) as { sent_at: number } | undefined
  if (row && Date.now() - row.sent_at < 60_000) throw new HttpError(429, 'برای ارسال دوباره‌ی کد یک دقیقه صبر کنید')
  const code = String(crypto.randomInt(1000, 10000))
  sql.prepare('INSERT INTO otps (phone, code_hash, expires, attempts, sent_at) VALUES (?, ?, ?, 0, ?) ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash, expires = excluded.expires, attempts = 0, sent_at = excluded.sent_at').run(
    phone, hash(phone + ':' + code), Date.now() + OTP_TTL, Date.now(),
  )
  await sendSms(phone, code)
  // بدون سرویس پیامک (محیط آزمایشی) کد برای تست برگردانده می‌شود
  return { demo: false, devCode: env.otpEcho && !env.sms.kavenegarKey ? code : undefined }
}

export function checkOtp(phone: string, code: string) {
  if (env.demo) {
    if (code !== '1234') throw new HttpError(400, 'کد تایید اشتباه است')
    return
  }
  const row = sql.prepare('SELECT code_hash, expires, attempts FROM otps WHERE phone = ?').get(phone) as { code_hash: string; expires: number; attempts: number } | undefined
  if (!row || row.expires < Date.now()) throw new HttpError(400, 'کد منقضی شده است؛ دوباره درخواست کنید')
  if (row.attempts >= 5) throw new HttpError(429, 'تعداد تلاش‌ها زیاد بود؛ کد جدید درخواست کنید')
  if (!crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hash(phone + ':' + code)))) {
    sql.prepare('UPDATE otps SET attempts = attempts + 1 WHERE phone = ?').run(phone)
    throw new HttpError(400, 'کد تایید اشتباه است')
  }
  sql.prepare('DELETE FROM otps WHERE phone = ?').run(phone)
}

/* ───────── توکن ثبت‌نام (شماره‌ی تأییدشده، ۱۵ دقیقه) ───────── */

export function signupToken(phone: string) {
  const exp = Date.now() + 15 * 60_000
  const body = `${phone}.${exp}`
  return `${body}.${hash('signup:' + body)}`
}

export function readSignupToken(t: string) {
  const [phone, exp, sig] = String(t ?? '').split('.')
  if (!phone || !exp || !sig || hash(`signup:${phone}.${exp}`) !== sig) throw new HttpError(400, 'ابتدا شماره موبایل را تأیید کنید')
  if (Number(exp) < Date.now()) throw new HttpError(400, 'زمان ثبت‌نام تمام شد؛ دوباره کد بگیرید')
  return phone
}

/* ───────── نشست‌ها ───────── */

export function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex')
  sql.prepare('INSERT INTO sessions (token, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)').run(hash(token), userId, Date.now(), Date.now())
  return token
}

export function sessionUser(token: string | undefined | null): string | null {
  if (!token) return null
  const row = sql.prepare('SELECT user_id, last_seen FROM sessions WHERE token = ?').get(hash(token)) as { user_id: string; last_seen: number } | undefined
  if (!row || Date.now() - row.last_seen > SESSION_TTL) return null
  if (Date.now() - row.last_seen > 3_600_000) sql.prepare('UPDATE sessions SET last_seen = ? WHERE token = ?').run(Date.now(), hash(token))
  return row.user_id
}

export const deleteSession = (token: string) => sql.prepare('DELETE FROM sessions WHERE token = ?').run(hash(token))
export const deleteUserSessions = (userId: string) => sql.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
