/**
 * ردیاب چرخه‌ی قاعدگی — کارت خانه، تنظیمات و ثبت علائم.
 * داده‌ها خصوصی‌اند و فقط برای خود کاربر نمایش داده می‌شوند.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Droplet, Lock, Settings2, Sparkles } from 'lucide-react'
import { useDB } from '@/core/db'
import { dayKey, faDigitsToEn, num } from '@/core/format'
import { daysAgoKey } from '@/core/profile'
import { PHASES, SYMPTOMS, logCycleDay, logPeriodStart, phaseOfDay, setupCycle, statusFor, type CycleStatus } from '@/core/services/cycle'
import type { CycleLog } from '@/core/types'
import { Button, Field, Input, Sheet } from '@/ui/kit'
import { Yoga } from '@/ui/art'
import { useMe } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

const DAY = 86_400_000

export function useCycle() {
  const me = useMe()
  const c = useDB((s) => s.cycles.find((x) => x.userId === me?.id))
  if (!me || me.gender !== 'female' || !c) return { profile: undefined, status: undefined }
  return { profile: c, status: statusFor(c) }
}

/** حلقه‌ی چرخه: هر روز یک قطعه به رنگ فاز، با نشانگر امروز */
export function CycleWheel({ st, size = 176 }: { st: CycleStatus; size?: number }) {
  const L = st.cycleLength
  const R = 70
  const cx = 88
  const gap = 1.6
  const pt = (deg: number, r = R) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [cx + r * Math.cos(a), cx + r * Math.sin(a)]
  }
  const arc = (from: number, to: number) => {
    const [x1, y1] = pt(from)
    const [x2, y2] = pt(to)
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }
  const marker = pt(((st.day - 0.5) / L) * 360)
  return (
    <svg viewBox="0 0 176 176" width={size} height={size} role="img" aria-label={`روز ${st.day} از چرخه`}>
      {[...Array(L)].map((_, i) => {
        const ph = phaseOfDay(i + 1, L, st.periodLength)
        const past = i + 1 < st.day
        return <path key={i} d={arc((i / L) * 360 + gap / 2, ((i + 1) / L) * 360 - gap / 2)} stroke={PHASES[ph].color} strokeWidth={i + 1 === st.day ? 15 : 11} strokeLinecap="butt" fill="none" opacity={past ? 0.45 : 1} />
      })}
      <circle cx={marker[0]} cy={marker[1]} r="9" fill="#fff" stroke={st.info.color} strokeWidth="4" />
    </svg>
  )
}

