import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useDB } from '@/core/db'
import { ROLE_META } from '@/core/config'
import { loginAs, loginWithOtp, DEMO_OTP } from '@/core/services/auth'
import type { Role } from '@/core/types'
import { run } from '@/ui/toast'
import { RoleIcon } from '@/ui/icons'

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

const field = 'w-full rounded-xl border border-white/10 bg-white/[.03] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-brand-300/60'

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
      <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-400/[.12] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[.04] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px)] [background-size:72px_100%]" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-14 px-6 py-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="animate-fade-up">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" width={40} height={40} alt="" className="rounded-xl ring-1 ring-white/10" />
            <div className="text-[11px] tracking-[.35em] text-white/40">KEYFIT</div>
          </div>
          <h1 className="mt-12 text-[2.6rem] font-extralight leading-[1.35] tracking-tight lg:text-[3.4rem]">
            یک عضویت،
            <br />
            <span className="text-brand-300">تمام سلامتی شما.</span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-8 text-white/55">
            ورود به باشگاه‌های منتخب بدون ثبت‌نام، برنامه از مربیان حرفه‌ای و دستیار هوشمند، ویزیت آنلاین، تغذیه‌ی سالم و چالش‌های جایزه‌دار — در یک اپلیکیشن.
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 border-t border-white/10 pt-8">
            {FEATURES.map(([t, d]) => (
              <div key={t}>
                <div className="text-sm font-medium">{t}</div>
                <div className="mt-1 text-xs leading-6 text-white/45">{d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-sheet-up rounded-3xl border border-white/10 bg-white/[.03] p-7 backdrop-blur-xl lg:p-9">
          <h2 className="text-xl font-light">ورود یا ثبت‌نام</h2>
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
            <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-300 text-[15px] font-medium text-ink-950 transition hover:bg-brand-200 disabled:opacity-50">
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
                    className="group rounded-xl border border-white/[.08] p-3 text-right transition hover:border-brand-300/40 hover:bg-white/[.03]"
                  >
                    <RoleIcon role={d.role} size={16} className="text-brand-300" />
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
