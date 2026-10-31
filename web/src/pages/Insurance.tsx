import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CARE_KINDS } from '@/core/config'
import { FileText, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDate, num, toman } from '@/core/format'
import { CLAIM_STATUS, activePolicy, buyPolicy, cancelPolicy, submitClaim, usedCover } from '@/core/services/insurance'
import { Badge, Button, Card, Field, ImagePicker, Input, NumberInput, PageHeader, Progress, SectionTitle, Select, Sheet, Textarea } from '@/ui/kit'
import { HeartPulse } from '@/ui/art'
import { useMe, useBalance } from '@/ui/hooks'
import { runOk, ask } from '@/ui/toast'

const STATUS_COLOR = { submitted: 'sky', reviewing: 'amber', approved: 'emerald', rejected: 'rose', paid: 'emerald' } as const

/** بیمه‌ی حادثه‌ی ورزشی: خرید، بیمه‌نامه و اعلام خسارت */
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function Insurance() {
  const me = useMe()!
  const s = useDB((x) => x)
  const bal = useBalance(me.id)
  const policy = activePolicy(me.id, s)
  const plan = policy && s.insurancePlans.find((p) => p.id === policy.planId)
  const claims = s.claims.filter((c) => c.userId === me.id)
  const [buy, setBuy] = useState<string>()
  const [nid, setNid] = useState('')
  const [claim, setClaim] = useState(false)
  const [f, setF] = useState({ day: localDay(), sport: '', description: '', amount: 0, docs: [] as string[] })
  const used = policy ? usedCover(policy.id, s) : 0
  const [params, setParams] = useSearchParams()
  // پیش‌پر کردن پرونده از نوبت فیزیوتراپی/پزشک
  useEffect(() => {
    const a = s.appointments.find((x) => x.id === params.get('from') && x.userId === me.id && x.status === 'done')
    if (!a || !policy) return
    const kind = s.doctors.find((d) => d.userId === a.doctorId)?.kind ?? 'doctor'
    setF((x) => ({ ...x, day: a.at.slice(0, 10) > localDay() ? localDay() : a.at.slice(0, 10), description: `${CARE_KINDS[kind].label}: ${a.reason}${a.prescription ? `\nنظر درمانگر: ${a.prescription}` : ''}`.slice(0, 1400), amount: a.price }))
    setClaim(true)
    setParams({}, { replace: true })
  }, [params.get('from'), !!policy]) // eslint-disable-line react-hooks/exhaustive-deps
  const canCancel = policy && Date.now() - new Date(policy.startAt).getTime() < 14 * 86_400_000 && !claims.some((c) => c.policyId === policy.id)

  return (
    <div className="animate-fade-up">
      <PageHeader back title="بیمه‌ی ورزشی" subtitle="پوشش هزینه‌ی درمان حادثه‌های ورزشی، با همکاری بیمه‌گر طرف قرارداد" />

      {policy && plan ? (
        <div className="relative overflow-hidden rounded-[2rem] grad-mint p-6 text-ink-950">
          <HeartPulse size={96} className="pointer-events-none absolute -bottom-2 left-2 opacity-80" />
          <div className="relative max-w-[70%]">
            <div className="flex items-center gap-1.5 text-xs opacity-60"><ShieldCheck size={14} /> بیمه‌نامه‌ی فعال</div>
            <div className="mt-1 font-display text-[2rem] leading-none">بیمه‌ی {plan.name}</div>
            <div className="mt-2 text-xs opacity-70" dir="rtl">شماره: <span dir="ltr">{policy.number}</span> · تا {faDate(policy.endAt)}</div>
            <div className="mt-4 text-[12px] opacity-70">سقف درمان: {toman(plan.medicalCover)} · استفاده‌شده: {toman(used)}</div>
            <Progress value={used / plan.medicalCover} className="mt-1.5 !bg-white/50" />
          </div>
          <div className="relative mt-4 flex gap-2">
            <Button size="sm" variant="dark" icon={<Plus size={14} />} onClick={() => setClaim(true)}>اعلام خسارت</Button>
            {canCancel && <Button size="sm" variant="ghost" onClick={async () => (await ask('انصراف و بازگشت کامل حق بیمه؟')) && runOk(() => cancelPolicy(policy.id), 'بیمه‌نامه لغو و حق بیمه برگشت داده شد')}>انصراف</Button>}
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm leading-7 text-ink-500">در صورت آسیب‌دیدگی هنگام ورزش (در باشگاه، زمین، استخر یا بیرون)، هزینه‌ی درمان، فیزیوتراپی و غرامت نقص عضو تا سقف تعهد پرداخت و مستقیم به کیف پول کی‌فیت واریز می‌شود.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {s.insurancePlans.filter((p) => p.active).map((p) => (
              <Card key={p.id} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl">{p.name}</span>
                  <span className="text-sm font-semibold">{toman(p.price)} <span className="text-[12px] font-normal text-ink-400">/ سال</span></span>
                </div>
                <div className="mt-1 text-[12px] text-ink-400">{p.provider} · فرانشیز {num(p.deductiblePct)}٪</div>
                <ul className="mt-3 space-y-1 text-xs leading-6">
                  {p.perks.map((x) => <li key={x}>• {x}</li>)}
                </ul>
                <div className="mt-2 text-[12px] text-ink-500">رشته‌ها: {p.sports.join('، ')}</div>
                <Button className="mt-4 w-full" onClick={() => setBuy(p.id)}>خرید بیمه‌نامه</Button>
              </Card>
            ))}
          </div>
        </>
      )}

      {claims.length > 0 && (
        <>
          <SectionTitle title="پرونده‌های خسارت" />
          <div className="space-y-2">
            {claims.map((c) => (
              <Card key={c.id}>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-ink-400" />
                  <span className="text-sm font-medium">{c.sport}</span>
                  <span className="text-[12px] text-ink-400">{faDate(c.incidentAt)}</span>
                  <Badge color={STATUS_COLOR[c.status]} className="mr-auto">{CLAIM_STATUS[c.status]}</Badge>
                </div>
                <div className="mt-2 text-xs text-ink-500">{c.description}</div>
                <div className="mt-2 text-xs">درخواست: {toman(c.amount)}{c.approvedAmount ? ` · تأییدشده: ${toman(c.approvedAmount)}` : ''}</div>
                {c.note && <div className="mt-1 text-[12px] text-ink-400">نظر کارشناس: {c.note}</div>}
              </Card>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-center text-[12px] leading-5 text-ink-400">صدور بیمه‌نامه و پرداخت خسارت بر اساس شرایط عمومی بیمه‌ی حوادث بیمه‌گر طرف قرارداد است. کی‌فیت نماینده‌ی فروش و پیگیری است.</p>

      <Sheet open={!!buy} onClose={() => setBuy(undefined)} title="خرید بیمه‌نامه">
        {buy && (() => {
          const p = s.insurancePlans.find((x) => x.id === buy)!
          return (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">بیمه‌ی {p.name} — {toman(p.price)} برای یک سال. پرداخت از کیف پول (موجودی: {toman(bal)}).</p>
              <Field label="کد ملی بیمه‌شده"><Input value={nid} onChange={(e) => setNid(e.target.value)} inputMode="numeric" dir="ltr" placeholder="۰۰۱۲۳۴۵۶۷۸" /></Field>
              <Button className="w-full" disabled={bal < p.price} onClick={async () => { if (await runOk(() => buyPolicy(p.id, nid.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))), 'بیمه‌نامه صادر شد')) setBuy(undefined) }}>پرداخت و صدور</Button>
              <p className="text-center text-[12px] text-ink-400">تا ۱۴ روز پس از خرید (بدون خسارت) امکان انصراف با بازگشت کامل وجه.</p>
            </div>
          )
        })()}
      </Sheet>

      <Sheet open={claim} onClose={() => setClaim(false)} title="اعلام خسارت">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="تاریخ حادثه"><Input type="date" dir="ltr" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></Field>
            <Field label="رشته">
              <Select value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value })}>
                <option value="">انتخاب</option>
                {['بدنسازی', 'فیتنس', 'کراس‌فیت', 'دویدن', 'شنا', 'فوتبال', 'فوتسال', 'والیبال', 'رزمی', 'سوارکاری', 'یوگا', 'سایر'].map((x) => <option key={x}>{x}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="شرح حادثه و درمان"><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="کجا و چطور آسیب دیدید، چه درمانی انجام شد" /></Field>
          <Field label="مجموع هزینه‌ها (تومان)"><NumberInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} /></Field>
          <div>
            <div className="mb-2 text-xs text-ink-500">مدارک (فاکتور درمان، گزارش پزشک، تصویربرداری)</div>
            <div className="grid grid-cols-3 gap-2">
              {f.docs.map((d, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                  <img loading="lazy" decoding="async" src={d} alt="" className="h-full w-full object-cover" />
                  <button className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white" onClick={() => setF({ ...f, docs: f.docs.filter((_, j) => j !== i) })} aria-label="حذف"><Trash2 size={11} /></button>
                </div>
              ))}
            </div>
            <ImagePicker className="mt-2" onChange={(v) => v && setF({ ...f, docs: [...f.docs, v] })} label="افزودن مدرک" />
          </div>
          <Button className="w-full" onClick={async () => { if (policy && (await runOk(() => submitClaim({ policyId: policy.id, incidentAt: (f.day === localDay() ? new Date() : new Date(f.day + 'T12:00')).toISOString(), sport: f.sport, description: f.description, amount: f.amount, documents: f.docs }), 'پرونده ثبت شد و کارشناس بررسی می‌کند'))) setClaim(false) }}>ثبت پرونده</Button>
        </div>
      </Sheet>
    </div>
  )
}
