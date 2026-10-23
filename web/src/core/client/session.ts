/**
 * ورود، ثبت‌نام و خروج — در حالت نمایشی داده‌ها محلی‌اند و در حالت سرور از API استفاده می‌شود.
 */
import { AppError, db } from '../store'
import { useDB, useSession, resetDemo } from '../db'
import type { Role } from '../types'
import { createUser, isValidPhone, normalizePhone, assertCanLogin, type ProfileInput } from '../services/auth'
import { touchDaily } from '../services/engagement'
import { expireTickets } from '../services/fityab'
import { faDigitsToEn } from '../format'
import { REMOTE, api, connectEvents, disconnect, setToken, syncState } from './remote'

export const DEMO_OTP = '1234'
export { REMOTE }

let pending: { phone: string; signupToken?: string } | null = null

/** ارسال کد تأیید؛ در حالت نمایشی کد ثابت است */
export async function requestOtp(raw: string): Promise<{ demo: boolean; devCode?: string }> {
  const phone = normalizePhone(raw)
  if (!isValidPhone(phone)) throw new AppError('شماره موبایل معتبر نیست')
  if (!REMOTE) return { demo: true }
  return api<{ demo: boolean; devCode?: string }>('/auth/otp', { phone })
}

/** تأیید کد؛ اگر کاربر وجود داشته باشد وارد می‌شود وگرنه باید ثبت‌نام را کامل کند */
export async function verifyOtp(raw: string, otp: string): Promise<{ exists: boolean }> {
  const phone = normalizePhone(raw)
  if (!isValidPhone(phone)) throw new AppError('شماره موبایل معتبر نیست')
  const code = faDigitsToEn(otp).trim()
  if (REMOTE) {
    const r = await api<{ exists: boolean; token?: string; signupToken?: string; userId?: string }>('/auth/verify', { phone, code })
    if (r.token) {
      await afterRemoteLogin(r.token, r.userId!)
      return { exists: true }
    }
    pending = { phone, signupToken: r.signupToken }
    return { exists: false }
  }
  if (code !== DEMO_OTP) throw new AppError('کد تایید اشتباه است')
  const user = db().users.find((u) => u.phone === phone)
  if (user) {
    assertCanLogin(user.id)
    loginLocal(user.id, 'user')
    return { exists: true }
  }
  pending = { phone }
  return { exists: false }
}

export async function registerUser(input: ProfileInput) {
  if (!pending) throw new AppError('ابتدا شماره موبایل را تأیید کنید')
  if (REMOTE) {
    const r = await api<{ token: string; userId: string }>('/auth/register', { signupToken: pending.signupToken, profile: input })
    pending = null
    await afterRemoteLogin(r.token, r.userId)
    return
  }
  const u = createUser(pending.phone, input)
  pending = null
  loginLocal(u.id, 'user')
}

async function afterRemoteLogin(token: string, userId: string) {
  setToken(token)
  useSession.getState().login(userId, 'user')
  await syncState()
  connectEvents()
  touchDaily().catch(() => {})
}

function loginLocal(userId: string, role: Role) {
  useSession.getState().login(userId, role)
  touchDaily().catch(() => {})
  expireTickets()
}

/** ورود سریع با حساب‌های نمایشی */
export async function loginAs(userId: string, role: Role = 'user') {
  if (REMOTE) {
    const r = await api<{ token: string; userId: string }>('/auth/demo', { userId })
    await afterRemoteLogin(r.token, r.userId)
    useSession.getState().setRole(role)
    return
  }
  assertCanLogin(userId)
  loginLocal(userId, role)
}

export function logout() {
  if (REMOTE) {
    api('/auth/logout', {}).catch(() => {})
    setToken(null)
    disconnect()
    useDB.setState({ ...useDB.getState(), users: [] })
  }
  useSession.getState().logout()
}

/** بازنشانی داده‌های نمایشی (فقط حالت محلی) */
export function resetLocalDemo() {
  if (REMOTE) return
  resetDemo()
  useSession.getState().logout()
}
