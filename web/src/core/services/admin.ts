/** عملیات مدیر سامانه — همه روی سرور فقط برای نقش admin مجازند */
import { AppError, mutate, db, svc, currentUserId } from '../store'
import type { Coupon, RevenueModule } from '../types'
import { notify } from './ledger'
import { uid, now } from '../id'
import { toman, dayKey } from '../format'

const A = { roles: ['admin' as const] }

export const setCommission = svc(
  'admin.commission',
  (module: RevenueModule, pct: number) => {
    mutate((d) => {
      if (!(module in d.settings.commissions)) throw new AppError('ماژول معتبر نیست')
      d.settings.commissions[module] = Math.min(90, Math.max(0, Math.round(pct)))
    })
  },
  A,
)

type NumSetting = 'challengeCreationFee' | 'minWithdraw' | 'shippingFee' | 'freeShippingOver' | 'referralReward' | 'orgDiscountPct'
export const setPlatformSetting = svc(
  'admin.setting',
  (key: NumSetting, value: number) => {
    if (!['challengeCreationFee', 'minWithdraw', 'shippingFee', 'freeShippingOver', 'referralReward', 'orgDiscountPct'].includes(key)) throw new AppError('تنظیم معتبر نیست')
    mutate((d) => {
      d.settings[key] = key === 'orgDiscountPct' ? Math.min(50, Math.max(0, value)) : Math.max(0, Math.round(value))
    })
  },
  A,
)

export const setGymApproval = svc(
  'admin.gymApproval',
  (gymId: string, approved: boolean) => {
    mutate((d) => {
      const g = d.gyms.find((x) => x.id === gymId)
      if (!g) return
      g.approved = approved
      notify(d, g.ownerId, approved ? 'باشگاه شما تایید شد' : 'باشگاه شما غیرفعال شد', approved ? `«${g.name}» اکنون در فیت‌یاب نمایش داده می‌شود.` : `«${g.name}» از فیت‌یاب حذف شد.`, '', '/panel/gym')
    })
  },
  A,
)

/** تأیید پروانه‌ی پزشک، مدارک مربی و رستوران */
export const setVerification = svc(
  'admin.verify',
  (kind: 'doctor' | 'coach' | 'restaurant', id: string, ok: boolean) => {
    mutate((d) => {
      if (kind === 'doctor') {
        const x = d.doctors.find((v) => v.userId === id)
        if (!x) throw new AppError('پزشک یافت نشد')
        x.verified = ok
        notify(d, id, ok ? 'پروانه‌ی شما تأیید شد' : 'پروانه‌ی شما تأیید نشد', ok ? 'اکنون بیماران می‌توانند نوبت رزرو کنند.' : 'کد نظام پزشکی را بررسی و دوباره ثبت کنید.', '', '/panel/doctor/profile')
      } else if (kind === 'coach') {
        const x = d.coaches.find((v) => v.userId === id)
        if (!x) throw new AppError('مربی یافت نشد')
        x.verified = ok
        notify(d, id, ok ? 'مدارک مربیگری تأیید شد' : 'مدارک مربیگری تأیید نشد', ok ? 'نشان «مربی تأییدشده» روی پروفایل شما نمایش داده می‌شود.' : 'لطفاً مدارک معتبر بارگذاری کنید.', '', '/panel/coach/profile')
      } else {
        const x = d.restaurants.find((v) => v.id === id)
        if (!x) throw new AppError('رستوران یافت نشد')
        x.approved = ok
        notify(d, x.ownerId, ok ? 'رستوران شما تأیید شد' : 'رستوران شما غیرفعال شد', x.name, '', '/panel/restaurant')
      }
    })
  },
  A,
)

export const resolvePayout = svc(
  'admin.payout',
  (id: string, ok: boolean) => {
    mutate((d) => {
      const p = d.payouts.find((x) => x.id === id)
      if (!p || p.status !== 'pending') return
      p.status = ok ? 'paid' : 'rejected'
      if (!ok) {
        d.wallets[p.userId] = (d.wallets[p.userId] ?? 0) + p.amount
        d.transactions.unshift({ id: uid('tx-'), type: 'refund', from: 'gateway', to: p.userId, amount: p.amount, commission: 0, description: 'برگشت درخواست تسویه', createdAt: now() })
      }
      notify(d, p.userId, ok ? 'تسویه انجام شد' : 'درخواست تسویه رد شد', `${toman(p.amount)}`, '', '/wallet')
    })
  },
  A,
)

export const toggleBlockUser = svc(
  'admin.blockUser',
  (userId: string) => {
    if (userId === currentUserId()) throw new AppError('نمی‌توانید حساب خودتان را مسدود کنید')
    mutate((d) => {
      const u = d.users.find((x) => x.id === userId)
      if (u) u.blocked = !u.blocked
    })
  },
  A,
)

export const broadcast = svc(
  'admin.broadcast',
  (title: string, body: string) => {
    if (!String(title ?? '').trim()) throw new AppError('عنوان اعلان را وارد کنید')
    mutate((d) => {
      d.users.forEach((u) => notify(d, u.id, title.slice(0, 80), String(body ?? '').slice(0, 300), ''))
    })
  },
  A,
)

