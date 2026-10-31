import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LocateFixed, MapPin, QrCode, Ticket as TicketIcon } from 'lucide-react'
import { faTime, toman } from '@/core/format'
import { ENTRY_RADIUS_M, scanEntry } from '@/core/services/fityab'
import { Button, Card, PageHeader } from '@/ui/kit'
import { QrScanner } from '@/ui/QrScanner'
import { run, toast } from '@/ui/toast'
import { celebrate, SuccessCheck } from '@/ui/motion'

type Done = Awaited<ReturnType<typeof scanEntry>>

/** خواندن QR ورودی باشگاه: نشانی https://…/scan?g=<id>&c=<code> یا KFGYM:<id>:<code> */
export function parseGymQr(raw: string): { g: string; c: string } | null {
  const v = raw.trim()
  const m = v.match(/^KFGYM:([^:]+):([A-Za-z0-9]+)$/)
  if (m) return { g: m[1], c: m[2] }
  try {
    const u = new URL(v)
    const g = u.searchParams.get('g')
    const c = u.searchParams.get('c')
    if (u.pathname.replace(/\/+$/, '').endsWith('/scan') && g && c) return { g, c }
  } catch {
    /* نشانی نیست */
  }
  return null
}

function locate(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند'))
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => rej(new Error(e.code === 1 ? 'برای ثبت ورود، اجازه‌ی دسترسی به موقعیت مکانی را بدهید' : 'موقعیت مکانی پیدا نشد؛ دوباره تلاش کنید')),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    )
  })
}

export default function Scan() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Done>()
  const started = useRef(false)

  const submit = useCallback(async (q: { g: string; c: string }) => {
    setScanning(false)
    setBusy(true)
    try {
      const pos = await locate().catch((e: Error) => {
        toast.error(e.message)
        return null
      })
      if (!pos) return
      const r = await run(() => scanEntry(q.g, q.c, pos.lat, pos.lng))
      if (r) {
        setDone(r)
        celebrate()
      }
    } finally {
      setBusy(false)
    }
  }, [])

  // اسکن با دوربین خود گوشی: نشانی مستقیم با پارامترها باز می‌شود
  useEffect(() => {
    const g = params.get('g')
    const c = params.get('c')
    if (g && c && !started.current) {
      started.current = true
      setParams({}, { replace: true })
      void submit({ g, c })
    }
  }, [params, setParams, submit])

  const onResult = useCallback(
    (text: string) => {
      const q = parseGymQr(text)
      if (!q) {
        setScanning(false)
        toast.error('این QR مربوط به ورود باشگاه نیست؛ کد نصب‌شده دم در پذیرش را اسکن کنید')
        return
      }
      void submit(q)
    },
    [submit],
  )

  if (done)
    return (
      <div className="mx-auto max-w-md animate-fade-up space-y-5 pt-6 text-center">
        <SuccessCheck size={96} className="mx-auto text-aqua-500 dark:text-aqua-300" />
        <div>
          <p className="text-[14px] text-ink-500">ورود ثبت شد · ساعت {faTime(done.at)}</p>
          <h1 className="mt-1 text-[26px] font-extrabold">{done.gymName}</h1>
        </div>
        <Card className="text-start text-[14px]">
          <div className="flex justify-between py-1"><span className="text-ink-500">مبلغ</span><span className="font-semibold">{toman(done.paid ?? 0)}</span></div>
          <div className="flex justify-between py-1"><span className="text-ink-500">پرداخت از</span><span className="font-semibold">{done.paidWith === 'wallet' ? 'کیف پول' : 'اعتبار اشتراک'}</span></div>
        </Card>
        <p className="text-[13px] text-ink-500">این صفحه را در صورت درخواست به پذیرش نشان بده.</p>
        <div className="flex gap-2.5">
          <Button variant="dark" size="lg" className="flex-1" onClick={() => nav('/tickets')} icon={<TicketIcon size={18} />}>بلیت‌های من</Button>
          <Button variant="outline" size="lg" className="flex-1" onClick={() => nav('/')}>خانه</Button>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-md animate-fade-up space-y-5">
      <PageHeader title="ورود به باشگاه" subtitle="QR نصب‌شده دم در پذیرش را اسکن کن" />

      <Card className="overflow-hidden p-0">
        {scanning ? (
          <div className="aspect-square w-full bg-black">
            <QrScanner active={scanning} onResult={onResult} />
          </div>
        ) : (
          <button onClick={() => setScanning(true)} disabled={busy} className="flex aspect-square w-full flex-col items-center justify-center gap-4 disabled:opacity-60">
            <span className="relative flex h-40 w-40 items-center justify-center">
              {['right-0 top-0 rounded-tr-md border-r-[3px] border-t-[3px]', 'left-0 top-0 rounded-tl-md border-l-[3px] border-t-[3px]', 'bottom-0 right-0 rounded-br-md border-b-[3px] border-r-[3px]', 'bottom-0 left-0 rounded-bl-md border-b-[3px] border-l-[3px]'].map((c) => (
                <span key={c} className={`absolute h-8 w-8 border-ink-950 dark:border-white ${c}`} />
              ))}
              {busy ? <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /> : <QrCode size={64} strokeWidth={1.2} />}
            </span>
            <span className="text-[16px] font-bold">{busy ? 'در حال ثبت ورود…' : 'باز کردن دوربین'}</span>
          </button>
        )}
      </Card>

      <ol className="space-y-2.5 text-[14px]">
        <li className="flex items-start gap-3"><QrCode size={18} className="mt-0.5 shrink-0 text-ink-500" />QR کی‌فیت را که باشگاه دم در پذیرش نصب کرده اسکن کن.</li>
        <li className="flex items-start gap-3"><LocateFixed size={18} className="mt-0.5 shrink-0 text-ink-500" />موقعیت مکانی‌ات بررسی می‌شود؛ باید کمتر از {ENTRY_RADIUS_M.toLocaleString('fa-IR')} متر با باشگاه فاصله داشته باشی.</li>
        <li className="flex items-start gap-3"><TicketIcon size={18} className="mt-0.5 shrink-0 text-ink-500" />اگر بلیت یا رزرو امروز داری همان استفاده می‌شود؛ وگرنه هزینه‌ی یک جلسه از اشتراک یا کیف پول کم می‌شود.</li>
      </ol>

      <Link to="/fityab" className="flex items-center justify-center gap-2 text-[14px] text-ink-500 hover:text-ink-950 dark:hover:text-white">
        <MapPin size={16} /> پیدا کردن باشگاه‌های اطراف
      </Link>
    </div>
  )
}
