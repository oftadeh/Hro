/**
 * ارتباط باشگاه با اعضا (CRM سبک):
 *  - فهرست اعضا از روی ورودهای تأییدشده، با دسته‌بندی «جدید، فعال، در خطر ریزش، ازدست‌رفته».
 *  - کمپین: پیام به یک دسته با تخفیف اختصاصی ورود بعدی؛ هزینه‌ی تخفیف را باشگاه می‌دهد نه کی‌فیت.
 *  - ثبت آنالیز ترکیب بدن (InBody) برای ورزشکاری که امروز در باشگاه حضور داشته است.
 */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import type { DBState } from '../state'
import { uid, now } from '../id'
import type { GymCampaign, ID, MemberSegment } from '../types'
import { notify } from './ledger'
import { addXP } from './engagement'
import { dayKey } from '../format'

const DAY = 86_400_000

export const SEGMENT_LABEL: Record<MemberSegment, string> = {
  all: 'همه‌ی اعضا',
  new: 'تازه‌واردها (۳۰ روز اخیر)',
  active: 'فعال (تا ۱۴ روز)',
  at_risk: 'در خطر ریزش (۱۵ تا ۴۵ روز)',
  lost: 'ازدست‌رفته (بیش از ۴۵ روز)',
}

export interface GymMember {
  userId: ID
  visits: number
  firstAt: string
  lastAt: string
  spent: number
  segments: MemberSegment[]
}

