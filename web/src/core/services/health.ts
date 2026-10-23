/**
 * سلامت روزانه: ثبت تمرین، کالری‌شمار، اندازه‌های بدن، اشتراک پرونده‌ی سلامت با مربی/پزشک
 * و «نمره‌ی سلامت» روزانه که فعالیت، آب، خواب، تغذیه و (برای بانوان) فاز چرخه را ترکیب می‌کند.
 */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import type { DBState } from '../state'
import { uid, now } from '../id'
import type { BodyEntry, ID, MealLog, User, WorkoutSession } from '../types'
import { dayKey } from '../format'
import { EXERCISES, FOOD_DB, exerciseById } from '../catalog'
import { addXP, completeMission } from './engagement'
import { autoProgress } from './challenges'
import { notify } from './ledger'
import { bodyOf } from '../profile'
import { cycleStatusIn } from './cycle'

const validDay = (day: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new AppError('تاریخ معتبر نیست')
  if (day > dayKey()) throw new AppError('تاریخ نمی‌تواند در آینده باشد')
}

/* ───────── تمرین ───────── */

export const logWorkout = svc('health.workout', (input: Omit<WorkoutSession, 'id' | 'userId' | 'createdAt'>) => {
  const me = currentUserId()
  const day = input.day || dayKey()
  validDay(day)
  const exercises = (input.exercises ?? [])
    .filter((e) => exerciseById(e.exerciseId))
    .slice(0, 20)
    .map((e) => ({ exerciseId: e.exerciseId, sets: (e.sets ?? []).slice(0, 15).map((s) => ({ reps: Math.min(500, Math.max(0, Math.round(s.reps))), weight: Math.min(500, Math.max(0, Number(s.weight) || 0)) })).filter((s) => s.reps > 0) }))
    .filter((e) => e.sets.length)
  if (!exercises.length) throw new AppError('حداقل یک حرکت با یک ست ثبت کنید')
  const durationMin = Math.min(300, Math.max(5, Math.round(input.durationMin || 30)))
  let id = ''
  mutate((d) => {
    id = uid('w-')
    let program = input.program
    if (program) {
      const o = d.planOrders.find((x) => x.id === program!.orderId && x.userId === me)
      if (!o) program = undefined
      else if (!o.done?.includes(`${program.week}-${program.day}`)) (o.done ??= []).push(`${program.week}-${program.day}`)
    }
    const hr = input.hr && input.hr.avg >= 40 && input.hr.avg <= 230 && input.hr.max >= input.hr.avg && input.hr.max <= 240 ? { avg: Math.round(input.hr.avg), max: Math.round(input.hr.max) } : undefined
    d.workouts.unshift({ id, userId: me, day, title: String(input.title || 'تمرین').slice(0, 60), durationMin, exercises, note: input.note?.slice(0, 300), program, hr, createdAt: now() })
    if (day === dayKey()) {
      const log = d.dailyLogs.find((l) => l.userId === me && l.day === day)
      if (log) log.workoutMinutes = Math.min(600, log.workoutMinutes + durationMin)
      else d.dailyLogs.push({ userId: me, day, water: 0, steps: 0, workoutMinutes: durationMin, calories: 0, sleepHours: 0, missionsDone: [], rewardClaimed: false })
      if (durationMin >= 20) completeMission(d, me, 'workout')
      autoProgress(d, me, 'workouts', 1, 'workout')
      autoProgress(d, me, 'minutes', durationMin, 'workout')
    }
    addXP(d, me, 25)
  })
  return id
})

export const deleteWorkout = svc('health.deleteWorkout', (id: string) => {
  const me = currentUserId()
  mutate((d) => {
    d.workouts = d.workouts.filter((w) => !(w.id === id && w.userId === me))
  })
})

/** رکوردهای شخصی: بیشترین وزنه و تخمین ۱RM (فرمول اپلی) برای هر حرکت */
export function personalRecords(userId: ID, s: Pick<DBState, 'workouts'> = db()) {
  const out: Record<string, { weight: number; reps: number; oneRm: number; day: string }> = {}
  for (const w of s.workouts.filter((x) => x.userId === userId)) {
    for (const e of w.exercises) {
      if (!exerciseById(e.exerciseId)?.weighted) continue
      for (const set of e.sets) {
        const oneRm = Math.round(set.weight * (1 + set.reps / 30) * 10) / 10
        if (!out[e.exerciseId] || oneRm > out[e.exerciseId].oneRm) out[e.exerciseId] = { weight: set.weight, reps: set.reps, oneRm, day: w.day }
      }
    }
  }
  return out
}

