import { useRef, useState } from 'react'
import { Apple, Bluetooth, FileSpreadsheet, HeartPulse, RefreshCw, Smartphone, Trash2, Watch } from 'lucide-react'
import { useDB } from '@/core/db'
import { dayKey, faDateTime, num, timeAgo } from '@/core/format'
import { DEVICE_LABEL, connectDevice, disconnectDevice, syncHealthData, type DaySample } from '@/core/services/devices'
import { bluetoothSupported, connectHeartRate, parseAppleHealth, parseHealthCsv } from '@/core/client/health'
import type { DeviceKind } from '@/core/types'
import { Badge, Button, Card, IconTile, PageHeader, Progress, SectionTitle } from '@/ui/kit'
import { WeekBars } from '@/ui/WeekBars'
import { useMe } from '@/ui/hooks'
import { run, toast } from '@/ui/toast'

const ICON: Record<DeviceKind, typeof Watch> = { hr_monitor: HeartPulse, watch: Watch, apple_health: Apple, health_connect: Smartphone, file: FileSpreadsheet }

/** ساعت هوشمند و داده‌های سلامت */
export default function Devices() {
  const me = useMe()!
  const logs = useDB((s) => s.dailyLogs)
  const devices = me.devices ?? []
  const apple = useRef<HTMLInputElement>(null)
  const csv = useRef<HTMLInputElement>(null)
  const [pct, setPct] = useState<number>()
  const [bpm, setBpm] = useState<number>()
  const [hr, setHr] = useState<{ name: string; disconnect: () => void }>()

  const week = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const l = logs.find((x) => x.userId === me.id && x.day === dayKey(d))
    return { label: d.toLocaleDateString('fa-IR', { weekday: 'narrow' }), value: l?.steps ?? 0, today: i === 6, device: l?.stepsSource === 'device', sleep: l?.sleepHours ?? 0, rhr: l?.restingHr }
  })
  const lastRhr = [...week].reverse().find((w) => w.rhr)?.rhr

  const importFile = async (kind: 'apple_health' | 'file', file?: File) => {
    if (!file) return
    try {
      setPct(0)
      const samples: DaySample[] = kind === 'apple_health' ? await parseAppleHealth(file, setPct) : await parseHealthCsv(file)
      if (!samples.length) throw new Error('داده‌ای در ۱۲۰ روز اخیر پیدا نشد')
      const id = await connectDevice(kind, kind === 'apple_health' ? 'Apple Health' : file.name.slice(0, 40))
      const n = await syncHealthData(id, samples)
      toast.success(`${num(n)} روز داده همگام شد`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setPct(undefined)
    }
  }

  const startHr = async () => {
    try {
      const c = await connectHeartRate(setBpm, () => { setHr(undefined); setBpm(undefined) })
      setHr(c)
      await connectDevice('hr_monitor', c.name)
    } catch (e) {
      if ((e as Error).name !== 'NotFoundError') toast.error((e as Error).message)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader back title="ساعت و دستگاه‌ها" subtitle="قدم، خواب و ضربان قلب خودکار؛ چالش‌های قدم بدون ثبت دستی" />

      <Card>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">قدم‌های ۷ روز اخیر</span>
          {lastRhr && <Badge color="rose"><HeartPulse size={12} /> ضربان استراحت {num(lastRhr)}</Badge>}
        </div>
        <WeekBars data={week} unit="قدم" />
        <div className="mt-2 text-[11px] text-ink-400">ستون‌های ثبت‌شده از دستگاه در چالش‌های قدمِ «تأیید خودکار» حساب می‌شوند.</div>
      </Card>

      {pct !== undefined && (
        <Card className="mt-3">
          <div className="mb-2 text-xs">در حال خواندن فایل… {num(Math.round(pct * 100))}٪</div>
          <Progress value={pct} />
        </Card>
      )}

      <SectionTitle title="اتصال جدید" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex items-start gap-3">
          <IconTile tone="violet"><Apple size={20} /></IconTile>
          <div className="flex-1">
            <div className="text-sm font-semibold">آیفون و Apple Watch</div>
            <p className="mt-1 text-[11px] leading-5 text-ink-500">در اپ Health روی عکس پروفایل بزنید ← «Export All Health Data». فایل zip را باز کنید و export.xml را انتخاب کنید.</p>
            <Button size="sm" className="mt-2" variant="secondary" onClick={() => apple.current?.click()}>انتخاب export.xml</Button>
            <input ref={apple} type="file" accept=".xml,text/xml,application/xml" hidden onChange={(e) => { importFile('apple_health', e.target.files?.[0]); e.target.value = '' }} />
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <IconTile tone="emerald"><FileSpreadsheet size={20} /></IconTile>
          <div className="flex-1">
            <div className="text-sm font-semibold">سامسونگ، شیائومی، Google Fit و…</div>
            <p className="mt-1 text-[11px] leading-5 text-ink-500">خروجی CSV اپ سلامت را بدهید؛ ستون تاریخ و قدم/خواب/ضربان خودکار پیدا می‌شود.</p>
            <Button size="sm" className="mt-2" variant="secondary" onClick={() => csv.current?.click()}>انتخاب فایل CSV</Button>
            <input ref={csv} type="file" accept=".csv,text/csv" hidden onChange={(e) => { importFile('file', e.target.files?.[0]); e.target.value = '' }} />
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <IconTile tone="rose"><Bluetooth size={20} /></IconTile>
          <div className="flex-1">
            <div className="text-sm font-semibold">سنسور ضربان قلب (بلوتوث)</div>
            <p className="mt-1 text-[11px] leading-5 text-ink-500">کمربند سینه‌ای یا ساعتی که ضربان را پخش می‌کند (Polar، Garmin، Coospo…). در «تمرین‌ها» هنگام ثبت تمرین، میانگین و بیشینه‌ی ضربان ذخیره می‌شود.</p>
            {hr ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="font-display text-3xl tabular-nums">{bpm ? num(bpm) : '—'}</span><span className="text-xs text-ink-500">ضربان در دقیقه · {hr.name}</span>
                <Button size="sm" variant="ghost" onClick={() => hr.disconnect()}>قطع</Button>
              </div>
            ) : (
              <Button size="sm" className="mt-2" variant="secondary" disabled={!bluetoothSupported()} onClick={startHr}>{bluetoothSupported() ? 'اتصال و آزمایش' : 'این مرورگر بلوتوث ندارد'}</Button>
            )}
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <IconTile tone="sky"><Smartphone size={20} /></IconTile>
          <div className="flex-1">
            <div className="text-sm font-semibold">همگام‌سازی خودکار (اپ موبایل)</div>
            <p className="mt-1 text-[11px] leading-5 text-ink-500">در نسخه‌ی اپ اندروید و iOS، داده‌ها از Health Connect و Apple Health به‌صورت خودکار و روزانه همگام می‌شوند.</p>
          </div>
        </Card>
      </div>

      <SectionTitle title="دستگاه‌های متصل" />
      {devices.length === 0 && <div className="rounded-2xl bg-ink-900/[.04] p-4 text-sm text-ink-500 dark:bg-white/5">هنوز دستگاهی متصل نشده است.</div>}
      <div className="space-y-2">
        {devices.map((d) => {
          const Icon = ICON[d.kind]
          return (
            <Card key={d.id} className="flex items-center gap-3">
              <IconTile tone="violet" size={36}><Icon size={17} /></IconTile>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{d.name}</div>
                <div className="text-[11px] text-ink-500">{DEVICE_LABEL[d.kind]} · {d.lastSyncAt ? `آخرین همگام‌سازی ${timeAgo(d.lastSyncAt)}` : `متصل از ${faDateTime(d.connectedAt)}`}</div>
              </div>
              {(d.kind === 'apple_health' || d.kind === 'file') && <button className="p-2 text-ink-400" aria-label="همگام‌سازی دوباره" onClick={() => (d.kind === 'apple_health' ? apple : csv).current?.click()}><RefreshCw size={15} /></button>}
              <button className="p-2 text-ink-400" aria-label="حذف" onClick={() => confirm('اتصال حذف شود؟ داده‌های ثبت‌شده باقی می‌مانند.') && run(() => disconnectDevice(d.id))}><Trash2 size={15} /></button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