/** اعضای باشگاه(ها) بر اساس ورودهای استفاده‌شده */
export function gymMembers(gymIds: ID[], s: Pick<DBState, 'checkins'> = db(), at = Date.now()): GymMember[] {
  const map = new Map<ID, GymMember>()
  for (const c of s.checkins) {
    if (!gymIds.includes(c.gymId) || c.status !== 'used' || !c.usedAt) continue
    const m = map.get(c.userId) ?? { userId: c.userId, visits: 0, firstAt: c.usedAt, lastAt: c.usedAt, spent: 0, segments: [] }
    m.visits += 1
    m.spent += c.paid ?? c.price
    if (c.usedAt < m.firstAt) m.firstAt = c.usedAt
    if (c.usedAt > m.lastAt) m.lastAt = c.usedAt
    map.set(c.userId, m)
  }
  return [...map.values()]
    .map((m) => {
      const since = (at - new Date(m.lastAt).getTime()) / DAY
      const segs: MemberSegment[] = ['all', since <= 14 ? 'active' : since <= 45 ? 'at_risk' : 'lost']
      if ((at - new Date(m.firstAt).getTime()) / DAY <= 30) segs.push('new')
      return { ...m, segments: segs }
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

/** بهترین تخفیف فعال کمپین برای کاربر در یک باشگاه */
export function campaignOffer(d: Pick<DBState, 'campaigns'>, userId: ID, gymId: ID, at = new Date()): GymCampaign | undefined {
  return d.campaigns
    .filter((c) => c.gymId === gymId && c.pct && c.recipients.includes(userId) && !c.usedBy.includes(userId) && c.expiresAt && new Date(c.expiresAt) > at)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0]
}

export const sendCampaign = svc(
  'gym.campaign',
  (input: { gymId: ID; segment: MemberSegment; title: string; body: string; pct?: number; days?: number }) => {
    const me = currentUserId()
    const gym = db().gyms.find((g) => g.id === input.gymId && g.ownerId === me)
    if (!gym) throw new AppError('باشگاه یافت نشد')
    if (!gym.approved) throw new AppError('باشگاه هنوز تأیید نشده است')
    if (!(input.segment in SEGMENT_LABEL)) throw new AppError('گروه مخاطب معتبر نیست')
    const title = String(input.title ?? '').trim()
    const body = String(input.body ?? '').trim()
    if (title.length < 3 || body.length < 5) throw new AppError('عنوان و متن پیام را کامل بنویسید')
    const pct = input.pct ? Math.round(input.pct) : 0
    if (pct && !(pct >= 5 && pct <= 70)) throw new AppError('تخفیف باید بین ۵ تا ۷۰ درصد باشد')
    const days = Math.min(30, Math.max(1, Math.round(input.days || 7)))
    // جلوگیری از پیام انبوه: هر گروه حداکثر یک کمپین در ۳ روز
    const recent = db().campaigns.some((c) => c.gymId === gym.id && c.segment === input.segment && Date.now() - new Date(c.createdAt).getTime() < 3 * DAY)
    if (recent) throw new AppError('برای این گروه در ۳ روز اخیر پیام فرستاده‌اید')
    const recipients = gymMembers([gym.id]).filter((m) => m.segments.includes(input.segment)).map((m) => m.userId)
    if (!recipients.length) throw new AppError('عضوی در این گروه وجود ندارد')
    const id = uid('cm-')
    mutate((d) => {
      d.campaigns.unshift({
        id, gymId: gym.id, segment: input.segment, title: title.slice(0, 80), body: body.slice(0, 400), pct: pct || undefined,
        expiresAt: pct ? new Date(Date.now() + days * DAY).toISOString() : undefined, recipients, usedBy: [], createdAt: now(),
      })
      recipients.forEach((u) => notify(d, u, `${gym.name}: ${title}`, pct ? `${body}\n${pct}٪ تخفیف ورود بعدی تا ${days} روز.` : body, '', `/fityab/${gym.id}`))
    })
    return recipients.length
  },
  { roles: ['gym'] },
)

const INBODY_RANGES = {
  weightKg: [30, 250, 'وزن'],
  bodyFatPct: [3, 60, 'درصد چربی'],
  muscleKg: [10, 120, 'وزن عضله'],
  visceralFat: [1, 30, 'چربی احشایی'],
  bmr: [800, 4000, 'متابولیسم پایه'],
  waterPct: [30, 80, 'درصد آب'],
} as const

/** ثبت آنالیز ترکیب بدن توسط باشگاه؛ فقط برای کسی که امروز بلیت این باشگاه را دارد */
export const recordInBody = svc(
  'gym.inbody',
  (gymId: ID, userId: ID, data: Partial<Record<keyof typeof INBODY_RANGES, number>>) => {
    const me = currentUserId()
    const gym = db().gyms.find((g) => g.id === gymId && g.ownerId === me)
    if (!gym) throw new AppError('باشگاه یافت نشد')
    const today = dayKey()
    const present = db().checkins.some((c) => c.gymId === gymId && c.userId === userId && (c.status === 'used' || c.status === 'active') && dayKey(new Date(c.usedAt ?? c.createdAt)) === today)
    if (!present) throw new AppError('فقط برای ورزشکاری که امروز در باشگاه حضور دارد می‌توانید آنالیز ثبت کنید')
    const e: Partial<Record<keyof typeof INBODY_RANGES, number>> = {}
    for (const [k, [min, max, label]] of Object.entries(INBODY_RANGES) as [keyof typeof INBODY_RANGES, readonly [number, number, string]][]) {
      const v = data[k]
      if (v === undefined || v === null || !v) continue
      if (!(Number(v) >= min && Number(v) <= max)) throw new AppError(`${label} معتبر نیست`)
      e[k] = Math.round(Number(v) * 10) / 10
    }
    if (!e.weightKg || !e.bodyFatPct) throw new AppError('وزن و درصد چربی الزامی است')
    mutate((d) => {
      d.bodyEntries.push({ ...e, id: uid('be-'), userId, day: today, source: 'inbody', gymId, createdAt: now() })
      d.users.find((u) => u.id === userId)!.weightKg = e.weightKg
      addXP(d, userId, 15)
      notify(d, userId, 'نتیجه‌ی آنالیز بدن ثبت شد', `${gym.name}: چربی ${e.bodyFatPct}٪${e.muscleKg ? `، عضله ${e.muscleKg} کیلوگرم` : ''}. روند را در «پیشرفت» ببینید.`, '', '/progress')
    })
  },
  { roles: ['gym'] },
)