export const volumeOf = (w: WorkoutSession) => w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.reps * s.weight, 0), 0)

/* ───────── تغذیه ───────── */

/** نیاز روزانه‌ی کالری و درشت‌مغذی‌ها (میفلین-سنت جئور) */
export function nutritionTarget(u: User) {
  const { age } = bodyOf(u)
  if (!u.heightCm || !u.weightKg || !u.gender) return { kcal: 2000, protein: 90, carbs: 230, fat: 65, estimated: false }
  const bmr = 10 * u.weightKg + 6.25 * u.heightCm - 5 * (age ?? 30) + (u.gender === 'male' ? 5 : -161)
  const tdee = bmr * { low: 1.375, medium: 1.55, high: 1.725 }[u.activityLevel ?? 'medium']
  const kcal = Math.round((tdee + (u.goal === 'lose' ? -450 : u.goal === 'gain' ? 300 : 0)) / 10) * 10
  const protein = Math.round(u.weightKg * (u.goal === 'gain' ? 2 : 1.6))
  const fat = Math.round((kcal * 0.27) / 9)
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat, estimated: true }
}

export function dayNutrition(userId: ID, day = dayKey(), s: Pick<DBState, 'meals'> = db()) {
  const meals = s.meals.filter((m) => m.userId === userId && m.day === day)
  const sum = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
  return { meals, ...sum }
}

export const addMeal = svc('health.meal', (input: { day?: string; meal: MealLog['meal']; foodId?: string; qty?: number; name?: string; kcal?: number; protein?: number; carbs?: number; fat?: number; source?: MealLog['source'] }) => {
  const me = currentUserId()
  const day = input.day || dayKey()
  validDay(day)
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(input.meal)) throw new AppError('وعده معتبر نیست')
  const qty = Math.min(20, Math.max(0.25, Number(input.qty) || 1))
  let entry: Omit<MealLog, 'id' | 'userId' | 'createdAt'>
  if (input.foodId) {
    const f = FOOD_DB.find((x) => x.id === input.foodId)
    if (!f) throw new AppError('غذا یافت نشد')
    entry = { day, meal: input.meal, name: f.name, qty, kcal: Math.round(f.kcal * qty), protein: Math.round(f.protein * qty * 10) / 10, carbs: Math.round(f.carbs * qty * 10) / 10, fat: Math.round(f.fat * qty * 10) / 10, source: 'db' }
  } else {
    const name = String(input.name ?? '').trim()
    if (!name) throw new AppError('نام غذا را وارد کنید')
    const kcal = Math.round(Number(input.kcal) || 0)
    if (!(kcal > 0 && kcal <= 5000)) throw new AppError('کالری معتبر نیست')
    const n = (v?: number) => Math.min(500, Math.max(0, Math.round((Number(v) || 0) * 10) / 10))
    entry = { day, meal: input.meal, name: name.slice(0, 60), qty, kcal, protein: n(input.protein), carbs: n(input.carbs), fat: n(input.fat), source: input.source === 'photo' ? 'photo' : 'custom' }
  }
  mutate((d) => {
    d.meals.push({ ...entry, id: uid('ml-'), userId: me, createdAt: now() })
    if (day === dayKey()) {
      const log = d.dailyLogs.find((l) => l.userId === me && l.day === day)
      if (log) log.calories = d.meals.filter((m) => m.userId === me && m.day === day).reduce((a, m) => a + m.kcal, 0)
    }
    addXP(d, me, 3)
  })
})

export const removeMeal = svc('health.removeMeal', (id: string) => {
  const me = currentUserId()
  mutate((d) => {
    d.meals = d.meals.filter((m) => !(m.id === id && m.userId === me))
  })
})

/* ───────── اندازه‌های بدن ───────── */