/** رسیدگی به گزارش تخلف */
export const resolveReport = svc(
  'admin.report',
  (reportId: string, action: 'remove' | 'hide' | 'dismiss' | 'ban') => {
    mutate((d) => {
      const r = d.reports.find((x) => x.id === reportId)
      if (!r) throw new AppError('گزارش یافت نشد')
      const related = d.reports.filter((x) => x.refId === r.refId && x.status === 'open')
      if (action === 'dismiss') {
        related.forEach((x) => (x.status = 'dismissed'))
        const p = r.kind === 'post' ? d.posts.find((x) => x.id === r.refId) : undefined
        if (p) p.hidden = false
        return
      }
      related.forEach((x) => (x.status = 'resolved'))
      if (r.kind === 'post') {
        const p = d.posts.find((x) => x.id === r.refId)
        if (p) {
          if (action === 'remove') d.posts = d.posts.filter((x) => x.id !== p.id)
          else p.hidden = true
          notify(d, p.authorId, 'پست شما حذف شد', 'به دلیل نقض قوانین جامعه، پست شما از فیت‌زون حذف شد.', '')
          if (action === 'ban') d.users.find((u) => u.id === p.authorId)!.blocked = true
        }
      } else if (r.kind === 'comment' && r.parentId) {
        const p = d.posts.find((x) => x.id === r.parentId)
        const c = p?.comments.find((x) => x.id === r.refId)
        if (p && c) {
          p.comments = p.comments.filter((x) => x.id !== r.refId)
          if (action === 'ban') d.users.find((u) => u.id === c.authorId)!.blocked = true
        }
      } else if (r.kind === 'story') {
        d.stories = d.stories.filter((x) => x.id !== r.refId)
      } else if (r.kind === 'user' && action === 'ban') {
        const u = d.users.find((x) => x.id === r.refId)
        if (u) u.blocked = true
      }
    })
  },
  A,
)

export const saveCoupon = svc(
  'admin.coupon',
  (input: Partial<Coupon>) => {
    const code = String(input.code ?? '').trim().toUpperCase()
    if (!/^[A-Z0-9]{3,20}$/.test(code)) throw new AppError('کد تخفیف باید ۳ تا ۲۰ حرف انگلیسی یا عدد باشد')
    if (!(input.pct! > 0 && input.pct! <= 100)) throw new AppError('درصد تخفیف معتبر نیست')
    mutate((d) => {
      const ex = input.id ? d.coupons.find((c) => c.id === input.id) : d.coupons.find((c) => c.code === code)
      const data = {
        code,
        pct: Math.round(input.pct!),
        maxAmount: Math.max(0, Math.round(input.maxAmount ?? 0)),
        module: (['shop', 'buffet', 'subscription', 'all'] as const).find((m) => m === input.module) ?? 'all',
        maxUses: Math.max(1, Math.round(input.maxUses ?? 100)),
        expiresAt: input.expiresAt ?? new Date(Date.now() + 30 * 86_400_000).toISOString(),
        active: input.active ?? true,
      }
      if (ex) Object.assign(ex, data)
      else d.coupons.unshift({ id: uid('cp-'), usedBy: [], ...data })
    })
  },
  A,
)

export function platformStats() {
  const s = db()
  const revenueByModule: Record<string, number> = {}
  let gmv = 0
  for (const t of s.transactions) {
    if (['topup', 'withdraw', 'refund', 'challenge_prize', 'reward'].includes(t.type)) continue
    gmv += t.amount
    const key = t.type === 'subscription' || t.type === 'gift' || t.type === 'org_seats' ? 'subscription' : t.module ?? 'other'
    // درآمد خالص = کمیسیون منهای تخفیف‌هایی که کی‌فیت پرداخته
    revenueByModule[key] = (revenueByModule[key] ?? 0) + t.commission - (t.discount ?? 0)
  }
  const refunds = s.transactions.filter((t) => t.type === 'refund').reduce((a, t) => a + t.amount, 0)
  const revenue = Object.values(revenueByModule).reduce((a, b) => a + b, 0)
  return { gmv, revenue, revenueByModule, refunds }
}

/** سری زمانی ۱۴ روز اخیر برای داشبورد مدیر */
export function dailySeries(days = 14) {
  const s = db()
  const out: { day: string; gmv: number; revenue: number; active: number; signups: number; checkins: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date()
    dt.setDate(dt.getDate() - i)
    const k = dayKey(dt)
    const txs = s.transactions.filter((t) => dayKey(new Date(t.createdAt)) === k && !['topup', 'withdraw', 'refund', 'challenge_prize', 'reward'].includes(t.type))
    out.push({
      day: k,
      gmv: txs.reduce((a, t) => a + t.amount, 0),
      revenue: txs.reduce((a, t) => a + t.commission - (t.discount ?? 0), 0),
      active: new Set(s.dailyLogs.filter((l) => l.day === k).map((l) => l.userId)).size,
      signups: s.users.filter((u) => dayKey(new Date(u.createdAt)) === k).length,
      checkins: s.checkins.filter((c) => c.usedAt && dayKey(new Date(c.usedAt)) === k).length,
    })
  }
  return out
}
