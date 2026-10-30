/** عملیات مدیر سامانه — همه روی سرور فقط برای نقش admin مجازند */
import { AppError, mutate, db, svc, currentUserId } from '../store'
import type { Coupon, RevenueModule, VenueKind, Gym } from '../types'
import { VENUE_KINDS } from '../config'
import { notify } from './ledger'
import { gymMissing } from './fityab'
import { uid, now } from '../id'
import { toman, dayKey } from '../format'

const A = { roles: ['admin' as const] }

const gymLabel = (g: Pick<Gym, 'name' | 'branch'>) => (g.branch ? `${g.name} · ${g.branch}` : g.name)

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

type NumSetting = 'challengeCreationFee' | 'minWithdraw' | 'shippingFee' | 'freeShippingOver' | 'referralReward' | 'orgDiscountPct' | 'lateCancelFeePct'
export const setPlatformSetting = svc(
  'admin.setting',
  (key: NumSetting, value: number) => {
    if (!['challengeCreationFee', 'minWithdraw', 'shippingFee', 'freeShippingOver', 'referralReward', 'orgDiscountPct', 'lateCancelFeePct'].includes(key)) throw new AppError('تنظیم معتبر نیست')
    mutate((d) => {
      d.settings[key] = key === 'orgDiscountPct' ? Math.min(50, Math.max(0, value)) : key === 'lateCancelFeePct' ? Math.min(100, Math.max(0, Math.round(value))) : Math.max(0, Math.round(value))
    })
  },
  A,
)

/** سقف قیمت سانس سطح استاندارد و ویژه؛ بالاتر از ویژه، لوکس حساب می‌شود */
export const setTierCaps = svc(
  'admin.tierCaps',
  (caps: { standard: number; premium: number }) => {
    const standard = Math.round(Number(caps.standard))
    const premium = Math.round(Number(caps.premium))
    if (!(standard >= 10_000 && premium > standard)) throw new AppError('سقف سطح ویژه باید بیشتر از سقف استاندارد باشد')
    mutate((d) => {
      d.settings.tierCaps = { standard, premium }
    })
  },
  A,
)

/** دوره‌ی آزمایشی رایگان: روشن/خاموش، اعتبار و مدت */
export const setTrial = svc(
  'admin.trial',
  (input: { enabled: boolean; credit: number; days: number }) => {
    const credit = Math.round(Number(input.credit))
    const days = Math.round(Number(input.days))
    if (!(credit >= 0 && credit <= 5_000_000)) throw new AppError('اعتبار دوره‌ی آزمایشی معتبر نیست')
    if (!(days >= 1 && days <= 30)) throw new AppError('مدت دوره‌ی آزمایشی باید ۱ تا ۳۰ روز باشد')
    mutate((d) => {
      d.settings.trial = { enabled: !!input.enabled, credit, days }
    })
  },
  A,
)

/** فعال‌سازی انواع مجموعه‌ها در فیت‌یاب (فازهای توسعه) */
export const setVenueKinds = svc(
  'admin.venueKinds',
  (kinds: VenueKind[]) => {
    const clean = [...new Set(kinds)].filter((k) => k in VENUE_KINDS)
    if (!clean.length) throw new AppError('حداقل یک نوع مجموعه باید فعال باشد')
    mutate((d) => {
      d.settings.venueKinds = clean
    })
  },
  A,
)

export const setGymApproval = svc(
  'admin.gymApproval',
  (gymId: string, decision: Decision, note?: string) => {
    const n = decisionNote(decision, note)
    mutate((d) => {
      const g = d.gyms.find((x) => x.id === gymId)
      if (!g) throw new AppError('باشگاه یافت نشد')
      const title = gymLabel(g)
      if (decision === 'approve') {
        const missing = gymMissing(g)
        if (missing.length) throw new AppError(`پیش از انتشار این موارد کامل شود (گزینه‌ی «نیاز به اصلاح»): ${missing.map((x) => x.label).join('، ')}`)
        g.approved = true
        g.review = undefined
        notify(d, g.ownerId, 'باشگاه شما تأیید و منتشر شد', `«${title}» اکنون در فیت‌یاب نمایش داده می‌شود.`, '', '/panel/gym/gyms')
        return
      }
      g.approved = false
      g.review = { status: decision === 'reject' ? 'rejected' : 'changes', note: n, at: now() }
      const [t, b] = decision === 'changes' ? ['باشگاه شما نیاز به اصلاح دارد', `«${title}»: ${n}`] : ['باشگاه شما تأیید نشد', `«${title}»: ${n}`]
      notify(d, g.ownerId, t, b, '', '/panel/gym/gyms')
    })
  },
  A,
)