export const addBodyEntry = svc('health.body', (input: Omit<BodyEntry, 'id' | 'userId' | 'createdAt'>) => {
  const me = currentUserId()
  const day = input.day || dayKey()
  validDay(day)
  const r = (v: number | undefined, min: number, max: number, label: string) => {
    if (v === undefined || v === null || (v as unknown) === '' || v === 0) return undefined
    const n = Number(v)
    if (!(n >= min && n <= max)) throw new AppError(`${label} معتبر نیست`)
    return Math.round(n * 10) / 10
  }
  const e = {
    weightKg: r(input.weightKg, 30, 250, 'وزن'),
    waistCm: r(input.waistCm, 40, 200, 'دور کمر'),
    hipCm: r(input.hipCm, 50, 200, 'دور باسن'),
    chestCm: r(input.chestCm, 50, 200, 'دور سینه'),
    armCm: r(input.armCm, 15, 70, 'دور بازو'),
    bodyFatPct: r(input.bodyFatPct, 3, 60, 'درصد چربی'),
    muscleKg: r(input.muscleKg, 10, 120, 'وزن عضله'),
    visceralFat: r(input.visceralFat, 1, 30, 'چربی احشایی'),
    bmr: r(input.bmr, 800, 4000, 'متابولیسم پایه'),
    waterPct: r(input.waterPct, 30, 80, 'درصد آب'),
  }
  if (!Object.values(e).some((v) => v !== undefined) && !input.photo) throw new AppError('حداقل یک اندازه یا عکس ثبت کنید')
  mutate((d) => {
    d.bodyEntries.push({ ...e, photo: input.photo, day, id: uid('be-'), userId: me, createdAt: now() })
    // آخرین وزن در پروفایل هم به‌روز می‌شود
    if (e.weightKg) {
      const latest = d.bodyEntries.filter((b) => b.userId === me && b.weightKg).sort((a, b) => b.day.localeCompare(a.day))[0]
      if (latest?.day === day) d.users.find((u) => u.id === me)!.weightKg = e.weightKg
    }
    addXP(d, me, 5)
  })
})

export const deleteBodyEntry = svc('health.deleteBody', (id: string) => {
  const me = currentUserId()
  mutate((d) => {
    d.bodyEntries = d.bodyEntries.filter((b) => !(b.id === id && b.userId === me))
  })
})

/* ───────── اشتراک پرونده‌ی سلامت ───────── */

/** فقط مربی یا پزشکی که با کاربر رابطه دارد (برنامه یا نوبت) قابل انتخاب است */
export function careProviders(userId: ID, s: DBState = db()) {
  const ids = new Set<ID>([
    ...s.planOrders.filter((o) => o.userId === userId).map((o) => o.coachId),
    ...s.appointments.filter((a) => a.userId === userId && a.status !== 'cancelled').map((a) => a.doctorId),
  ])
  return [...ids].map((id) => s.users.find((u) => u.id === id)).filter((u): u is User => !!u)
}

export const toggleHealthShare = svc('health.share', (providerId: ID) => {
  const me = currentUserId()
  if (!careProviders(me).some((u) => u.id === providerId)) throw new AppError('فقط با مربی یا پزشک خودتان می‌توانید پرونده را به اشتراک بگذارید')
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    const list = u.healthShares ?? []
    const on = !list.includes(providerId)
    u.healthShares = on ? [...list, providerId] : list.filter((x) => x !== providerId)
    if (on) notify(d, providerId, 'دسترسی به پرونده‌ی سلامت', `${u.name} پرونده‌ی سلامت خود را با شما به اشتراک گذاشت.`, '', `/client/${me}`)
  })
})

/* ───────── نمره‌ی سلامت روزانه ───────── */

export interface HealthScore {
  score: number
  parts: { key: string; label: string; value: number; max: number; hint: string }[]
}

