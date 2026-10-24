import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/layouts/Logo'
import { ArrowLeft, Check, Lock, Mail, MessageSquare } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { ROLE_META } from '@/core/config'
import { loginAs, verifyOtp, registerUser, requestOtp, requestEmailOtp, verifyEmailOtp, DEMO_OTP, REMOTE } from '@/core/client/session'
import type { ProfileInput as RegisterInput } from '@/core/services/auth'
import { api } from '@/core/client/remote'
import { faDigitsToEn } from '@/core/format'
import type { Role } from '@/core/types'
import { run, runOk } from '@/ui/toast'
import { RoleIcon } from '@/ui/icons'
import { Runner, Lifter, Yoga, Trophy } from '@/ui/art'
import { daysAgoKey, GOALS, ACTIVITY } from '@/core/profile'
import { BUSINESS_ROLES, type BusinessRole } from '@/core/roles'

const DEMOS: { userId: string; role: Role }[] = [
  { userId: 'u-sara', role: 'user' },
  { userId: 'u-ali', role: 'gym' },
  { userId: 'u-coach1', role: 'coach' },
  { userId: 'u-seller', role: 'seller' },
  { userId: 'u-doctor', role: 'doctor' },
  { userId: 'u-rest', role: 'restaurant' },
  { userId: 'u-org', role: 'company' },
  { userId: 'u-admin', role: 'admin' },
]

const FEATURES = [
  ['فیت‌یاب', 'ورود بدون ثبت‌نام به باشگاه‌های منتخب'],
  ['فیت‌یار', 'دستیار هوشمند و مربیان حرفه‌ای'],
  ['چالش‌ها', 'رقابت، امتیاز و جوایز نقدی'],
  ['فیت‌زون', 'جامعه‌ی ورزشکاران'],
]

const ART: Record<string, ReactNode> = {
  'فیت‌یاب': <Lifter size={80} />,
  'فیت‌یار': <Yoga size={74} />,
  'چالش‌ها': <Trophy size={76} />,
  'فیت‌زون': <Runner size={78} />,
}

const field = 'w-full rounded-2xl border border-transparent bg-white/[.07] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-brand-300/50'

