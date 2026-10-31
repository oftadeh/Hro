import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock3, FileText, Paperclip, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { openDoc, uploadDoc } from '@/core/client/remote'
import { ROLE_META } from '@/core/config'
import { faDateTime } from '@/core/format'
import { type Requirement, VERIFY_ROLES, isNationalId, requirementsOf } from '@/core/roles'
import { submitVerification } from '@/core/services/auth'
import type { User, Verification } from '@/core/types'
import { Button, Card, Field, Input, Textarea } from '@/ui/kit'
import { run, toast } from '@/ui/toast'

const docLabel = (ref: string, i: number) => (ref.endsWith('.pdf') || ref.startsWith('data:application/pdf') ? `مدرک ${i + 1} (PDF)` : `مدرک ${i + 1} (تصویر)`)

export function DocList({ docs, onRemove }: { docs: string[]; onRemove?: (i: number) => void }) {
  return (
    <ul className="space-y-2">
      {docs.map((d, i) => (
        <li key={d.slice(0, 80) + i} className="flex items-center gap-3 rounded-2xl bg-ink-50 px-3 py-2.5 dark:bg-ink-800">
          <FileText size={18} className="shrink-0 text-ink-500" />
          <button type="button" className="min-w-0 flex-1 truncate text-start text-[14px] underline-offset-4 hover:underline" onClick={() => run(() => openDoc(d))}>
            {docLabel(d, i)}
          </button>
          {onRemove && (
            <button type="button" aria-label="حذف مدرک" onClick={() => onRemove(i)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700">
              <Trash2 size={16} />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

/** یک مدرک الزامی: بارگذاری، دیدن یا حذف فایل همان مدرک */
function DocSlot({ req, value, onChange }: { req: Requirement; value?: string; onChange: (ref?: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    const ref = await uploadDoc(file).catch((e: Error) => {
      toast.error(e.message)
      return null
    })
    setBusy(false)
    if (input.current) input.current.value = ''
    if (ref) onChange(ref)
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[14px] font-semibold">
        {value ? <CheckCircle2 size={16} className="shrink-0 text-aqua-500" /> : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-ink-300" />}
        {req.label}
      </div>
      {req.hint && <p className="text-[12px] text-ink-500">{req.hint}</p>}
      {value ? (
        <div className="flex items-center gap-3 rounded-2xl bg-ink-50 px-3 py-2 dark:bg-ink-800">
          <FileText size={18} className="shrink-0 text-ink-500" />
          <button type="button" className="min-w-0 flex-1 truncate text-start text-[13px] underline-offset-4 hover:underline" onClick={() => run(() => openDoc(value))}>{value.endsWith('.pdf') ? 'فایل PDF' : 'تصویر'} بارگذاری شد</button>
          <button type="button" aria-label={`حذف ${req.label}`} onClick={() => onChange(undefined)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700"><Trash2 size={16} /></button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full" loading={busy} icon={<Paperclip size={15} />} onClick={() => input.current?.click()}>بارگذاری</Button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  )
}

/** صفحه‌ی ارسال مدارک؛ تا تأیید مدیر جایگزین پنل حساب کسب‌وکار است */
export function VerificationGate({ me }: { me: User }) {
  const v: Verification = me.verification ?? { status: 'none', docs: [] }
  const roles = me.roles.filter((r): r is (typeof VERIFY_ROLES)[number] => (VERIFY_ROLES as readonly string[]).includes(r))
  const req = requirementsOf(me.roles)
  const [slots, setSlots] = useState<Record<string, string>>(v.slots ?? {})
  const [fields, setFields] = useState<Record<string, string>>(v.fields ?? {})
  const [note, setNote] = useState(v.note ?? '')
  const [declared, setDeclared] = useState(false)
  const [sending, setSending] = useState(false)

  const fieldError = (r: Requirement) => {
    const val = (fields[r.key] ?? '').trim()
    if (!val) return undefined
    if (r.key === 'nationalId') return isNationalId(val) ? undefined : 'کد ملی معتبر نیست'
    return val.length < 4 ? 'کامل وارد کنید' : undefined
  }
  const missing = [
    ...req.docs.filter((r) => !slots[r.key]).map((r) => r.label),
    ...req.fields.filter((r) => !(fields[r.key] ?? '').trim() || fieldError(r)).map((r) => r.label),
  ]

  const send = async () => {
    setSending(true)
    await run(() => submitVerification(slots, fields, note, declared), 'مدارک برای بررسی ارسال شد')
    setSending(false)
  }

  if (v.status === 'pending')
    return (
      <div className="mx-auto max-w-lg space-y-5 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-400/20 text-gold-600"><Clock3 size={30} strokeWidth={1.6} /></span>
        <div>
          <h1 className="text-[24px] font-extrabold">مدارک در حال بررسی است</h1>
          <p className="mt-2 text-[14px] leading-7 text-ink-500">{v.submittedAt ? `ارسال: ${faDateTime(v.submittedAt)}. ` : ''}بررسی معمولاً کمتر از یک روز کاری طول می‌کشد. نتیجه از طریق اعلان به شما خبر داده می‌شود.</p>
        </div>
        <Card className="text-start"><DocList docs={v.docs} /></Card>
        <p className="text-[13px] text-ink-500">تا آن زمان می‌توانید در <Link to="/fitzone" className="underline">فیت‌زون</Link> و <Link to="/challenges" className="underline">چالش‌ها</Link> فعالیت کنید.</p>
      </div>
    )

  if (v.status === 'rejected')
    return (
      <div className="mx-auto max-w-lg space-y-5 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral-500/15 text-coral-500"><XCircle size={30} strokeWidth={1.6} /></span>
        <div>
          <h1 className="text-[24px] font-extrabold">درخواست فعال‌سازی رد شد</h1>
          {v.adminNote && <p className="mt-2 text-[14px] leading-7">دلیل: {v.adminNote}</p>}
          <p className="mt-2 text-[14px] leading-7 text-ink-500">اگر فکر می‌کنید اشتباهی رخ داده، از بخش <Link to="/support" className="underline">پشتیبانی</Link> درخواست بررسی دوباره بدهید.</p>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300"><ShieldCheck size={30} strokeWidth={1.6} /></span>
        <h1 className="mt-4 text-[24px] font-extrabold">فعال‌سازی پنل {roles.map((r) => ROLE_META[r].label).join(' و ')}</h1>
        <p className="mt-2 text-[14px] leading-7 text-ink-500">برای اعتماد ورزشکاران، کی‌فیت مدارک همه‌ی باشگاه‌ها، مربی‌ها، پزشک‌ها، فروشنده‌ها و رستوران‌ها را پیش از فعالیت بررسی می‌کند. مدارک شما فقط برای تیم بررسی کی‌فیت قابل مشاهده است.</p>
      </div>

      {v.status === 'changes' && (
        <Card className="flex items-start gap-3 border border-gold-400/50 text-[14px] leading-7">
          <AlertCircle size={20} className="mt-1 shrink-0 text-gold-600" />
          <div><b>مدارک نیاز به اصلاح دارد.</b> {v.adminNote} — موارد را اصلاح و دوباره ارسال کنید.</div>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-[15px] font-bold">اطلاعات هویتی و مجوز</h2>
        {req.fields.map((r) => (
          <Field key={r.key} label={r.label} error={fieldError(r)}>
            <Input value={fields[r.key] ?? ''} onChange={(e) => setFields((x) => ({ ...x, [r.key]: e.target.value }))} dir="ltr" className="text-left" inputMode={r.key === 'nationalId' ? 'numeric' : undefined} maxLength={r.key === 'nationalId' ? 10 : 40} />
          </Field>
        ))}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-[15px] font-bold">مدارک لازم</h2>
        {req.docs.map((r) => (
          <DocSlot key={r.key} req={r} value={slots[r.key]} onChange={(ref) => setSlots((x) => { const n = { ...x }; if (ref) n[r.key] = ref; else delete n[r.key]; return n })} />
        ))}
        <p className="text-[12px] text-ink-500">تصویر واضح و خوانا (JPG، PNG، WebP) یا PDF، هر فایل حداکثر ۵ مگابایت.</p>
        <Textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیح برای تیم بررسی (اختیاری)" />
      </Card>

      <label className="flex items-start gap-2 text-[13px] leading-6">
        <input type="checkbox" className="mt-1" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
        <span>تأیید می‌کنم اطلاعات و مدارک ارسالی واقعی و متعلق به من یا مجموعه‌ی تحت مدیریت من است و مسئولیت صحت آن‌ها با من است. ارسال مدرک جعلی باعث مسدود شدن حساب می‌شود.</span>
      </label>

      {missing.length > 0 && <p className="text-[12px] leading-6 text-ink-500">باقی‌مانده: {missing.join('، ')}</p>}
      <Button variant="dark" size="lg" className="w-full" disabled={missing.length > 0 || !declared} loading={sending} onClick={send}>
        {v.status === 'changes' ? 'ارسال دوباره برای بررسی' : 'ارسال برای بررسی'}
      </Button>
    </div>
  )
}