/** تأیید پروانه‌ی پزشک، مدارک مربی و رستوران؛ لغو یا رد با توضیح */
export const setVerification = svc(
  'admin.verify',
  (kind: 'doctor' | 'coach' | 'restaurant', id: string, decision: Decision, note?: string) => {
    const n = decisionNote(decision, note)
    const ok = decision === 'approve'
    const why = n ? ` ${n}` : ''
    mutate((d) => {
      if (kind === 'doctor') {
        const x = d.doctors.find((v) => v.userId === id)
        if (!x) throw new AppError('پزشک یافت نشد')
        if (ok && String(x.medicalCode ?? '').trim().length < 4) throw new AppError('کد نظام یا مجوز ثبت نشده است؛ «نیاز به اصلاح» بزنید')
        x.verified = ok
        notify(d, id, ok ? 'پروانه‌ی شما تأیید شد' : 'پروانه‌ی شما تأیید نشد', ok ? 'اکنون بیماران می‌توانند نوبت رزرو کنند.' : `${why} اطلاعات پروانه را اصلاح کنید.`.trim(), '', '/panel/doctor/profile')
      } else if (kind === 'coach') {
        const x = d.coaches.find((v) => v.userId === id)
        if (!x) throw new AppError('مربی یافت نشد')
        if (ok && !x.certificates.length) throw new AppError('مربی مدرکی ثبت نکرده است؛ «نیاز به اصلاح» بزنید')
        x.verified = ok
        notify(d, id, ok ? 'مدارک مربیگری تأیید شد' : 'مدارک مربیگری تأیید نشد', ok ? 'نشان «مربی تأییدشده» روی پروفایل شما نمایش داده می‌شود.' : `${why} مدارک معتبر را در پروفایل ثبت کنید.`.trim(), '', '/panel/coach/profile')
      } else {
        const x = d.restaurants.find((v) => v.id === id)
        if (!x) throw new AppError('رستوران یافت نشد')
        x.approved = ok
        x.review = ok ? undefined : { status: decision === 'reject' ? 'rejected' : 'changes', note: n, at: now() }
        notify(d, x.ownerId, ok ? 'رستوران شما تأیید و منتشر شد' : decision === 'changes' ? 'رستوران شما نیاز به اصلاح دارد' : 'رستوران شما تأیید نشد', ok ? x.name : `«${x.name}»: ${n}`, '', '/panel/restaurant')
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
      } else if (r.kind === 'listing') {
        const l = d.listings.find((x) => x.id === r.refId)
        if (l && l.status === 'active') {
          l.status = 'removed'
          notify(d, l.sellerId, 'آگهی شما حذف شد', `«${l.title}» به دلیل نقض قوانین بازار حذف شد.`, '', '/market')
        }
        if (l && action === 'ban') d.users.find((u) => u.id === l.sellerId)!.blocked = true
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

/** تصمیم مدیر: تأیید و انتشار، نیاز به اصلاح (قابل ارسال دوباره) یا رد نهایی؛ دو مورد آخر با توضیح */
export type Decision = 'approve' | 'changes' | 'reject'

function decisionNote(decision: Decision, note?: string) {
  if (!['approve', 'changes', 'reject'].includes(decision)) throw new AppError('تصمیم نامعتبر است')
  const n = String(note ?? '').trim().slice(0, 500)
  if (decision !== 'approve' && n.length < 5) throw new AppError(decision === 'reject' ? 'دلیل رد را بنویسید' : 'موارد لازم برای اصلاح را بنویسید')
  return n
}

/** بررسی مدارک حساب کسب‌وکار (باشگاه، مربی، پزشک، فروشنده، رستوران) */
export const reviewVerification = svc(
  'admin.reviewVerification',
  (userId: string, decision: Decision, note?: string) => {
    const n = decisionNote(decision, note)
    mutate((d) => {
      const u = d.users.find((v) => v.id === userId)
      if (!u?.verification) throw new AppError('پرونده‌ی مدارک یافت نشد')
      const status = decision === 'approve' ? 'approved' : decision === 'changes' ? 'changes' : 'rejected'
      u.verification = { ...u.verification, status, adminNote: n || undefined, reviewedAt: now() }
      // تأیید مدارک حساب، مجوز مربی/پزشک را هم تأیید می‌کند (همان مدرک و شماره بررسی شده است)
      if (decision === 'approve') {
        const no = u.verification.fields?.licenseNo
        const c = d.coaches.find((x) => x.userId === userId)
        if (c) {
          if (!c.certificates.length && no) c.certificates = [`کارت مربیگری ${no}`]
          c.verified = true
        }
        const doc = d.doctors.find((x) => x.userId === userId)
        if (doc) {
          if (!doc.medicalCode && no) doc.medicalCode = no
          doc.verified = !!doc.medicalCode
        }
      }
      const [title, body] =
        decision === 'approve' ? ['حساب شما تأیید شد', 'اکنون می‌توانید در کی‌فیت فعالیت کنید.']
        : decision === 'changes' ? ['مدارک شما نیاز به اصلاح دارد', `${n} — موارد را اصلاح و دوباره ارسال کنید.`]
        : ['درخواست شما رد شد', `دلیل: ${n}`]
      notify(d, userId, title, body, '', '/panel')
    })
  },
  A,
)