export default function Login() {
  const users = useDB((s) => s.users)
  const nav = useNavigate()
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  // تا وقتی پیامک فعال نشده، ورود با ایمیل است
  const [channels, setChannels] = useState({ sms: !REMOTE, email: true })
  const [method, setMethod] = useState<'email' | 'sms'>('email')
  const byEmail = method === 'email'
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [hint, setHint] = useState('')
  const [demoUsers, setDemoUsers] = useState<{ id: string; name: string }[] | null>(REMOTE ? null : [])
  useEffect(() => {
    if (REMOTE)
      api<{ demo: boolean; demoUsers?: { id: string; name: string }[]; sms?: boolean; email?: boolean }>('/config')
        .then((c) => {
          setDemoUsers(c.demo ? c.demoUsers ?? [] : null)
          const ch = { sms: !!c.sms, email: c.email !== false }
          setChannels(ch)
          if (!ch.email && ch.sms) setMethod('sms')
        })
        .catch(() => setDemoUsers(null))
  }, [])
  const [f, setF] = useState<Form>({ phone: '', kind: 'athlete', referral: new URLSearchParams(location.search).get('ref') ?? '', name: '', gender: '' as RegisterInput['gender'], birthYear: '', heightCm: '', weightKg: '', goal: 'fit' as RegisterInput['goal'], activityLevel: 'medium' as RegisterInput['activityLevel'], track: true, ago: '', cycleLength: '28', periodLength: '5' })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const n = (v: string) => Number(faDigitsToEn(v)) || undefined

  const submit = async () => {
    if (step === 'phone') {
      if (byEmail ? !email.includes('@') : phone.replace(/\D/g, '').length < 10 && !/[۰-۹]{10}/.test(phone)) return
      setLoading(true)
      const r = await run(() => (byEmail ? requestEmailOtp(email) : requestOtp(phone)))
      setLoading(false)
      if (!r) return
      setOtp('')
      setHint(
        r.demo ? `در نسخه‌ی آزمایشی، کد ${DEMO_OTP} است.`
          : r.devCode ? `کد آزمایشی: ${r.devCode}`
            : byEmail ? 'کد ۶ رقمی به ایمیلتان فرستاده شد. اگر تا یک دقیقه نیامد، پوشه‌ی Spam را هم ببینید.'
              : 'کد ۴ رقمی به شماره‌ی شما پیامک شد.',
      )
      setStep('otp')
      return
    }
    setLoading(true)
    if (step === 'otp') {
      const r = await run(() => (byEmail ? verifyEmailOtp(email, otp) : verifyOtp(phone, otp)))
      if (r && !r.exists) setStep('profile')
    } else {
      const ph = byEmail ? { phone: f.phone } : {}
      if (f.kind !== 'athlete') {
        await run(() => registerUser({ ...ph, name: f.name, gender: '', accountType: f.kind as BusinessRole }))
        setLoading(false)
        return
      }
      const cycle = f.gender === 'female' && f.track && f.ago !== '' ? { lastPeriodStart: daysAgoKey(n(f.ago) ?? 0), cycleLength: n(f.cycleLength) ?? 28, periodLength: n(f.periodLength) ?? 5 } : undefined
      await run(() => registerUser({ ...ph, referral: f.referral || undefined, name: f.name, gender: f.gender, birthYear: n(f.birthYear), heightCm: n(f.heightCm), weightKg: n(f.weightKg), goal: f.goal, activityLevel: f.activityLevel, cycle }))
    }
    setLoading(false)
  }

  const demo = async (userId: string, role: Role) => {
    if (await runOk(() => loginAs(userId, role))) nav(ROLE_META[role].panel)
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink-950 text-white">
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[32rem] w-[32rem] rounded-full bg-brand-500/40 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[25%] h-[22rem] w-[22rem] rounded-full bg-aqua-400/25 blur-[110px]" />
      <div className="pointer-events-none absolute right-[10%] top-[20%] h-[14rem] w-[14rem] rounded-full bg-gold-300/20 blur-[100px]" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-14 px-6 py-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative animate-fade-up">
          <div className="pointer-events-none absolute -left-4 top-0 hidden sm:block">
            <Runner size={210} />
          </div>
          <div className="pointer-events-none absolute -left-2 top-2 sm:hidden">
            <Runner size={120} />
          </div>
          <Link to="/" className="inline-flex" aria-label="صفحه‌ی معرفی کی‌فیت">
            <Logo size={44} sub />
          </Link>
          <h1 className="mt-12 font-display text-[3.4rem] leading-[1.05] lg:text-[4.6rem]">
            یک عضویت،
            <br />
            <span className="bg-gradient-to-l from-brand-300 via-coral-300 to-gold-300 bg-clip-text text-transparent">تمام سلامتی تو</span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-8 text-white/65">
            ورود به باشگاه‌های منتخب بدون ثبت‌نام، برنامه از مربیان حرفه‌ای و دستیار هوشمند، ویزیت آنلاین، تغذیه‌ی سالم و چالش‌های جایزه‌دار — در یک اپلیکیشن.
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {FEATURES.map(([t, d]) => (
              <div key={t} className="lift-hover relative min-h-[8.5rem] overflow-hidden rounded-3xl bg-white/[.05] p-4 backdrop-blur">
                <div className="relative z-10 max-w-[70%] font-display text-2xl leading-none">{t}</div>
                <div className="relative z-10 mt-2 max-w-[70%] text-xs leading-6 text-white/55">{d}</div>
                <div className="absolute -bottom-2 -left-2">{ART[t]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-sheet-up rounded-[2.25rem] bg-ink-850/80 p-7 backdrop-blur-2xl lg:p-9">
          <h2 className="font-display text-[2.2rem] leading-none">{step === 'profile' ? 'ساخت پروفایل' : 'ورود یا ثبت‌نام'}</h2>
          <p className="mt-1 text-[13px] text-white/45">{step === 'profile' ? 'برنامه‌ها، پیشنهادها و چیدمان اپ بر اساس این اطلاعات شخصی‌سازی می‌شود' : byEmail ? 'با ایمیل خود ادامه دهید' : 'با شماره‌ی موبایل خود ادامه دهید'}</p>
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {step === 'phone' ? (
              <>
                <div className="grid grid-cols-2 gap-1 rounded-full bg-white/[.06] p-1" role="tablist" aria-label="روش ورود">
                  <button type="button" role="tab" aria-selected={byEmail} disabled={!channels.email} onClick={() => setMethod('email')} className={clsx('press flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold disabled:opacity-40', byEmail ? 'bg-white text-ink-950' : 'text-white/60')}>
                    <Mail size={15} /> ایمیل
                  </button>
                  <button type="button" role="tab" aria-selected={!byEmail} disabled={!channels.sms} onClick={() => setMethod('sms')} className={clsx('press flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold disabled:cursor-not-allowed', !byEmail ? 'bg-white text-ink-950' : 'text-white/60', !channels.sms && 'opacity-60')}>
                    <MessageSquare size={15} /> پیامک
                    {!channels.sms && <span className="rounded-full bg-lime-400 px-1.5 py-0.5 text-[12px] font-bold leading-none text-ink-950">به‌زودی</span>}
                  </button>
                </div>
                {byEmail ? (
                  <label className="block space-y-2">
                    <span className="text-xs text-white/50">ایمیل</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" dir="ltr" type="email" autoComplete="email" className={`${field} text-left`} inputMode="email" autoFocus />
                  </label>
                ) : (
                  <label className="block space-y-2">
                    <span className="text-xs text-white/50">شماره موبایل</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" dir="ltr" className={`${field} text-left tracking-wider`} inputMode="tel" autoFocus />
                  </label>
                )}
              </>
            ) : step === 'otp' ? (
              <label className="block space-y-2">
                <span className="text-xs text-white/50">کد تأیید ارسال‌شده به <span dir="ltr">{byEmail ? email.trim() : phone}</span></span>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder={byEmail ? '• • • • • •' : '• • • •'} dir="ltr" autoComplete="one-time-code" className={`${field} text-center text-xl ${byEmail ? 'tracking-[.6em]' : 'tracking-[1em]'}`} inputMode="numeric" maxLength={byEmail ? 6 : 4} autoFocus />
                <span className="block text-[12px] text-white/35">{hint}</span>
              </label>
            ) : (
              <Onboarding f={f} set={set} needPhone={byEmail} />
            )}
            <button type="submit" disabled={loading} className="card-lime press flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium text-ink-950 shadow-glow transition hover:brightness-105 disabled:opacity-50">
              {step === 'phone' ? 'دریافت کد تأیید' : step === 'otp' ? 'ورود' : 'ساخت حساب و شروع'}
              <ArrowLeft size={17} strokeWidth={1.5} />
            </button>
            {step !== 'phone' && (
              <button type="button" onClick={() => setStep('phone')} className="w-full text-center text-xs text-white/40 hover:text-white">
                {byEmail ? 'ویرایش ایمیل' : 'ویرایش شماره'}
              </button>
            )}
          </form>

          {demoUsers && (
          <div className="mt-10 border-t border-white/10 pt-6">
            <div className="mb-4 text-[12px] tracking-wide text-white/40">ورود سریع با حساب‌های نمایشی</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DEMOS.map((d) => {
                const u = REMOTE ? demoUsers.find((x) => x.id === d.userId) : users.find((x) => x.id === d.userId)
                if (!u) return null
                return (
                  <button
                    key={d.userId}
                    onClick={() => demo(d.userId, d.role)}
                    className="group rounded-2xl bg-white/[.05] p-3 text-right transition hover:bg-white/[.1]"
                  >
                    <RoleIcon role={d.role} size={16} className="text-aqua-300" />
                    <div className="mt-2 text-xs font-medium">{ROLE_META[d.role].label}</div>
                    <div className="truncate text-[12px] text-white/40">{u.name}</div>
                  </button>
                )
              })}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

type Form = {
  /** شماره‌ی موبایل در ثبت‌نام با ایمیل */
  phone: string
  /** نوع حساب: ورزشکار یا یکی از انواع کسب‌وکار */
  kind: 'athlete' | BusinessRole
  referral: string
  name: string
  gender: RegisterInput['gender']
  birthYear: string
  heightCm: string
  weightKg: string
  goal: RegisterInput['goal']
  activityLevel: RegisterInput['activityLevel']
  track: boolean
  ago: string
  cycleLength: string
  periodLength: string
}

const chip = (on: boolean) => clsx('rounded-full px-3.5 py-2 text-xs transition', on ? 'card-violet font-medium text-ink-950' : 'bg-white/[.07] text-white/65 hover:bg-white/[.12]')

function AccountKind({ f, set }: { f: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  const business = f.kind !== 'athlete'
  return (
    <div className="space-y-3">
      <span className="text-xs text-white/50">نوع حساب</span>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="نوع حساب">
        <button type="button" role="radio" aria-checked={!business} onClick={() => set('kind', 'athlete')} className={clsx(chip(!business), 'py-3 text-sm')}>
          ورزشکار
        </button>
        <button type="button" role="radio" aria-checked={business} onClick={() => !business && set('kind', 'gym')} className={clsx(chip(business), 'py-3 text-sm')}>
          کسب‌وکار
        </button>
      </div>
      {business && (
        <>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_ROLES.map((r) => (
              <button key={r} type="button" onClick={() => set('kind', r)} className={clsx(chip(f.kind === r), 'flex items-center gap-1.5')}>
                <RoleIcon role={r} size={14} /> {ROLE_META[r].label}
              </button>
            ))}
          </div>
          <p className="text-[12px] leading-6 text-white/40">
            حساب کسب‌وکار فقط پنل مدیریت {ROLE_META[f.kind as BusinessRole].label} (اطلاعات، سفارش‌ها و حسابداری) به‌علاوه‌ی فیت‌زون و چالش‌ها را دارد. برای استفاده‌ی شخصی از کی‌فیت، یک حساب ورزشکار با شماره‌ی دیگر بسازید.
          </p>
        </>
      )}
    </div>
  )
}

/** شماره‌ی موبایل در ثبت‌نام با ایمیل (بعداً با پیامک تأیید می‌شود) */
function PhoneField({ f, set }: { f: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs text-white/50">شماره موبایل <span className="text-coral-300">*</span></span>
      <input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" dir="ltr" autoComplete="tel" className={`${field} text-left tracking-wider`} inputMode="tel" />
      <span className="block text-[12px] leading-5 text-white/40">برای هماهنگی باشگاه‌ها و پشتیبانی. وقتی پیامک فعال شد، یک بار تأییدش می‌کنید.</span>
    </label>
  )
}

function Onboarding({ f, set, needPhone }: { f: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void; needPhone: boolean }) {
  if (f.kind !== 'athlete') {
    return (
      <div className="space-y-5 animate-fade-up">
        <AccountKind f={f} set={set} />
        {needPhone && <PhoneField f={f} set={set} />}
        <label className="block space-y-2">
          <span className="text-xs text-white/50">نام {f.kind === 'company' ? 'سازمان' : 'مجموعه یا کسب‌وکار'}</span>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="مثلاً باشگاه آیرون‌من" className={field} autoFocus />
        </label>
      </div>
    )
  }
  return (
    <div className="space-y-5 animate-fade-up">
      <AccountKind f={f} set={set} />
      {needPhone && <PhoneField f={f} set={set} />}
      <label className="block space-y-2">
        <span className="text-xs text-white/50">نام و نام خانوادگی</span>
        <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="مثلاً سارا محمدی" className={field} autoFocus />
      </label>
      <label className="block space-y-2">
        <span className="text-xs text-white/50">کد معرفی دوست (اختیاری)</span>
        <input value={f.referral} onChange={(e) => set('referral', e.target.value.toUpperCase())} placeholder="مثلاً SARA24" dir="ltr" className={`${field} text-left tracking-wider`} />
      </label>

      <div className="space-y-2">
        <span className="text-xs text-white/50">جنسیت <span className="text-coral-300">*</span></span>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="جنسیت">
          {([
            ['female', 'خانم', <Yoga key="f" size={78} />],
            ['male', 'آقا', <Runner key="m" size={78} male />],
          ] as const).map(([v, label, art]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={f.gender === v}
              onClick={() => set('gender', v)}
              className={clsx('relative flex h-28 items-end overflow-hidden rounded-3xl p-4 text-right transition', f.gender === v ? (v === 'female' ? 'grad-pink text-ink-950' : 'grad-mint text-ink-950') : 'bg-white/[.06] hover:bg-white/[.1]')}
            >
              <span className="relative z-10 font-display text-2xl leading-none">{label}</span>
              <span className="absolute -left-2 -top-1">{art}</span>
              {f.gender === v && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-ink-950 text-white">
                  <Check size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {([
          ['birthYear', 'سال تولد', '۱۳۷۵'],
          ['heightCm', 'قد (سانتی‌متر)', '۱۷۰'],
          ['weightKg', 'وزن (کیلوگرم)', '۶۵'],
        ] as const).map(([k, label, ph]) => (
          <label key={k} className="block space-y-2">
            <span className="text-[12px] text-white/50">{label}</span>
            <input value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} inputMode="numeric" className={`${field} text-center`} />
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <span className="text-xs text-white/50">هدف</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GOALS).map(([v, l]) => (
            <button key={v} type="button" onClick={() => set('goal', v as Form['goal'])} className={chip(f.goal === v)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs text-white/50">سطح فعالیت</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACTIVITY).map(([v, l]) => (
            <button key={v} type="button" onClick={() => set('activityLevel', v as Form['activityLevel'])} className={chip(f.activityLevel === v)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {f.gender === 'female' && (
        <div className="animate-fade-up rounded-3xl bg-coral-300/10 p-4">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">ردیاب چرخه‌ی قاعدگی</span>
              <span className="mt-0.5 flex items-center gap-1 text-[12px] text-white/50">
                <Lock size={11} /> کاملاً خصوصی؛ برای تنظیم شدت تمرین و تغذیه در هر فاز
              </span>
            </span>
            <input type="checkbox" checked={f.track} onChange={(e) => set('track', e.target.checked)} className="h-5 w-5 accent-coral-300" />
          </label>
          {f.track && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {([
                ['ago', 'آخرین پریود چند روز پیش شروع شد؟', '۳'],
                ['cycleLength', 'طول چرخه (روز)', '۲۸'],
                ['periodLength', 'طول پریود (روز)', '۵'],
              ] as const).map(([k, label, ph]) => (
                <label key={k} className="flex flex-col justify-end space-y-2">
                  <span className="text-[12px] leading-5 text-white/50">{label}</span>
                  <input value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} inputMode="numeric" className={`${field} text-center`} />
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
