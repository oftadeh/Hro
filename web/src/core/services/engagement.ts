import { mutate, db, currentUserId, type DBState } from '../db'
import { DAILY_MISSIONS, LEVELS, STREAK_BONUS_XP } from '../config'
import { dayKey } from '../format'
import type { DailyLog, ID } from '../types'
import { notify } from './ledger'

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
export function touchDaily(userId: ID) {
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

export function logActivity(kind: 'water' | 'steps' | 'workoutMinutes' | 'calories' | 'sleepHours', value: number) {
  const userId = currentUserId()
  mutate((d) => {
    const log = ensureLog(d, userId)
    log[kind] = Math.max(0, log[kind] + value)
    if (log.water >= 8) completeMission(d, userId, 'water')
    if (log.steps >= 6000) completeMission(d, userId, 'steps')
    if (log.workoutMinutes >= 20) completeMission(d, userId, 'workout')
  })
}

export function claimDailyReward() {
  const userId = currentUserId()
  mutate((d) => {
    const log = ensureLog(d, userId)
    if (log.rewardClaimed || log.missionsDone.length < DAILY_MISSIONS.length) return
    log.rewardClaimed = true
    addXP(d, userId, 100)
    notify(d, userId, 'جعبه‌ی جایزه‌ی روزانه باز شد', '۱۰۰ امتیاز تجربه گرفتی. فردا هم بیا!', '')
  })
}

export function markNotificationsRead() {
  const userId = currentUserId()
  mutate((d) => {
    d.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true
    })
  })
}
