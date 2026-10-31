/**
 * اتصال ساعت هوشمند و داده‌های سلامت:
 *  - منابع: سنسور ضربان بلوتوث (در مرورگر)، فایل خروجی Apple Health / Samsung Health / Mi Fitness،
 *    و پل اپ موبایل (Health Connect / HealthKit) که همین سرویس را صدا می‌زند.
 *  - داده‌ی روزانه (قدم، خواب، ضربان استراحت) با دفترچه‌ی روزانه ادغام می‌شود؛ قدم دستگاه هرگز کم نمی‌شود.
 *  - قدم‌های دستگاه برای امروز در چالش‌های قدم با تأیید خودکار حساب می‌شود.
 */
import { AppError, mutate, currentUserId, svc } from '../store'
import { uid, now } from '../id'
import type { DeviceKind } from '../types'
import { completeMission } from './engagement'
import { autoProgress } from './challenges'
import { dayKey } from '../format'

export const DEVICE_LABEL: Record<DeviceKind, string> = {
  hr_monitor: 'سنسور ضربان قلب (بلوتوث)',
  watch: 'ساعت هوشمند',
  apple_health: 'Apple Health (آیفون)',
  health_connect: 'Health Connect (اندروید)',
  file: 'فایل خروجی اپ سلامت',
}

export interface DaySample {
  day: string
  steps?: number
  sleepHours?: number
  restingHr?: number
  activeMinutes?: number
}

const HISTORY_DAYS = 120

export const connectDevice = svc('device.connect', (kind: DeviceKind, name?: string) => {
  const me = currentUserId()
  if (!(kind in DEVICE_LABEL)) throw new AppError('نوع دستگاه معتبر نیست')
  let id = ''
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    const list = (u.devices ??= [])
    const same = list.find((x) => x.kind === kind && x.name === (name || DEVICE_LABEL[kind]))
    if (same) {
      id = same.id
      return
    }
    if (list.length >= 6) throw new AppError('حداکثر ۶ دستگاه')
    id = uid('dv-')
    list.push({ id, kind, name: String(name || DEVICE_LABEL[kind]).slice(0, 40), connectedAt: now() })
  })
  return id
})

export const disconnectDevice = svc('device.disconnect', (id: string) => {
  const me = currentUserId()
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    u.devices = (u.devices ?? []).filter((x) => x.id !== id)
  })
})

/** همگام‌سازی داده‌های روزانه؛ تعداد روزهای به‌روزشده را برمی‌گرداند */
export const syncHealthData = svc('device.sync', (deviceId: string, samples: DaySample[]) => {
  const me = currentUserId()
  if (!Array.isArray(samples) || !samples.length) throw new AppError('داده‌ای برای همگام‌سازی نیست')
  const today = dayKey()
  const oldest = new Date()
  oldest.setDate(oldest.getDate() - HISTORY_DAYS)
  const from = dayKey(oldest)
  const clean = samples
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s.day)) && s.day <= today && s.day >= from)
    .slice(-HISTORY_DAYS)
    .map((s) => ({
      day: s.day,
      steps: s.steps !== undefined && s.steps >= 0 && s.steps <= 100_000 ? Math.round(s.steps) : undefined,
      sleepHours: s.sleepHours !== undefined && s.sleepHours > 0 && s.sleepHours <= 16 ? Math.round(s.sleepHours * 10) / 10 : undefined,
      restingHr: s.restingHr !== undefined && s.restingHr >= 30 && s.restingHr <= 140 ? Math.round(s.restingHr) : undefined,
      activeMinutes: s.activeMinutes !== undefined && s.activeMinutes > 0 && s.activeMinutes <= 600 ? Math.round(s.activeMinutes) : undefined,
    }))
    .filter((s) => s.steps !== undefined || s.sleepHours !== undefined || s.restingHr !== undefined || s.activeMinutes !== undefined)
  if (!clean.length) throw new AppError('داده‌ی معتبری در فایل یا دستگاه پیدا نشد')
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    const dev = u.devices?.find((x) => x.id === deviceId)
    if (!dev) throw new AppError('ابتدا دستگاه را متصل کنید')
    dev.lastSyncAt = now()
    for (const s of clean) {
      let log = d.dailyLogs.find((l) => l.userId === me && l.day === s.day)
      // روزهای گذشته جعبه‌ی جایزه ندارند
      if (!log) d.dailyLogs.push((log = { userId: me, day: s.day, water: 0, steps: 0, workoutMinutes: 0, calories: 0, sleepHours: 0, missionsDone: [], rewardClaimed: s.day !== today }))
      if (s.steps !== undefined && s.steps > (log.stepsSource === 'device' ? log.steps : -1)) {
        const before = log.stepsSource === 'device' ? log.steps : 0
        log.steps = s.steps
        log.stepsSource = 'device'
        if (s.day === today && s.steps > before) autoProgress(d, me, 'steps', s.steps - before, 'device')
      }
      if (s.sleepHours !== undefined) log.sleepHours = s.sleepHours
      if (s.restingHr !== undefined) log.restingHr = s.restingHr
      if (s.activeMinutes !== undefined && s.activeMinutes > log.workoutMinutes) log.workoutMinutes = s.activeMinutes
      if (s.day === today) {
        if (log.steps >= 6000) completeMission(d, me, 'steps')
        if (log.workoutMinutes >= 20) completeMission(d, me, 'workout')
      }
    }
  })
  return clean.length
})