/** نمره‌ی ۰ تا ۱۰۰ از فعالیت، آب، خواب، تغذیه و تداوم؛ در روزهای قاعدگی هدف فعالیت سبک‌تر است */
export function healthScore(userId: ID, day = dayKey(), s: DBState = db()): HealthScore {
  const u = s.users.find((x) => x.id === userId)
  const log = s.dailyLogs.find((l) => l.userId === userId && l.day === day)
  const cyc = u ? cycleStatusIn(s, userId, new Date(day + 'T12:00')) : null
  const light = cyc?.inPeriod
  const stepsGoal = light ? 4000 : 7000
  const workoutGoal = light ? 15 : 30
  const nut = dayNutrition(userId, day, s)
  const target = u ? nutritionTarget(u) : { kcal: 2000, protein: 90 }
  const workouts = s.workouts.filter((w) => w.userId === userId && w.day === day).reduce((a, w) => a + w.durationMin, 0)
  const activeMin = Math.max(log?.workoutMinutes ?? 0, workouts)
  const activity = Math.min(1, (log?.steps ?? 0) / stepsGoal) * 15 + Math.min(1, activeMin / workoutGoal) * 15
  const water = Math.min(1, (log?.water ?? 0) / 8) * 15
  const sleepH = log?.sleepHours ?? 0
  const sleep = sleepH ? Math.max(0, 1 - Math.abs(7.5 - sleepH) / 3.5) * 20 : 0
  let nutrition = 0
  if (nut.kcal > 0) {
    const ratio = nut.kcal / target.kcal
    nutrition = Math.max(0, 1 - Math.abs(1 - ratio) * 2) * 15 + Math.min(1, nut.protein / target.protein) * 5
  }
  const streak = Math.min(1, (u?.streak ?? 0) / 7) * 15
  const parts = [
    { key: 'activity', label: 'فعالیت', value: activity, max: 30, hint: light ? `در روزهای قاعدگی: ${stepsGoal.toLocaleString('fa-IR')} قدم یا ${workoutGoal.toLocaleString('fa-IR')} دقیقه تحرک سبک` : `${stepsGoal.toLocaleString('fa-IR')} قدم و ${workoutGoal.toLocaleString('fa-IR')} دقیقه تمرین` },
    { key: 'nutrition', label: 'تغذیه', value: nutrition, max: 20, hint: `حدود ${target.kcal.toLocaleString('fa-IR')} کالری و ${target.protein.toLocaleString('fa-IR')} گرم پروتئین` },
    { key: 'sleep', label: 'خواب', value: sleep, max: 20, hint: '۷ تا ۸ ساعت خواب' },
    { key: 'water', label: 'آب', value: water, max: 15, hint: '۸ لیوان آب' },
    { key: 'streak', label: 'تداوم', value: streak, max: 15, hint: '۷ روز فعالیت پیاپی' },
  ]
  return { score: Math.round(parts.reduce((a, p) => a + p.value, 0)), parts }
}

/** خلاصه‌ی هفتگی برای «مربی هوشمند» (بدون نیاز به سرور) */
export function weeklySummary(userId: ID, s: DBState = db()) {
  const days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return dayKey(d)
  })
  const scores = days.map((day) => healthScore(userId, day, s).score)
  const workouts = s.workouts.filter((w) => w.userId === userId && days.includes(w.day))
  const checkins = s.checkins.filter((c) => c.userId === userId && c.status === 'used' && c.usedAt && days.includes(dayKey(new Date(c.usedAt))))
  const logs = s.dailyLogs.filter((l) => l.userId === userId && days.includes(l.day))
  const avg = (f: (l: (typeof logs)[number]) => number) => (logs.length ? logs.reduce((a, l) => a + f(l), 0) / logs.length : 0)
  const kcalDays = days.map((day) => dayNutrition(userId, day, s).kcal).filter((k) => k > 0)
  const weights = s.bodyEntries.filter((b) => b.userId === userId && b.weightKg).sort((a, b) => a.day.localeCompare(b.day))
  return {
    days,
    scores,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / 7),
    sessions: workouts.length + checkins.length,
    minutes: workouts.reduce((a, w) => a + w.durationMin, 0),
    avgSteps: Math.round(avg((l) => l.steps)),
    avgWater: Math.round(avg((l) => l.water) * 10) / 10,
    avgSleep: Math.round(avg((l) => l.sleepHours) * 10) / 10,
    avgKcal: kcalDays.length ? Math.round(kcalDays.reduce((a, b) => a + b, 0) / kcalDays.length) : 0,
    weightChange: weights.length >= 2 ? Math.round((weights[weights.length - 1].weightKg! - weights[0].weightKg!) * 10) / 10 : undefined,
  }
}

export const sleepLog = svc('health.sleep', (hours: number) => {
  const me = currentUserId()
  if (!(hours >= 0 && hours <= 16)) throw new AppError('ساعت خواب معتبر نیست')
  mutate((d) => {
    const day = dayKey()
    let log = d.dailyLogs.find((l) => l.userId === me && l.day === day)
    if (!log) {
      log = { userId: me, day, water: 0, steps: 0, workoutMinutes: 0, calories: 0, sleepHours: 0, missionsDone: [], rewardClaimed: false }
      d.dailyLogs.push(log)
    }
    log.sleepHours = Math.round(hours * 2) / 2
  })
})

export { EXERCISES }
