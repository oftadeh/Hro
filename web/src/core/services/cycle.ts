/**
 * ردیاب چرخه‌ی قاعدگی (فقط برای بانوان و کاملاً خصوصی).
 * پیش‌بینی فاز بر اساس طول چرخه و طول پریود؛ توصیه‌های تمرین و تغذیه برای هر فاز.
 * این بخش ابزار سلامت عمومی است و جایگزین تشخیص پزشکی نیست.
 */
import { AppError, currentUserId, db, mutate } from '../db'
import { dayKey } from '../format'
import type { CycleLog, CycleProfile, ID } from '../types'

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

export const PHASES: Record<Phase, { label: string; color: string; intensity: string; workout: string; nutrition: string; sports: string[] }> = {
  menstrual: {
    label: 'قاعدگی',
    color: '#f0a6d8',
    intensity: 'سبک',
    workout: 'روزهای استراحت فعال: یوگا، پیاده‌روی، کشش و شنای آرام. اگر انرژی داری، تمرین سبک قدرتی با شدت پایین.',
    nutrition: 'آهن (گوشت قرمز کم‌چرب، عدس، اسفناج) همراه ویتامین C، آب کافی و دمنوش گرم. کافئین را کمتر کن.',
    sports: ['یوگا', 'پیلاتس', 'شنا'],
  },
  follicular: {
    label: 'فولیکولار',
    color: '#5eead4',
    intensity: 'بالا',
    workout: 'انرژی و ریکاوری در بهترین حالت است؛ زمان مناسب تمرین قدرتی سنگین، HIIT و یادگیری حرکات جدید.',
    nutrition: 'پروتئین کافی و کربوهیدرات پیچیده پیش از تمرین؛ بدن در این فاز کربوهیدرات را بهتر مصرف می‌کند.',
    sports: ['بدنسازی', 'کراس‌فیت', 'HIIT'],
  },
  ovulation: {
    label: 'تخمک‌گذاری',
    color: '#fcd679',
    intensity: 'اوج',
    workout: 'اوج قدرت است و می‌توانی رکورد بزنی؛ اما گرم‌کردن کامل را جدی بگیر، چون مفاصل و رباط‌ها شل‌ترند.',
    nutrition: 'فیبر و سبزیجات چلیپایی (کلم، بروکلی)، آب فراوان و پروتئین بعد از تمرین.',
    sports: ['بدنسازی', 'اسپینینگ', 'کراس‌فیت'],
  },
  luteal: {
    label: 'لوتئال',
    color: '#c4b5fd',
    intensity: 'متوسط',
    workout: 'تمرین استقامتی و قدرتی با شدت متوسط؛ در روزهای آخر شدت را کم کن و به خواب و ریکاوری توجه کن.',
    nutrition: 'نیاز کالری کمی بالاتر است؛ منیزیم (بادام، شکلات تلخ، موز) و کربوهیدرات پیچیده برای کنترل هوس شیرینی.',
    sports: ['پیلاتس', 'شنا', 'یوگا', 'بدنسازی'],
  },
}

export const SYMPTOMS: Record<string, string> = {
  cramps: 'گرفتگی',
  headache: 'سردرد',
  bloating: 'نفخ',
  fatigue: 'خستگی',
  acne: 'جوش',
  backpain: 'کمردرد',
  cravings: 'هوس خوراکی',
  moody: 'نوسان خلق',
}

const DAY = 86_400_000
const parse = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const diffDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY)

export interface CycleStatus {
  day: number
  phase: Phase
  info: (typeof PHASES)[Phase]
  inPeriod: boolean
  daysToNext: number
  nextPeriod: Date
  ovulationDay: number
  fertileFrom: number
  fertileTo: number
  cycleLength: number
  periodLength: number
}

