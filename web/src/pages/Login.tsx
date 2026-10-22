import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useDB } from '@/core/db'
import { ROLE_META } from '@/core/config'
import { loginAs, loginWithOtp, DEMO_OTP } from '@/core/services/auth'
import type { Role } from '@/core/types'
import { run } from '@/ui/toast'
import { RoleIcon } from '@/ui/icons'
import { Runner, Lifter, Yoga, Trophy } from '@/ui/art'

const DEMOS: { userId: string; role: Role }[] = [
  { userId: 'u-sara', role: 'user' },
  { userId: 'u-ali', role: 'gym' },
  { userId: 'u-coach1', role: 'coach' },
  { userId: 'u-seller', role: 'seller' },
  { userId: 'u-doctor', role: 'doctor' },
  { userId: 'u-rest', role: 'restaurant' },
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
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (step === 'phone') {
      if (phone.replace(/\D/g, '').length < 10 && !/[۰-۹]{10}/.test(phone)) return
      setStep('otp')
      return
    }
    setLoading(true)
    await run(() => loginWithOtp(phone, otp, name))
    setLoading(false)
  }

  const demo = (userId: string, role: Role) => {
    loginAs(userId, role)
    nav(ROLE_META[role].panel)
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
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" width={44} height={44} alt="" className="rounded-2xl" />
            <div className="font-display text-3xl">کی‌فیت</div>
          </div>
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
          <h2 className="font-display text-[2.2rem] leading-none">ورود یا ثبت‌نام</h2>
          <p className="mt-1 text-[13px] text-white/45">با شماره‌ی موبایل خود ادامه دهید</p>
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {step === 'phone' ? (
              <>
                <label className="block space-y-2">
                  <span className="text-xs text-white/50">شماره موبایل</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" dir="ltr" className={`${field} text-left tracking-wider`} inputMode="tel" autoFocus />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs text-white/50">نام و نام خانوادگی (برای ثبت‌نام)</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اختیاری" className={field} />
                </label>
              </>
            ) : (
              <label className="block space-y-2">
                <span className="text-xs text-white/50">کد تأیید ارسال‌شده به {phone}</span>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="• • • •" dir="ltr" className={`${field} text-center text-xl tracking-[1em]`} inputMode="numeric" maxLength={4} autoFocus />
                <span className="block text-[11px] text-white/35">در نسخه‌ی آزمایشی، کد {DEMO_OTP} است.</span>
              </label>
            )}
            <button type="submit" disabled={loading} className="grad-lavender flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium text-ink-950 shadow-glow transition hover:brightness-105 disabled:opacity-50">
              {step === 'phone' ? 'دریافت کد تأیید' : 'ورود'}
              <ArrowLeft size={17} strokeWidth={1.5} />
            </button>
            {step === 'otp' && (
              <button type="button" onClick={() => setStep('phone')} className="w-full text-center text-xs text-white/40 hover:text-white">
                ویرایش شماره
              </button>
            )}
          </form>

          <div className="mt-10 border-t border-white/10 pt-6">
            <div className="mb-4 text-[11px] tracking-wide text-white/40">ورود سریع با حساب‌های نمایشی</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DEMOS.map((d) => {
                const u = users.find((x) => x.id === d.userId)
                if (!u) return null
                return (
                  <button
                    key={d.userId}
                    onClick={() => demo(d.userId, d.role)}
                    className="group rounded-2xl bg-white/[.05] p-3 text-right transition hover:bg-white/[.1]"
                  >
                    <RoleIcon role={d.role} size={16} className="text-aqua-300" />
                    <div className="mt-2 text-xs font-medium">{ROLE_META[d.role].label}</div>
                    <div className="truncate text-[11px] text-white/40">{u.name}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
