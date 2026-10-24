import { AppError, mutate, db, currentUserId, svc } from '../store'
import type { DBState } from '../state'
import { DAILY_MISSIONS, LEVELS, STREAK_BONUS_XP } from '../config'
import { dayKey } from '../format'
import type { DailyLog, ID } from '../types'
import { notify } from './ledger'

/** کلید هفته (شنبه‌ی هفته‌ی جاری) */
export function weekKey(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 1) % 7))
  return dayKey(x)
}

export const LEAGUES = [
  { id: 'bronze', name: 'برنز', min: 0, color: '#d39a72' },
  { id: 'silver', name: 'نقره', min: 300, color: '#c0c4d6' },
  { id: 'gold', name: 'طلا', min: 800, color: '#fcd679' },
  { id: 'diamond', name: 'الماس', min: 1500, color: '#5eead4' },
] as const

/** لیگ هفتگی بر اساس امتیاز همین هفته */
export function leagueOf(weekXp: number) {
  let cur: (typeof LEAGUES)[number] = LEAGUES[0]
  for (const l of LEAGUES) if (weekXp >= l.min) cur = l
  const next = LEAGUES.find((l) => l.min > weekXp)
  return { ...cur, next, progress: next ? (weekXp - cur.min) / (next.min - cur.min) : 1 }
}

export const weekXpOf = (u: { weekXp?: { week: string; xp: number } }) => (u.weekXp?.week === weekKey() ? u.weekXp.xp : 0)

export function levelOf(xp: number) {
  let cur = LEVELS[0]
  for (const l of LEVELS) if (xp >= l.xp) cur = l
  const next = LEVELS.find((l) => l.xp > xp)
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1
  return { ...cur, next, progress }
}

export function addXP(d: DBState, userId: ID, amount: number) {
  const u = d.users.find((x) => x.id === userId)
  if (!u) return
  const before = levelOf(u.xp).level
  u.xp += amount
  // امتیاز هفتگی برای لیگ
  const wk = weekKey()
  if (u.weekXp?.week !== wk) u.weekXp = { week: wk, xp: 0 }
  u.weekXp.xp += amount
  const after = levelOf(u.xp)
  if (after.level > before) notify(d, userId, `سطح جدید: ${after.title}`, `تبریک! به سطح ${after.level} رسیدی.`, '', '/profile')
}

function ensureLog(d: DBState, userId: ID): DailyLog {
  const day = dayKey()
  let log = d.dailyLogs.find((l) => l.userId === userId && l.day === day)
  if (!log) {
    log = { userId, day, water: 0, steps: 0, workoutMinutes: 0, calories: 0, sleepHours: 0, missionsDone: [], rewardClaimed: false }
    d.dailyLogs.push(log)
  }
  return log
}

export function getTodayLog(userId: ID): DailyLog {
  const day = dayKey()
  return (
    db().dailyLogs.find((l) => l.userId === userId && l.day === day) ?? {
      userId, day, water: 0, steps: 0, workoutMinutes: 0, calories: 0, sleepHours: 0, missionsDone: [], rewardClaimed: false,
    }
  )
}

/** هر بار که کاربر اپ را باز می‌کند؛ مدیریت «استریک» روزانه */
export function touchDailyFor(userId: ID) {
  const today = dayKey()
  const u = db().users.find((x) => x.id === userId)
  if (!u || u.lastActiveDay === today) return
  mutate((d) => {
    const user = d.users.find((x) => x.id === userId)!
    const y = new Date()
    y.setDate(y.getDate() - 1)
    user.streak = user.lastActiveDay === dayKey(y) ? user.streak + 1 : 1
    user.lastActiveDay = today
    addXP(d, userId, STREAK_BONUS_XP)
    ensureLog(d, userId)
    notify(d, userId, `استریک ${user.streak} روزه!`, `برای ورود امروز ${STREAK_BONUS_XP} امتیاز گرفتی. مأموریت‌های امروز منتظرتن.`, '', '/')
  })
}

export function completeMission(d: DBState, userId: ID, missionId: string) {
  const log = ensureLog(d, userId)
  if (log.missionsDone.includes(missionId)) return
  const m = DAILY_MISSIONS.find((x) => x.id === missionId)
  if (!m) return
  log.missionsDone.push(missionId)
  addXP(d, userId, m.xp)
}

const ACTIVITY_CAP = { water: 30, steps: 80_000, workoutMinutes: 600, calories: 10_000, sleepHours: 16 }

export const logActivity = svc('engagement.log', (kind: 'water' | 'steps' | 'workoutMinutes' | 'calories' | 'sleepHours', value: number) => {
  const userId = currentUserId()
  if (!(kind in ACTIVITY_CAP) || !isFinite(value)) throw new AppError('مقدار معتبر نیست')
  mutate((d) => {
    const log = ensureLog(d, userId)
    log[kind] = Math.min(ACTIVITY_CAP[kind], Math.max(0, log[kind] + value))
    if (log.water >= 8) completeMission(d, userId, 'water')
    if (log.steps >= 6000) completeMission(d, userId, 'steps')
    if (log.workoutMinutes >= 20) completeMission(d, userId, 'workout')
  })
})

export const claimDailyReward = svc('engagement.reward', () => {
  const userId = currentUserId()
  mutate((d) => {
    const log = ensureLog(d, userId)
    if (log.rewardClaimed || log.missionsDone.length < DAILY_MISSIONS.length) return
    log.rewardClaimed = true
    addXP(d, userId, 100)
    notify(d, userId, 'جعبه‌ی جایزه‌ی روزانه باز شد', '۱۰۰ امتیاز تجربه گرفتی. فردا هم بیا!', '')
  })
})

export const markNotificationsRead = svc('engagement.readAll', () => {
  const userId = currentUserId()
  mutate((d) => {
    d.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true
    })
  })
})

/** پاک کردن یک اعلان کاربر جاری */
export const deleteNotification = svc('engagement.deleteNotification', (id: ID) => {
  const userId = currentUserId()
  mutate((d) => {
    d.notifications = d.notifications.filter((n) => !(n.id === id && n.userId === userId))
  })
})

/** پاک کردن همه‌ی اعلان‌های کاربر جاری */
export const clearNotifications = svc('engagement.clearNotifications', () => {
  const userId = currentUserId()
  mutate((d) => {
    d.notifications = d.notifications.filter((n) => n.userId !== userId)
  })
})

export const touchDaily = svc('engagement.touch', () => touchDailyFor(currentUserId()))
