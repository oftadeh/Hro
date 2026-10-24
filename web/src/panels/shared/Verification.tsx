import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock3, FileText, Paperclip, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { openDoc, uploadDoc } from '@/core/client/remote'
import { ROLE_META } from '@/core/config'
import { faDateTime } from '@/core/format'
import { REQUIRED_DOCS, VERIFY_ROLES } from '@/core/roles'
import { submitVerification } from '@/core/services/auth'
import type { User, Verification } from '@/core/types'
import { Button, Card, Textarea } from '@/ui/kit'
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

/** صفحه‌ی بارگذاری مدارک؛ تا تأیید مدیر جایگزین پنل حساب کسب‌وکار است */
export function VerificationGate({ me }: { me: User }) {
  const v: Verification = me.verification ?? { status: 'none', docs: [] }
  const roles = me.roles.filter((r): r is (typeof VERIFY_ROLES)[number] => (VERIFY_ROLES as readonly string[]).includes(r))
  const required = [...new Set(roles.flatMap((r) => REQUIRED_DOCS[r]))]
  const [docs, setDocs] = useState<string[]>(v.status === 'rejected' ? [] : v.docs)
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const f of Array.from(files).slice(0, 6 - docs.length)) {
        const ref = await uploadDoc(f).catch((e: Error) => {
          toast.error(e.message)
          return null
        })
        if (ref) setDocs((d) => [...d, ref])
      }
    } finally {
      setUploading(false)
      if (input.current) input.current.value = ''
    }
  }

  const send = async () => {
    setSending(true)
    await run(() => submitVerification(docs, note), 'مدارک برای بررسی ارسال شد')
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

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300"><ShieldCheck size={30} strokeWidth={1.6} /></span>
        <h1 className="mt-4 text-[24px] font-extrabold">فعال‌سازی پنل {roles.map((r) => ROLE_META[r].label).join(' و ')}</h1>
        <p className="mt-2 text-[14px] leading-7 text-ink-500">برای اعتماد ورزشکاران، کی‌فیت مدارک همه‌ی باشگاه‌ها، مربی‌ها، پزشک‌ها و فروشنده‌ها را پیش از فعالیت بررسی می‌کند. مدارک شما فقط برای تیم بررسی کی‌فیت قابل مشاهده است.</p>
      </div>

      {v.status === 'rejected' && (
        <Card className="flex items-start gap-3 border border-coral-300/50 text-[14px] leading-7">
          <XCircle size={20} className="mt-1 shrink-0 text-coral-500" />
          <div><b>مدارک قبلی تأیید نشد.</b> {v.note ? `دلیل: ${v.note}` : ''} لطفاً مدارک اصلاح‌شده را دوباره بفرستید.</div>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="text-[15px] font-bold">مدارک لازم</h2>
        <ul className="space-y-1.5 text-[14px]">
          {required.map((r) => (
            <li key={r} className="flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0 text-ink-400" />{r}</li>
          ))}
        </ul>
        <p className="text-[12px] text-ink-500">تصویر واضح (JPG، PNG، WebP) یا PDF، هر فایل حداکثر ۵ مگابایت، حداکثر ۶ فایل.</p>
      </Card>

      <Card className="space-y-3">
        {docs.length > 0 && <DocList docs={docs} onRemove={(i) => setDocs((d) => d.filter((_, j) => j !== i))} />}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden onChange={(e) => add(e.target.files)} />
        {docs.length < 6 && (
          <Button variant="outline" className="w-full" loading={uploading} icon={<Paperclip size={17} />} onClick={() => input.current?.click()}>
            افزودن مدرک
          </Button>
        )}
        <Textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیح برای تیم بررسی (اختیاری): نام مجموعه، شماره پروانه و…" />
      </Card>

      <Button variant="dark" size="lg" className="w-full" disabled={!docs.length || uploading} loading={sending} onClick={send}>
        ارسال برای بررسی
      </Button>
    </div>
  )
}
