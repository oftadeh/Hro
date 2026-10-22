import { AppError, mutate, db, useSession, currentUserId } from '../db'
import { uid, now } from '../id'
import type { Role, User } from '../types'
import { notify } from './ledger'
import { touchDaily } from './engagement'
import { faDigitsToEn } from '../format'
import { ROLE_META } from '../config'

export const DEMO_OTP = '1234'

export function normalizePhone(raw: string) {
  const p = faDigitsToEn(raw).replace(/\D/g, '').replace(/^98/, '0')
  return p.startsWith('9') ? `0${p}` : p
}

/** ورود/ثبت‌نام با شماره موبایل و کد یکبار مصرف (فعلاً کد ثابت ۱۲۳۴) */
export function loginWithOtp(rawPhone: string, otp: string, name?: string): User {
  const phone = normalizePhone(rawPhone)
  if (!/^09\d{9}$/.test(phone)) throw new AppError('شماره موبایل معتبر نیست')
  if (faDigitsToEn(otp) !== DEMO_OTP) throw new AppError('کد تایید اشتباه است')
  let user = db().users.find((u) => u.phone === phone)
  if (user?.blocked) throw new AppError('حساب کاربری شما مسدود شده است')
  if (!user) {
    const created: User = { id: uid('u-'), name: name?.trim() || 'ورزشکار کی‌فیت', phone, city: 'تهران', roles: ['user'], xp: 0, streak: 0, following: [], createdAt: now() }
    mutate((d) => {
      d.users.push(created)
      d.wallets[created.id] = 0
      notify(d, created.id, 'به کی‌فیت خوش اومدی!', 'با خرید اشتراک بدون ثبت‌نام وارد باشگاه‌ها شو.', '', '/wallet')
    })
    user = created
  }
  useSession.getState().login(user.id, 'user')
  touchDaily(user.id)
  return user
}

export function loginAs(userId: string, role: Role = 'user') {
  useSession.getState().login(userId, role)
  touchDaily(userId)
}

/** فعال‌سازی نقش جدید (مربی، باشگاه‌دار و...) برای کاربر فعلی */
export function activateRole(role: Exclude<Role, 'admin' | 'user'>) {
  const me = currentUserId()
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    if (!u.roles.includes(role)) u.roles.push(role)
    if (role === 'coach' && !d.coaches.find((c) => c.userId === me))
      d.coaches.push({ userId: me, title: 'مربی', specialties: [], experienceYears: 1, bio: '', rating: 5, students: 0, online: true, callPrice: 100_000, plans: [], certificates: [] })
    if (role === 'doctor' && !d.doctors.find((x) => x.userId === me))
      d.doctors.push({ userId: me, specialty: 'پزشک عمومی', medicalCode: '', bio: '', visitPrice: 200_000, rating: 5, visits: 0, slots: [], online: true })
    notify(d, me, `پنل ${ROLE_META[role].label} فعال شد`, 'از منوی پروفایل وارد پنل شوید و اطلاعات خود را تکمیل کنید.', ROLE_META[role].icon, ROLE_META[role].panel)
  })
  useSession.getState().setRole(role)
}

export function updateProfile(input: Partial<User>) {
  const me = currentUserId()
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    const { id: _id, roles: _r, xp: _x, ...safe } = input
    Object.assign(u, safe)
  })
}