/** کارت چرخه در صفحه‌ی خانه/پروفایل */
export function CycleCard() {
  const { status: st, profile } = useCycle()
  const [setup, setSetup] = useState(false)
  const [log, setLog] = useState(false)

  if (!st || !profile)
    return (
      <>
        <div className="relative overflow-hidden rounded-[2rem] grad-pink p-5 text-ink-950">
          <Yoga size={120} className="pointer-events-none absolute -bottom-3 left-1" />
          <div className="relative max-w-[65%]">
            <div className="font-display text-[1.8rem] leading-none">ردیاب چرخه</div>
            <p className="mt-2 text-xs leading-6 opacity-75">تمرین و تغذیه‌ات را با فاز چرخه هماهنگ کن؛ پیش‌بینی پریود بعدی و روزهای پرانرژی.</p>
            <div className="mt-1 flex items-center gap-1 text-[11px] opacity-60">
              <Lock size={11} /> کاملاً خصوصی
            </div>
            <Button size="sm" variant="dark" className="mt-3" onClick={() => setSetup(true)}>
              فعال‌سازی
            </Button>
          </div>
        </div>
        <CycleSetupSheet open={setup} onClose={() => setSetup(false)} />
      </>
    )

  const todayLog = profile.logs.find((l) => l.day === dayKey())
  const next = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' }).format(st.nextPeriod)
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-white p-5 shadow-card dark:bg-ink-850 dark:shadow-none">
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-3xl" style={{ background: st.info.color }} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
            <Lock size={11} /> چرخه‌ی من
          </div>
          <div className="mt-1 font-display text-[1.9rem] leading-none">فاز {st.info.label}</div>
        </div>
        <button onClick={() => setSetup(true)} className="rounded-full p-2 text-ink-400 transition hover:bg-ink-900/5 hover:text-ink-900 dark:hover:bg-white/5 dark:hover:text-white" aria-label="تنظیمات چرخه">
          <Settings2 size={17} strokeWidth={1.5} />
        </button>
      </div>

      <div className="relative mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <CycleWheel st={st} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] text-ink-400">روز</span>
            <span className="font-display text-[2.6rem] leading-none tabular-nums">{num(st.day)}</span>
            <span className="text-[11px] text-ink-400">از {num(st.cycleLength)}</span>
          </div>
        </div>
        <div className="w-full min-w-0 flex-1 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label={st.inPeriod ? 'روز پریود' : 'تا پریود بعدی'} value={st.inPeriod ? `${num(st.day)} از ${num(st.periodLength)}` : `${num(st.daysToNext)} روز`} />
            <Mini label="پریود بعدی" value={next} />
            <Mini label="شدت تمرین" value={st.info.intensity} color={st.info.color} />
          </div>
          <Tip title="تمرین امروز" text={st.info.workout} />
          <Tip title="تغذیه" text={st.info.nutrition} />
          <div className="flex flex-wrap gap-1.5">
            {st.info.sports.map((s) => (
              <Link key={s} to={`/fityab?sport=${encodeURIComponent(s)}`} className="rounded-full bg-ink-900/[.05] px-3 py-1.5 text-[11px] transition hover:bg-ink-900/10 dark:bg-white/[.06] dark:hover:bg-white/10">
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <Button size="sm" variant={st.inPeriod ? 'secondary' : 'primary'} icon={<Droplet size={14} />} onClick={() => runOk(() => logPeriodStart(), 'شروع پریود ثبت شد؛ پیش‌بینی‌ها به‌روز شد')}>
          پریودم امروز شروع شد
        </Button>
        <Button size="sm" variant="secondary" icon={<Sparkles size={14} />} onClick={() => setLog(true)}>
          {todayLog ? 'ویرایش علائم امروز' : 'ثبت علائم امروز'}
        </Button>
      </div>
      <p className="relative mt-3 text-[10px] leading-5 text-ink-400">پیش‌بینی‌ها تقریبی‌اند و جایگزین مشاوره‌ی پزشکی نیستند. در صورت نامنظمی یا درد شدید با پزشک مشورت کنید.</p>

      <CycleSetupSheet open={setup} onClose={() => setSetup(false)} />
      <SymptomSheet open={log} onClose={() => setLog(false)} initial={todayLog} />
    </div>
  )
}

const Mini = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="rounded-2xl bg-ink-900/[.04] px-2 py-2.5 dark:bg-white/[.05]">
    <div className="text-[10px] text-ink-400">{label}</div>
    <div className="mt-0.5 flex items-center justify-center gap-1 text-[13px] font-medium tabular-nums">
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {value}
    </div>
  </div>
)

const Tip = ({ title, text }: { title: string; text: string }) => (
  <div className="text-xs leading-6">
    <span className="font-medium">{title}: </span>
    <span className="text-ink-500 dark:text-ink-400">{text}</span>
  </div>
)

export function CycleSetupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()
  const c = useDB((s) => s.cycles.find((x) => x.userId === me?.id))
  const since = c ? Math.max(0, Math.round((Date.now() - new Date(c.lastPeriodStart + 'T00:00').getTime()) / DAY)) : 0
  const [f, setF] = useState({ ago: c ? String(since) : '', cycleLength: String(c?.cycleLength ?? 28), periodLength: String(c?.periodLength ?? 5) })
  const n = (v: string) => Number(faDigitsToEn(v))
  return (
    <Sheet open={open} onClose={onClose} title="تنظیم ردیاب چرخه">
      <div className="space-y-3">
        <p className="flex items-start gap-1.5 text-xs leading-6 text-ink-500">
          <Lock size={13} className="mt-1 shrink-0" /> این اطلاعات فقط برای خودت قابل مشاهده است و در پروفایل عمومی یا برای دیگران نمایش داده نمی‌شود.
        </p>
        <Field label="آخرین پریود چند روز پیش شروع شد؟">
          <Input value={f.ago} onChange={(e) => setF({ ...f, ago: e.target.value })} inputMode="numeric" placeholder="مثلاً ۳" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="طول چرخه (روز)" hint="معمولاً ۲۱ تا ۳۵">
            <Input value={f.cycleLength} onChange={(e) => setF({ ...f, cycleLength: e.target.value })} inputMode="numeric" />
          </Field>
          <Field label="طول پریود (روز)" hint="معمولاً ۳ تا ۷">
            <Input value={f.periodLength} onChange={(e) => setF({ ...f, periodLength: e.target.value })} inputMode="numeric" />
          </Field>
        </div>
        <Button
          className="w-full"
          onClick={async () => {
            const ok = await runOk(() => setupCycle({ lastPeriodStart: f.ago.trim() === '' ? '' : daysAgoKey(n(f.ago)), cycleLength: n(f.cycleLength), periodLength: n(f.periodLength) }), 'ردیاب چرخه ذخیره شد')
            if (ok) onClose()
          }}
        >
          ذخیره
        </Button>
      </div>
    </Sheet>
  )
}

