/**
 * خواندن داده‌های سلامت در مرورگر:
 *  - خروجی Apple Health (export.xml داخل zip، یا خود فایل xml) به‌صورت جریانی و تکه‌تکه، حتی برای فایل‌های چندصد مگابایتی.
 *  - CSV عمومی (Samsung Health، Mi Fitness، Google Fit و…) با تشخیص خودکار ستون‌ها.
 *  - سنسور ضربان قلب بلوتوث (سرویس استاندارد heart_rate) با Web Bluetooth.
 * خروجی همه، نمونه‌های روزانه برای سرویس `device.sync` است.
 */
import type { DaySample } from '../services/devices'
import { dayKey, faDigitsToEn } from '../format'

const DAYS = 120

function cutoff() {
  const d = new Date()
  d.setDate(d.getDate() - DAYS)
  return dayKey(d)
}

type Acc = Map<string, { steps: Map<string, number>; sleep: Map<string, number>; hr: number[]; active: Map<string, number> }>
const slot = (acc: Acc, day: string) => {
  let v = acc.get(day)
  if (!v) acc.set(day, (v = { steps: new Map(), sleep: new Map(), hr: [], active: new Map() }))
  return v
}
const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1]
/** «2024-05-01 07:12:00 +0330» ← کلید روز محلی همان رکورد */
const dayOf = (s?: string) => s?.slice(0, 10)
const toDate = (s: string) => new Date(s.replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2'))

/** پردازش جریانی export.xml اپل */
export async function parseAppleHealth(file: File, onProgress?: (pct: number) => void): Promise<DaySample[]> {
  if (/\.zip$/i.test(file.name)) throw new Error('ابتدا فایل zip را باز کنید و فایل export.xml داخل آن را انتخاب کنید')
  const from = cutoff()
  const acc: Acc = new Map()
  const reader = file.stream().getReader()
  const dec = new TextDecoder()
  let buf = ''
  let read = 0
  const handle = (tag: string) => {
    const type = attr(tag, 'type')
    if (!type) return
    const start = attr(tag, 'startDate')
    const day = dayOf(start)
    if (!day || day < from) return
    const src = attr(tag, 'sourceName') ?? '?'
    const value = Number(attr(tag, 'value'))
    if (type === 'HKQuantityTypeIdentifierStepCount' && isFinite(value)) {
      const m = slot(acc, day).steps
      m.set(src, (m.get(src) ?? 0) + value)
    } else if (type === 'HKQuantityTypeIdentifierRestingHeartRate' && isFinite(value)) {
      slot(acc, day).hr.push(value)
    } else if (type === 'HKQuantityTypeIdentifierAppleExerciseTime' && isFinite(value)) {
      const m = slot(acc, day).active
      m.set(src, (m.get(src) ?? 0) + value)
    } else if (type === 'HKCategoryTypeIdentifierSleepAnalysis' && /Asleep/.test(attr(tag, 'value') ?? '')) {
      const end = attr(tag, 'endDate')
      if (!start || !end) return
      const h = (toDate(end).getTime() - toDate(start).getTime()) / 3_600_000
      // خواب شب به روز بیداری نسبت داده می‌شود
      const wake = dayOf(end)!
      if (h > 0 && h < 16) {
        const m = slot(acc, wake).sleep
        m.set(src, (m.get(src) ?? 0) + h)
      }
    }
  }
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    read += value.length
    buf += dec.decode(value, { stream: true })
    let i = 0
    for (;;) {
      const s = buf.indexOf('<Record ', i)
      if (s < 0) { buf = buf.slice(Math.max(i, buf.length - 20)); break }
      const e = buf.indexOf('>', s)
      if (e < 0) { buf = buf.slice(s); break }
      handle(buf.slice(s, e))
      i = e + 1
    }
    onProgress?.(Math.min(0.99, read / file.size))
  }
  onProgress?.(1)
  // آیفون و ساعت هر دو قدم می‌شمارند؛ برای جلوگیری از دوبار شمردن، بیشترین منبع هر روز ملاک است
  const max = (m: Map<string, number>) => (m.size ? Math.max(...m.values()) : undefined)
  return [...acc.entries()]
    .map(([day, v]) => ({
      day,
      steps: max(v.steps),
      sleepHours: max(v.sleep),
      restingHr: v.hr.length ? v.hr.reduce((a, b) => a + b, 0) / v.hr.length : undefined,
      activeMinutes: max(v.active),
    }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

/** CSV عمومی: ستون تاریخ و هر کدام از قدم / خواب / ضربان استراحت */
export async function parseHealthCsv(file: File): Promise<DaySample[]> {
  const text = faDigitsToEn(await file.text())
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) throw new Error('فایل خالی است')
  const sep = [',', ';', '\t'].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0]
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ''))
  const find = (re: RegExp) => head.findIndex((h) => re.test(h))
  const di = find(/date|day|time|تاریخ|روز/)
  const si = find(/step|قدم/)
  const sl = find(/sleep|خواب/)
  const hr = find(/rest.*(hr|heart)|resting|ضربان/)
  if (di < 0 || (si < 0 && sl < 0 && hr < 0)) throw new Error('ستون تاریخ و حداقل یکی از قدم، خواب یا ضربان پیدا نشد')
  const from = cutoff()
  const by = new Map<string, DaySample>()
  for (const line of lines.slice(1)) {
    const c = line.split(sep).map((x) => x.trim().replace(/"/g, ''))
    const raw = c[di]
    const d = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(raw) ? new Date(raw.slice(0, 10).replace(/\//g, '-')) : new Date(Number(raw) > 1e11 ? Number(raw) : raw)
    if (isNaN(d.getTime())) continue
    const day = dayKey(d)
    if (day < from) continue
    const s = by.get(day) ?? { day }
    const n = (i: number) => (i >= 0 && c[i] !== '' && isFinite(Number(c[i])) ? Number(c[i]) : undefined)
    if (n(si) !== undefined) s.steps = (s.steps ?? 0) + n(si)!
    if (n(sl) !== undefined) {
      const v = n(sl)!
      // ممکن است دقیقه باشد
      s.sleepHours = (s.sleepHours ?? 0) + (v > 24 ? v / 60 : v)
    }
    if (n(hr) !== undefined) s.restingHr = n(hr)
    by.set(day, s)
  }
  return [...by.values()].sort((a, b) => a.day.localeCompare(b.day))
}

/* ───────── سنسور ضربان بلوتوث ───────── */

interface BTChar { startNotifications(): Promise<BTChar>; addEventListener(t: string, f: (e: Event) => void): void; value?: DataView }
interface BTDevice { name?: string; gatt?: { connect(): Promise<{ getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<BTChar> }> }>; disconnect(): void }; addEventListener(t: string, f: () => void): void }

export const bluetoothSupported = () => typeof navigator !== 'undefined' && 'bluetooth' in navigator

/** اتصال به سنسور/ساعت با سرویس استاندارد ضربان قلب؛ تابع قطع اتصال را برمی‌گرداند */
export async function connectHeartRate(onBpm: (bpm: number) => void, onClose?: () => void): Promise<{ name: string; disconnect: () => void }> {
  if (!bluetoothSupported()) throw new Error('مرورگر شما بلوتوث را پشتیبانی نمی‌کند (کروم اندروید یا دسکتاپ لازم است)')
  const bt = (navigator as unknown as { bluetooth: { requestDevice(o: unknown): Promise<BTDevice> } }).bluetooth
  const device = await bt.requestDevice({ filters: [{ services: ['heart_rate'] }] })
  const server = await device.gatt!.connect()
  const svc = await server.getPrimaryService('heart_rate')
  const ch = await svc.getCharacteristic('heart_rate_measurement')
  await ch.startNotifications()
  ch.addEventListener('characteristicvaluechanged', (e) => {
    const v = (e.target as unknown as BTChar).value
    if (!v) return
    // بیت اول پرچم: مقدار ۸ یا ۱۶ بیتی
    const bpm = v.getUint8(0) & 1 ? v.getUint16(1, true) : v.getUint8(1)
    if (bpm > 0) onBpm(bpm)
  })
  device.addEventListener('gattserverdisconnected', () => onClose?.())
  return { name: device.name ?? 'سنسور ضربان', disconnect: () => device.gatt?.disconnect() }
}

/**
 * پل اپ موبایل: نسخه‌ی اندروید/iOS (Capacitor) داده‌های Health Connect یا HealthKit را
 * با `window.KeyFitHealth.sync(samples, 'health_connect' | 'apple_health')` به اپ می‌دهد.
 */
export function installNativeHealthBridge(sync: (kind: 'health_connect' | 'apple_health', samples: DaySample[]) => Promise<number>) {
  ;(window as unknown as { KeyFitHealth?: unknown }).KeyFitHealth = { sync: (samples: DaySample[], kind: 'health_connect' | 'apple_health' = 'health_connect') => sync(kind, samples) }
}
