import { AppError, mutate, currentUserId, db } from '../db'
import { uid, now, entryCode } from '../id'
import type { CheckIn, Gym } from '../types'
import { applyPayment, notify } from './ledger'
import { addXP, completeMission } from './engagement'
import { toman } from '../format'
import { GRADIENTS } from '../config'

/**
 * ورود بدون ثبت‌نام به باشگاه: هزینه‌ی سانس از اعتبار اشتراک (یا کیف پول)
 * کسر و پس از کم شدن کمیسیون به کیف پول باشگاه‌دار واریز می‌شود.
 */
export function checkIn(gymId: string, prefer: 'subscription' | 'wallet' = 'subscription'): CheckIn {
  const userId = currentUserId()
  const gym = db().gyms.find((g) => g.id === gymId)
  if (!gym || !gym.approved) throw new AppError('باشگاه در دسترس نیست')
  const user = db().users.find((u) => u.id === userId)!
  if (gym.gender !== 'mixed' && user.gender && user.gender !== gym.gender) throw new AppError(gym.gender === 'female' ? 'این باشگاه ویژه‌ی بانوان است' : 'این باشگاه ویژه‌ی آقایان است')
  let created!: CheckIn
  mutate((d) => {
    const sub = d.subscriptions.find((s) => s.userId === userId && new Date(s.expiresAt) > new Date())
    const useSub = prefer === 'subscription' && sub && sub.credit >= gym.sessionPrice
    applyPayment(d, {
      type: 'checkin',
      from: useSub ? 'subscription' : userId,
      payerId: userId,
      to: gym.ownerId,
      amount: gym.sessionPrice,
      module: 'fityab',
      refId: gym.id,
      description: `ورود ${user.name} به ${gym.name}`,
    })
    created = { id: uid('ci-'), userId, gymId, price: gym.sessionPrice, code: entryCode(), paidWith: useSub ? 'subscription' : 'wallet', status: 'active', createdAt: now() }
    d.checkins.unshift(created)
    addXP(d, userId, 30)
    completeMission(d, userId, 'workout')
    notify(d, gym.ownerId, 'ورزشکار جدید در راه است', `${user.name} برای ${gym.name} کد ورود ${created.code} گرفت (${toman(gym.sessionPrice)}).`, '', '/panel/gym/checkins')
  })
  return created
}

/** باشگاه‌دار کد ورود را در پذیرش تایید می‌کند */
export function verifyEntry(code: string) {
  const ownerId = currentUserId()
  const myGyms = db().gyms.filter((g) => g.ownerId === ownerId).map((g) => g.id)
  const ci = db().checkins.find((c) => c.code === code.trim() && myGyms.includes(c.gymId))
  if (!ci) throw new AppError('کد ورود معتبر نیست')
  if (ci.status === 'used') throw new AppError('این کد قبلاً استفاده شده است')
  mutate((d) => {
    d.checkins.find((c) => c.id === ci.id)!.status = 'used'
  })
  return ci
}

export function saveGym(input: Partial<Gym> & { id?: string }) {
  const ownerId = currentUserId()
  if (!input.name?.trim()) throw new AppError('نام باشگاه الزامی است')
  if (!input.sessionPrice || input.sessionPrice < 10_000) throw new AppError('هزینه‌ی هر سانس را وارد کنید')
  let id = input.id
  mutate((d) => {
    const existing = id ? d.gyms.find((g) => g.id === id && g.ownerId === ownerId) : undefined
    if (existing) {
      Object.assign(existing, input, { ownerId })
    } else {
      id = uid('g-')
      d.gyms.unshift({
        id, ownerId, name: '', tagline: '', description: '', address: '', city: 'تهران', lat: 35.72, lng: 51.39, phone: '',
        sessionPrice: 0, facilities: [], sports: [], hours: '', gender: 'mixed', media: [],
        cover: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)], rating: 0, reviews: 0, approved: false, createdAt: now(),
        ...input,
      } as Gym)
      d.users.filter((u) => u.roles.includes('admin')).forEach((a) =>
        notify(d, a.id, 'باشگاه جدید در انتظار تایید', `«${input.name}» برای فیت‌یاب ثبت شد.`, '', '/panel/admin/gyms'),
      )
    }
  })
  return id!
}

export function rateGym(gymId: string, stars: number) {
  mutate((d) => {
    const g = d.gyms.find((x) => x.id === gymId)
    if (!g) return
    g.rating = (g.rating * g.reviews + stars) / (g.reviews + 1)
    g.reviews += 1
  })
}