/** فاز روز d از چرخه‌ای به طول L با پریود P روزه (تخمک‌گذاری حدود ۱۴ روز پیش از پریود بعدی) */
export function phaseOfDay(d: number, L: number, P: number): Phase {
  const ov = L - 14
  return d <= P ? 'menstrual' : d < ov - 1 ? 'follicular' : d <= ov + 1 ? 'ovulation' : 'luteal'
}

/** وضعیت چرخه در یک روز مشخص */
export function statusFor(c: CycleProfile, date = new Date()): CycleStatus {
  const L = Math.min(40, Math.max(21, c.cycleLength))
  const P = Math.min(10, Math.max(2, c.periodLength))
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const elapsed = diffDays(today, parse(c.lastPeriodStart))
  const day = ((elapsed % L) + L) % L + 1
  const ov = L - 14
  const phase = phaseOfDay(day, L, P)
  const daysToNext = L - day + 1
  return {
    day,
    phase,
    info: PHASES[phase],
    inPeriod: day <= P,
    daysToNext,
    nextPeriod: new Date(today.getTime() + daysToNext * DAY),
    ovulationDay: ov,
    fertileFrom: ov - 5,
    fertileTo: ov + 1,
    cycleLength: L,
    periodLength: P,
  }
}

export function cycleOf(userId: ID) {
  const u = db().users.find((x) => x.id === userId)
  if (u?.gender !== 'female') return null
  return db().cycles.find((c) => c.userId === userId) ?? null
}

export function cycleStatus(userId: ID, date?: Date) {
  const c = cycleOf(userId)
  return c ? statusFor(c, date) : null
}

export function setupCycle(input: { lastPeriodStart: string; cycleLength: number; periodLength: number }) {
  const me = currentUserId()
  const u = db().users.find((x) => x.id === me)
  if (u?.gender !== 'female') throw new AppError('این بخش فقط برای بانوان فعال است')
  if (!input.lastPeriodStart) throw new AppError('تاریخ شروع آخرین پریود را وارد کنید')
  if (parse(input.lastPeriodStart) > new Date()) throw new AppError('تاریخ نمی‌تواند در آینده باشد')
  if (input.cycleLength < 21 || input.cycleLength > 40) throw new AppError('طول چرخه معمولاً بین ۲۱ تا ۴۰ روز است')
  if (input.periodLength < 2 || input.periodLength > 10) throw new AppError('طول پریود معمولاً بین ۲ تا ۱۰ روز است')
  mutate((d) => {
    const ex = d.cycles.find((c) => c.userId === me)
    if (ex) Object.assign(ex, input, { history: [...new Set([...ex.history, input.lastPeriodStart])].sort() })
    else d.cycles.push({ userId: me, ...input, history: [input.lastPeriodStart], logs: [] })
  })
}

/** ثبت شروع پریود؛ طول چرخه از میانگین سه چرخه‌ی اخیر به‌روز می‌شود */
export function logPeriodStart(day = dayKey()) {
  const me = currentUserId()
  mutate((d) => {
    const c = d.cycles.find((x) => x.userId === me)
    if (!c) throw new AppError('ابتدا ردیاب چرخه را فعال کنید')
    const hist = [...new Set([...c.history, day])].sort()
    const gaps = hist.slice(1).map((k, i) => diffDays(parse(k), parse(hist[i]))).filter((g) => g >= 21 && g <= 40)
    if (gaps.length) {
      const recent = gaps.slice(-3)
      c.cycleLength = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
    }
    c.history = hist
    c.lastPeriodStart = hist[hist.length - 1]
  })
}

export function logCycleDay(entry: Omit<CycleLog, 'day'>, day = dayKey()) {
  const me = currentUserId()
  mutate((d) => {
    const c = d.cycles.find((x) => x.userId === me)
    if (!c) throw new AppError('ابتدا ردیاب چرخه را فعال کنید')
    const ex = c.logs.find((l) => l.day === day)
    if (ex) Object.assign(ex, entry)
    else c.logs.push({ day, ...entry })
  })
}