const FLOW: [NonNullable<CycleLog['flow']>, string][] = [
  ['light', 'کم'],
  ['medium', 'متوسط'],
  ['heavy', 'زیاد'],
]
const MOOD: [NonNullable<CycleLog['mood']>, string][] = [
  ['great', 'عالی'],
  ['ok', 'معمولی'],
  ['low', 'بی‌حوصله'],
]
const pill = (on: boolean) => clsx('rounded-full px-3.5 py-2 text-xs transition', on ? 'grad-pink font-medium text-ink-950' : 'bg-ink-900/[.05] text-ink-600 hover:bg-ink-900/10 dark:bg-white/[.06] dark:text-ink-300')

export function SymptomSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: CycleLog }) {
  const [flow, setFlow] = useState(initial?.flow)
  const [mood, setMood] = useState(initial?.mood)
  const [sym, setSym] = useState<string[]>(initial?.symptoms ?? [])
  return (
    <Sheet open={open} onClose={onClose} title="علائم امروز">
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-xs text-ink-500">میزان خونریزی</div>
          <div className="flex flex-wrap gap-2">
            {FLOW.map(([v, l]) => (
              <button key={v} type="button" className={pill(flow === v)} onClick={() => setFlow(flow === v ? undefined : v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs text-ink-500">علائم</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SYMPTOMS).map(([k, l]) => (
              <button key={k} type="button" className={pill(sym.includes(k))} onClick={() => setSym(sym.includes(k) ? sym.filter((x) => x !== k) : [...sym, k])}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs text-ink-500">حال و انرژی</div>
          <div className="flex flex-wrap gap-2">
            {MOOD.map(([v, l]) => (
              <button key={v} type="button" className={pill(mood === v)} onClick={() => setMood(mood === v ? undefined : v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <Button
          className="w-full"
          onClick={async () => {
            if (await runOk(() => logCycleDay({ flow, mood, symptoms: sym }), 'ثبت شد')) onClose()
          }}
        >
          ذخیره
        </Button>
      </div>
    </Sheet>
  )
}

/** خلاصه‌ی سابقه‌ی چرخه برای تب سلامت پروفایل */
export function CycleHistory() {
  const { profile, status } = useCycle()
  if (!profile || !status) return null
  const hist = [...profile.history].sort().reverse().slice(0, 6)
  const gaps = hist.slice(0, -1).map((k, i) => Math.round((new Date(k + 'T00:00').getTime() - new Date(hist[i + 1] + 'T00:00').getTime()) / DAY))
  const fmt = (k: string) => new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' }).format(new Date(k + 'T00:00'))
  const counts = profile.logs.flatMap((l) => l.symptoms).reduce<Record<string, number>>((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {})
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-3xl bg-white p-4 shadow-card dark:bg-ink-850 dark:shadow-none">
        <div className="mb-2 text-sm font-medium">سابقه‌ی پریود</div>
        {hist.map((k, i) => (
          <div key={k} className="flex items-center justify-between border-b hairline py-2 text-xs last:border-0">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: PHASES.menstrual.color }} />
              {fmt(k)}
            </span>
            <span className="tabular-nums text-ink-400">{gaps[i] ? `چرخه‌ی ${num(gaps[i])} روزه` : 'جاری'}</span>
          </div>
        ))}
      </div>
      <div className="rounded-3xl bg-white p-4 shadow-card dark:bg-ink-850 dark:shadow-none">
        <div className="mb-2 text-sm font-medium">الگوی شما</div>
        <div className="space-y-2 text-xs leading-6 text-ink-500 dark:text-ink-400">
          <div>میانگین طول چرخه: <b className="text-ink-900 dark:text-white">{num(status.cycleLength)} روز</b></div>
          <div>طول پریود: <b className="text-ink-900 dark:text-white">{num(status.periodLength)} روز</b></div>
          <div>روزهای باروری تخمینی: <b className="text-ink-900 dark:text-white">روز {num(status.fertileFrom)} تا {num(status.fertileTo)}</b></div>
          {top.length > 0 && <div>علائم پرتکرار: <b className="text-ink-900 dark:text-white">{top.map(([k]) => SYMPTOMS[k]).join('، ')}</b></div>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(PHASES) as (keyof typeof PHASES)[]).map((p) => (
            <span key={p} className="flex items-center gap-1 text-[11px] text-ink-500">
              <span className="h-2 w-2 rounded-full" style={{ background: PHASES[p].color }} />
              {PHASES[p].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
