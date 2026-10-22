import { useState } from 'react'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useDB } from '@/core/db'
import { ROLE_META } from '@/core/config'
import { loginAs, loginWithOtp, DEMO_OTP } from '@/core/services/auth'
import type { Role } from '@/core/types'
import { Button, Field, Input } from '@/ui/kit'
import { run } from '@/ui/toast'
import { Logo } from '@/layouts/Logo'
import { useNavigate } from 'react-router-dom'

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
  ['📍', 'فیت‌یاب', 'ورود بدون ثبت‌نام به باشگاه‌ها'],
  ['🤖', 'فیت‌یار', 'مشاور هوشمند و مربیان حرفه‌ای'],
  ['🏆', 'چالش‌ها', 'رقابت کن، جایزه ببر'],
  ['📸', 'فیت‌زون', 'شبکه اجتماعی ورزشکاران'],
]

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
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-ink-850 via-ink-900 to-ink-950 text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2">
        <div className="animate-fade-up">
          <Logo size={48} />
          <h1 className="mt-8 text-4xl font-black leading-tight lg:text-5xl">
            یک کلید،
            <br />
            <span className="bg-gradient-to-l from-gold-300 via-gold-400 to-brand-400 bg-clip-text text-transparent">همه‌ی دنیای سلامتی</span>
          </h1>
          <p className="mt-4 max-w-md text-ink-300">
            با یک اشتراک وارد ده‌ها باشگاه شو، از هوش مصنوعی و مربی برنامه بگیر، در چالش‌ها جایزه ببر و غذای رژیمی سفارش بده.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
            {FEATURES.map(([icon, t, d]) => (
              <div key={t} className="rounded-[1.4rem] border border-white/10 bg-white/[.06] p-3 backdrop-blur">
                <div className="text-2xl">{icon}</div>
                <div className="mt-1 text-sm font-bold">{t}</div>
                <div className="text-[11px] text-ink-400">{d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-sheet-up rounded-[2.25rem] border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur-2xl lg:p-8">
          <div className="mx-auto -mt-2 mb-4 h-1.5 w-11 rounded-full bg-white/20" />
          <h2 className="text-xl font-extrabold">ورود / ثبت‌نام</h2>
          <p className="mt-1 text-sm text-ink-400">با شماره موبایل وارد شو</p>
          <form
            className="mt-6 space-y-4 [&_input]:border-white/10 [&_input]:bg-white/5 [&_input]:text-white [&_span]:text-ink-300"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {step === 'phone' ? (
              <>
                <Field label="شماره موبایل">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" className="text-left" inputMode="tel" autoFocus />
                </Field>
                <Field label="نام و نام خانوادگی (برای ثبت‌نام)">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اختیاری" />
                </Field>
              </>
            ) : (
              <Field label={`کد تایید ارسال‌شده به ${phone}`} hint={`در نسخه‌ی آزمایشی کد ${DEMO_OTP} است`}>
                <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="- - - -" dir="ltr" className="text-center text-xl tracking-[1em]" inputMode="numeric" maxLength={4} autoFocus />
              </Field>
            )}
            <Button type="submit" size="lg" className="w-full !from-gold-300 !via-gold-400 !to-gold-600 !text-ink-950 !shadow-gold" loading={loading} icon={<ArrowLeft size={18} />}>
              {step === 'phone' ? 'دریافت کد تایید' : 'ورود به کی‌فیت'}
            </Button>
            {step === 'otp' && (
              <button type="button" onClick={() => setStep('phone')} className="w-full text-center text-xs text-ink-400">
                ویرایش شماره
              </button>
            )}
          </form>

          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink-400">
              <Sparkles size={14} /> ورود سریع با حساب‌های نمایشی
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DEMOS.map((d) => {
                const u = users.find((x) => x.id === d.userId)
                if (!u) return null
                const meta = ROLE_META[d.role]
                return (
                  <button
                    key={d.userId}
                    onClick={() => demo(d.userId, d.role)}
                    className="group rounded-[1.4rem] border border-white/10 bg-white/[.05] p-3 text-right transition hover:-translate-y-0.5 hover:border-gold-400/40 hover:bg-white/10"
                  >
                    <div className={`mb-2 inline-flex rounded-[.8rem] bg-gradient-to-br ${meta.color} p-1.5 text-lg shadow-soft`}>{meta.icon}</div>
                    <div className="text-xs font-bold">{meta.label}</div>
                    <div className="truncate text-[11px] text-ink-400">{u.name}</div>
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
