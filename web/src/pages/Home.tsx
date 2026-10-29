import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { CalendarDays, ChevronDown, ChevronLeft, Droplet, Footprints, Plus, QrCode, Radio, Ticket as TicketIcon, Timer, Trophy } from 'lucide-react'
import { useDB } from '@/core/db'
import { dayKey, daysLeft, faDateTime, num, toman } from '@/core/format'
import { logActivity } from '@/core/services/engagement'
import { activeSubscription } from '@/core/services/wallet'
import { ticketStatus } from '@/core/services/fityab'
import { liveEnd } from '@/core/services/live'
import { rankings } from '@/core/services/challenges'
import type { Challenge, PlanOrder } from '@/core/types'
import { GROUPS, type NavGroup } from '@/layouts/nav'
import { useMe } from '@/ui/hooks'
import { run } from '@/ui/toast'
import { vtName } from '@/ui/ViewTransitions'
import { toneFor } from '@/ui/kit'
import { CardIcon, LiveTiles, progressTiles, tileIcon } from '@/ui/live'
import { moment } from '@/ui/moments'

/* ───────── عدد متحرک ───────── */
function useCountUp(value: number, ms = 650) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const e = 1 - Math.pow(1 - p, 3)
      setShown(a + (value - a) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

/* ───────── کارت رنگی فعالیت امروز ───────── */
const METRICS = [
  { k: 'steps' as const, label: 'قدم', unit: 'قدم', goal: 6000, add: 1000, tone: 'card-violet', icon: Footprints },
  { k: 'water' as const, label: 'آب', unit: 'لیوان', goal: 8, add: 1, tone: 'card-mint', icon: Droplet },
  { k: 'workoutMinutes' as const, label: 'تمرین', unit: 'دقیقه', goal: 20, add: 10, tone: 'card-peach', icon: Timer },
]

function ActivityCard({ log }: { log: { steps: number; water: number; workoutMinutes: number } }) {
  const [i, setI] = useState(0)
  const [bursts, setBursts] = useState<number[]>([])
  const m = METRICS[i]
  const value = log[m.k]
  const shown = useCountUp(value)
  const pct = Math.min(1, value / m.goal)

  const add = () => {
    const id = Date.now()
    setBursts((b) => [...b, id])
    setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 900)
    const before = value
    run(async () => {
      await logActivity(m.k, m.add)
      if (before < m.goal && before + m.add >= m.goal) moment('unlock', { title: `هدف ${m.label} امروز باز شد!` })
    })
  }

  const violet = m.tone === 'card-violet'
  const accVars = { '--acc': violet ? '#dcff5a' : '#0d0b10', '--acc-on': violet ? '#0d0b10' : '#dcff5a' } as CSSProperties
  const tiles = progressTiles(pct, tileIcon(m.k === 'steps' ? 'foot' : m.k === 'water' ? 'cup' : 'timer'))

  return (
    <section aria-label="فعالیت امروز" style={accVars} className={clsx('relative min-h-[236px] overflow-hidden rounded-[32px] p-5 shadow-soft transition-colors duration-500', violet ? 'text-white' : 'text-ink-950')}>
      {/* لایه‌های رنگ با محو شدن نرم بین شاخص‌ها */}
      {METRICS.map((x, j) => (
        <span key={x.k} aria-hidden className={clsx('absolute inset-0 transition-opacity duration-500', x.tone, j === i ? 'opacity-100' : 'opacity-0')} />
      ))}
      {/* کاشی‌های زنده: هر کاشی یک‌دوازدهم هدف امروز همین شاخص */}
      <LiveTiles key={m.k} tiles={tiles} />
      <CardIcon name={m.k === 'steps' ? 'steps' : m.k === 'water' ? 'drop' : 'timer'} playKey={`${m.k}-${value}`} />

      <div className="relative max-w-[64%]">
        <span className="text-[14px] font-semibold opacity-70">امروز · {m.label}</span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[46px] font-black leading-none tabular-nums">{num(Math.round(shown))}</span>
          <span className="text-[15px] font-semibold opacity-70">{m.unit}</span>
        </div>
        <p className="mt-2 text-[14px] opacity-75">
          {pct >= 1 ? 'هدف امروز کامل شد!' : `${num(Math.round(pct * 100))}٪ · ${num(m.goal - value)} ${m.unit} تا هدف`}
        </p>
        <div className="mt-3 flex gap-1.5" role="tablist" aria-label="شاخص">
          {METRICS.map((x, j) => (
            <button key={x.k} role="tab" aria-selected={j === i} onClick={() => setI(j)} className={clsx('press h-8 rounded-full px-3 text-[13px] transition', j === i ? 'bg-ink-950 font-semibold text-white' : 'bg-white/30')}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <button onClick={add} className="press flex h-11 items-center gap-2 rounded-full bg-ink-950 px-5 text-[15px] font-bold text-white">
            <Plus size={18} /> ثبت {num(m.add)} {m.unit}
          </button>
          {bursts.map((b) => (
            <span key={b} aria-hidden className="anim-float-up pointer-events-none absolute right-10 top-0 text-[18px] font-black">+{num(m.add)}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────── تمرین امروز ───────── */
function nextProgramDay(o: PlanOrder) {
  const done = new Set(o.done ?? [])
  const weeks = o.program?.weeks ?? []
  for (let w = 0; w < weeks.length; w++)
    for (let d = 0; d < weeks[w].days.length; d++) if (!done.has(`${w}-${d}`)) return { w, d, day: weeks[w].days[d] }
  return null
}

function TrainingCard() {
  const me = useMe()!
  const workouts = useDB((s) => s.workouts)
  const orders = useDB((s) => s.planOrders)
  const program = orders.find((o) => o.userId === me.id && o.status === 'delivered' && !!o.program?.weeks.length)
  const next = program ? nextProgramDay(program) : null
  const days = useMemo(() => {
    const out: { key: string; label: string; done: boolean }[] = []
    for (let k = 6; k >= 0; k--) {
      const d = new Date(Date.now() - k * 86_400_000)
      const key = dayKey(d)
      out.push({ key, label: new Intl.DateTimeFormat('fa-IR', { weekday: 'narrow' }).format(d), done: workouts.some((w) => w.userId === me.id && w.day === key) })
    }
    return out
  }, [workouts, me.id])
  const weekCount = days.filter((d) => d.done).length
  // ترتیب کاشی‌ها از کنار متن: امروز، دیروز، ...
  const tiles = useMemo(() => Array.from({ length: 12 }, (_, k) => {
    const key = dayKey(new Date(Date.now() - k * 86_400_000))
    return { on: workouts.some((w) => w.userId === me.id && w.day === key), back: tileIcon('check'), glow: k === 0 }
  }), [workouts, me.id])
  const recent = tiles.filter((t) => t.on).length

  return (
    <section aria-label="تمرین امروز" className="card-night relative overflow-hidden rounded-[32px] p-5">
      <span aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(140,110,255,.45),transparent_65%)]" />
      {/* کاشی‌های زنده: ۱۲ روز اخیر، هر روزی که تمرین کردی تیک می‌خورد */}
      <LiveTiles tiles={tiles} />
      <CardIcon name="dumbbell" playKey={weekCount} />
      <div className="relative max-w-[64%]">
        <span className="text-[13px] font-semibold text-white/60">تمرین امروز</span>
        {program && next ? (
          <>
            <h2 className="mt-1 text-[24px] font-extrabold leading-snug">{next.day.title}</h2>
            <p className="mt-1 text-[14px] text-white/65">
              {program.title} · هفته‌ی {num(next.w + 1)}، روز {num(next.d + 1)} · {num(next.day.exercises.length)} حرکت
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-1 text-[24px] font-extrabold leading-snug">{weekCount ? `این هفته ${num(weekCount)} جلسه تمرین کردی` : 'امروز بدنت را تکان بده'}</h2>
            <p className="mt-1 text-[14px] text-white/65">{program ? 'برنامه‌ی مربی‌ات تمام شد؛ آفرین!' : 'تمرینت را ثبت کن یا از یک مربی برنامه بگیر.'}</p>
          </>
        )}

        <p className="mt-3 text-[13px] text-white/55">{num(recent)} جلسه در ۱۲ روز اخیر</p>

        <div className="mt-5 flex gap-2.5">
          <Link to={program && next ? `/program/${program.id}` : '/workouts'} className="flex h-12 flex-1 items-center justify-center rounded-full bg-white text-[15px] font-bold text-ink-950 transition active:scale-95">
            {program && next ? 'ادامه‌ی برنامه' : 'ثبت تمرین'}
          </Link>
          {program ? (
            <Link to="/scan" className="flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-[14px] font-semibold">
              <QrCode size={17} /> ورود
            </Link>
          ) : (
            <Link to="/fityar" className="flex h-12 items-center justify-center rounded-full border border-white/20 px-5 text-[14px] font-semibold">
              گرفتن مربی
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

/* ───────── چالش‌ها ───────── */

function ChallengeCard({ c, meId, tone }: { c: Challenge; meId: string; tone: string }) {
  const mine = c.participants.find((p) => p.userId === meId)
  const rank = rankings(c).findIndex((p) => p.userId === meId)
  const pct = mine ? Math.min(1, mine.score / Math.max(1, c.goal)) : 0
  const left = Math.max(0, daysLeft(c.endAt))
  return (
    <Link to={`/challenges/${c.id}`} style={vtName(`ch-${c.id}`)} className={clsx('press flex h-[176px] w-[232px] shrink-0 snap-start flex-col rounded-[28px] p-4', tone)}>
      <div className="flex items-center justify-between text-[12px] font-semibold opacity-70">
        <span>{left ? `${num(left)} روز مانده` : 'روز آخر'}</span>
        <span>{num(c.participants.length)} نفر</span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-[18px] font-extrabold leading-7">{c.title}</h3>
      <div className="mt-auto">
        {mine ? (
          <>
            <div className="flex justify-between text-[12px] font-semibold">
              <span>رتبه‌ی {num(rank + 1)}</span>
              <span className="tabular-nums">{num(mine.score)} / {num(c.goal)} {c.unit}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/45">
              <div className="h-full rounded-full bg-ink-950 transition-all duration-700" style={{ width: `${pct * 100}%` }} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold opacity-75">{c.pool ? `جایزه ${toman(c.pool)}` : `${num(c.xpReward)} امتیاز`}</span>
            <span className="rounded-full bg-ink-950 px-3.5 py-1.5 text-[13px] font-bold text-white">بپیوند</span>
          </div>
        )}
      </div>
    </Link>
  )
}

function ChallengesRail() {
  const me = useMe()!
  const challenges = useDB((s) => s.challenges)
  const active = challenges.filter((c) => c.status === 'active' && new Date(c.endAt) > new Date())
  const mine = active.filter((c) => c.participants.some((p) => p.userId === me.id))
  const others = active.filter((c) => !mine.includes(c)).sort((a, b) => b.participants.length - a.participants.length).slice(0, 4)
  const list = [...mine, ...others]
  return (
    <section aria-labelledby="ch-title">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 id="ch-title" className="flex items-center gap-2 text-[20px] font-extrabold"><Trophy size={20} /> چالش‌ها</h2>
          <p className="text-[13px] text-ink-500">{mine.length ? `در ${num(mine.length)} چالش شرکت داری` : 'با دیگران مسابقه بده و جایزه ببر'}</p>
        </div>
        <Link to="/challenges" className="text-[14px] font-semibold text-ink-500 hover:text-ink-950 dark:hover:text-white">همه</Link>
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
        {list.map((c) => <ChallengeCard key={c.id} c={c} meId={me.id} tone={toneFor(c.id)} />)}
        <Link to="/challenges/new" className="flex h-[176px] w-[150px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[28px] border-2 border-dashed border-ink-200 text-[14px] font-semibold text-ink-500 dark:border-ink-700">
          <Plus size={24} /> چالش جدید
        </Link>
      </div>
    </section>
  )
}

/* ───────── امکانات: کارت‌های رنگی لایه‌ای ───────── */
const STACK_TONES = ['card-pink', 'card-lilac', 'card-violet', 'card-night']
const CATS = GROUPS.filter((g) => g.id !== 'account')

function CategoryStack() {
  const [open, setOpen] = useState<NavGroup['id'] | null>(null)
  const refs = useRef<Record<string, HTMLElement | null>>({})

  const toggle = (id: NavGroup['id']) => {
    const next = open === id ? null : id
    setOpen(next)
    if (next) setTimeout(() => refs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 320)
  }

  return (
    <section aria-labelledby="cats-title">
      <div className="mb-3">
        <h2 id="cats-title" className="text-[20px] font-extrabold">امکانات</h2>
        <p className="text-[13px] text-ink-500">روی هر کارت بزن تا بخش‌هایش باز شود</p>
      </div>
      <div className="relative">
        {CATS.map((g, i) => {
          const isOpen = open === g.id
          const night = STACK_TONES[i] === 'card-night'
          const last = i === CATS.length - 1
          return (
            <section
              key={g.id}
              ref={(el) => {
                refs.current[g.id] = el
              }}
              className={clsx(
                'relative rounded-[34px] px-6 pt-5 transition-[box-shadow,transform] duration-300',
                STACK_TONES[i],
                i > 0 && '-mt-8',
                last ? 'pb-5' : 'pb-11',
                isOpen && 'anim-rise shadow-soft',
              )}
            >
              <button onClick={() => toggle(g.id)} aria-expanded={isOpen} aria-controls={`cat-${g.id}`} className="flex w-full items-center gap-3 text-start">
                <span className="flex-1 text-[30px] font-extrabold leading-tight">{g.title}</span>
                <span className={clsx('rounded-full px-2.5 py-1 text-[12px] font-semibold', night ? 'bg-white/10' : 'bg-white/45')}>{num(g.items.length)} بخش</span>
                <span className={clsx('flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300', night ? 'bg-white/10' : 'bg-white/45', isOpen && 'rotate-180')}>
                  <ChevronDown size={20} />
                </span>
              </button>
              <div id={`cat-${g.id}`} className="expand" data-open={isOpen}>
                <div>
                  <div key={isOpen ? 'open' : 'closed'} className="grid grid-cols-3 gap-2.5 pt-4">
                    {g.items.map((it, j) => (
                      <Link
                        key={it.to}
                        to={it.to}
                        tabIndex={isOpen ? 0 : -1}
                        className={clsx('flex flex-col items-center gap-2 rounded-[22px] px-1.5 py-3.5 text-center transition active:scale-95', night ? 'bg-white/10 hover:bg-white/15' : 'bg-white/50 hover:bg-white/70', isOpen && 'anim-item')}
                        style={isOpen ? { animationDelay: `${80 + j * 45}ms` } : undefined}
                      >
                        <span className={clsx('flex h-11 w-11 items-center justify-center rounded-full', night ? 'bg-white/10' : 'bg-white/70')}>
                          <it.icon size={21} strokeWidth={1.7} />
                        </span>
                        <span className="text-[13px] font-semibold leading-5">{it.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

export default function Home() {
  const me = useMe()!
  const logs = useDB((s) => s.dailyLogs)
  const gyms = useDB((s) => s.gyms)
  const checkins = useDB((s) => s.checkins)
  const requests = useDB((s) => s.entryRequests)
  const liveClasses = useDB((s) => s.liveClasses)
  const events = useDB((s) => s.events)
  useDB((s) => s.subscriptions)
  const sub = activeSubscription(me.id)

  const today = dayKey()
  const log = logs.find((l) => l.userId === me.id && l.day === today) ?? { water: 0, steps: 0, workoutMinutes: 0 }
  const nextTicket = checkins.filter((c) => c.userId === me.id && ticketStatus(c) === 'active').sort((a, b) => (a.slotAt ?? a.createdAt).localeCompare(b.slotAt ?? b.createdAt))[0]
  const ticketGym = nextTicket && gyms.find((g) => g.id === nextTicket.gymId)
  const pendingReq = requests.find((r) => r.userId === me.id && r.status === 'pending' && Date.now() - new Date(r.createdAt).getTime() < 30 * 60_000)
  const nextLive = liveClasses.filter((c) => c.status === 'scheduled' && c.attendees.includes(me.id) && liveEnd(c) > new Date() && new Date(c.at).getTime() - Date.now() < 48 * 3_600_000).sort((a, b) => a.at.localeCompare(b.at))[0]
  const nextEvent = events.filter((e) => (e.status === 'open' || e.status === 'closed') && e.registrations.some((r) => r.userId === me.id) && new Date(e.at) > new Date()).sort((a, b) => a.at.localeCompare(b.at))[0]

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'روز بخیر' : 'عصر بخیر'
  const dateLabel = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  const upcoming = [
    pendingReq && { to: `/tickets?req=${pendingReq.id}`, icon: TicketIcon, title: `پذیرش ${gyms.find((g) => g.id === pendingReq.gymId)?.name ?? ''} منتظر تأیید ورود توست`, sub: 'برای دیدن جزئیات بزن' },
    nextTicket && ticketGym && { to: '/tickets', icon: TicketIcon, title: `بلیت فعال: ${ticketGym.name}`, sub: nextTicket.classId ? `کلاس ${ticketGym.classes?.find((k) => k.id === nextTicket.classId)?.title ?? ''}` : 'سانس آزاد امروز' },
    nextLive && { to: `/live/${nextLive.id}`, icon: Radio, title: `کلاس آنلاین: ${nextLive.title}`, sub: faDateTime(nextLive.at) },
    nextEvent && { to: `/events/${nextEvent.id}`, icon: CalendarDays, title: nextEvent.title, sub: faDateTime(nextEvent.at) },
  ].filter(Boolean) as { to: string; icon: typeof TicketIcon; title: string; sub: string }[]

  return (
    <div className="animate-fade-up space-y-7">
      <header className="flex items-end gap-3 pt-1">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] text-ink-500">{dateLabel}</p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight">
            {greet}، {me.name.split(' ')[0]}
          </h1>
        </div>
        <Link to="/scan" className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink-950 px-4 text-[14px] font-bold text-white transition active:scale-95 dark:bg-white dark:text-ink-950">
          <QrCode size={18} /> ورود به باشگاه
        </Link>
      </header>

      {upcoming.length > 0 && (
        <section aria-label="برنامه‌های پیش رو" className="space-y-2">
          {upcoming.map((u) => (
            <Link key={u.to} to={u.to} className="flex items-center gap-3 rounded-[22px] bg-white p-3.5 shadow-card dark:bg-ink-850 dark:shadow-none">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-ink-100 dark:bg-ink-800"><u.icon size={19} strokeWidth={1.7} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{u.title}</span>
                <span className="block truncate text-[13px] text-ink-500">{u.sub}</span>
              </span>
              <ChevronLeft size={18} className="text-ink-400" />
            </Link>
          ))}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityCard log={log} />
        <TrainingCard />
      </div>

      <ChallengesRail />

      <CategoryStack />

      <Link to="/wallet" className="block text-center text-[13px] text-ink-500 hover:text-ink-950 dark:hover:text-white">
        {sub ? `اعتبار اشتراک: ${toman(sub.credit)}، ${num(daysLeft(sub.expiresAt))} روز مانده` : 'اشتراک فعال نداری؛ با یک عضویت وارد همه‌ی باشگاه‌ها شو'}
      </Link>
    </div>
  )
}
