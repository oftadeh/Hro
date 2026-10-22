import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronLeft, Flame, Gift, Plus, Sparkles, Ticket } from 'lucide-react'
import { useDB } from '@/core/db'
import { DAILY_MISSIONS, DEFAULT_CENTER } from '@/core/config'
import { dayKey, distanceKm, num, toman, daysLeft } from '@/core/format'
import { claimDailyReward, levelOf, logActivity } from '@/core/services/engagement'
import { activeSubscription } from '@/core/services/wallet'
import { rankings } from '@/core/services/challenges'
import { Card, Donut, HeroHeader, MetricRow, Orbs, Progress, SectionTitle, StackSections, Stat } from '@/ui/kit'
import { KeyCard } from '@/ui/KeyCard'
import { FoodIcon, MetricIcon, MissionIcon } from '@/ui/icons'
import { useMe } from '@/ui/hooks'
import { run } from '@/ui/toast'
import { GymCard } from '@/modules/fityab/GymCard'
import { ChallengeCard } from '@/modules/challenges/ChallengeCard'
import { StoriesBar } from '@/modules/fitzone/Stories'
import { WeekBars } from '@/ui/WeekBars'

const QUOTES = [
  'پیشرفت مهم است، نه بی‌نقصی',
  'هر قدم کوچک، بخشی از یک مسیر بزرگ است',
  'بدنت را دوست بدار؛ تنها جایی است که در آن زندگی می‌کنی',
  'امروز همان روزی است که دیروز منتظرش بودی',
  'آرام، پیوسته، بی‌وقفه',
]
const TIPS = [
  'پروتئین هر وعده را به ۲۰ تا ۴۰ گرم برسانید تا عضله‌سازی بهینه شود.',
  'یک لیوان آب پیش از هر وعده، هم سیرکننده است و هم به متابولیسم کمک می‌کند.',
  'ده دقیقه پیاده‌روی پس از غذا، قند خون را متعادل نگه می‌دارد.',
  'خواب کمتر از شش ساعت، اشتها را تا ۲۵ درصد افزایش می‌دهد.',
  'اضافه‌بار پیش‌رونده رمز پیشرفت است؛ هر هفته کمی سنگین‌تر یا بیشتر.',
]
const COLORS = { water: '#6ee7c8', steps: '#f2a3e2', workoutMinutes: '#fcd679' }

const More = ({ to, label = 'همه' }: { to: string; label?: string }) => (
  <Link to={to} className="flex items-center gap-0.5 text-xs text-ink-500 transition hover:text-ink-950 dark:text-ink-400 dark:hover:text-white">
    {label} <ChevronLeft size={14} strokeWidth={1.5} />
  </Link>
)

export default function Home() {
  const me = useMe()!
  const nav = useNavigate()
  const logs = useDB((s) => s.dailyLogs)
  const gyms = useDB((s) => s.gyms)
  const challenges = useDB((s) => s.challenges)
  const foods = useDB((s) => s.foods)
  useDB((s) => s.subscriptions)
  const sub = activeSubscription(me.id)
  const today = dayKey()
  const log = logs.find((l) => l.userId === me.id && l.day === today) ?? { water: 0, steps: 0, workoutMinutes: 0, calories: 0, missionsDone: [] as string[], rewardClaimed: false }
  const lvl = levelOf(me.xp)
  const [q, setQ] = useState('')

  const nearGyms = useMemo(
    () => gyms.filter((g) => g.approved).map((g) => ({ g, d: distanceKm(DEFAULT_CENTER, [g.lat, g.lng]) })).sort((a, b) => a.d - b.d).slice(0, 6),
    [gyms],
  )
  // هفت روز اخیر برای نمودار
  const week = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const l = logs.find((x) => x.userId === me.id && x.day === dayKey(d))
      return { label: new Intl.DateTimeFormat('fa-IR', { weekday: 'narrow' }).format(d), value: l?.workoutMinutes ?? 0, today: i === 6 }
    })
  }, [logs, me.id])
  const weekTotal = week.reduce((a, d) => a + d.value, 0)

  const myChallenges = challenges.filter((c) => c.status === 'active' && c.participants.some((p) => p.userId === me.id))
  const hotChallenges = challenges.filter((c) => c.status === 'active' && !c.participants.some((p) => p.userId === me.id)).sort((a, b) => b.pool - a.pool)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'روز بخیر' : 'عصر بخیر'
  const dayIdx = new Date().getDate()
  const allDone = log.missionsDone.length >= DAILY_MISSIONS.length
  const dateLabel = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  const trackers = [
    { key: 'water' as const, title: 'آب', unit: 'لیوان', value: log.water, goal: 8, step: 1 },
    { key: 'steps' as const, title: 'قدم', unit: 'قدم', value: log.steps, goal: 6000, step: 1000 },
    { key: 'workoutMinutes' as const, title: 'تمرین', unit: 'دقیقه', value: log.workoutMinutes, goal: 20, step: 10 },
  ]
  const pct = (v: number, g: number) => Math.min(1, v / g)
  const todayPct = trackers.reduce((a, t) => a + pct(t.value, t.goal), 0) / trackers.length
  const missionPct = log.missionsDone.length / DAILY_MISSIONS.length

  return (
    <div className="animate-fade-up">
      <div className="mb-5 mt-2">
        <div className="text-[13px] text-ink-500 dark:text-ink-400">{dateLabel}</div>
        <h1 className="mt-1 font-display text-[2.6rem] leading-[1.1]">
          {greet}، {me.name.split(' ')[0]}
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* کارت شاخص امروز */}
        <HeroHeader seed="today" className="min-h-[15rem] p-6">
          <div className="flex h-full min-h-[12rem] flex-col justify-between">
            <div>
              <div className="font-display text-[2.4rem] leading-[1.05]">تمرین امروز</div>
              <div className="mt-2 text-sm text-white/70">
                {log.workoutMinutes >= 20 ? 'هدف امروز را کامل کردی' : `${num(Math.max(0, 20 - log.workoutMinutes))} دقیقه تا هدف روزانه`}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <Link to="/fityab" className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink-950 shadow-soft transition hover:scale-105" aria-label="رفتن به باشگاه">
                <ArrowLeft size={22} strokeWidth={1.75} />
              </Link>
              <div className="text-left text-xs text-white/70">
                سطح {num(lvl.level)} · {lvl.title}
              </div>
            </div>
          </div>
        </HeroHeader>

        <div className="grid grid-cols-2 gap-3">
          <Stat tone="violet" icon={<Sparkles size={26} />} value={num(me.xp)} label="امتیاز تجربه" />
          <Stat tone="emerald" icon={<Flame size={26} />} value={`${num(me.streak)} روز`} label="پیاپی فعال" />
          <Link to={sub ? '/fityab' : '/wallet'} className="col-span-2">
            <Stat tone="rose" icon={<Ticket size={26} />} value={sub ? toman(sub.credit) : 'فعال‌سازی عضویت'} label={sub ? `اعتبار ورود · ${num(daysLeft(sub.expiresAt))} روز باقی‌مانده` : 'ورود به همه‌ی باشگاه‌ها با یک عضویت'} />
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <StoriesBar />
      </div>

      <div className="mt-2 grid gap-4 lg:grid-cols-2">
        {/* این هفته */}
        <div>
          <SectionTitle title="این هفته" />
          <Card className="p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500 dark:text-ink-400">مجموع تمرین</span>
              <span className="font-medium tabular-nums">{num(Math.floor(weekTotal / 60))} ساعت و {num(weekTotal % 60)} دقیقه</span>
            </div>
            <WeekBars data={week} max={60} unit="دقیقه" />
          </Card>
        </div>

        {/* امروز: نمودار حلقه‌ای */}
        <div>
          <SectionTitle title="امروز" />
          <Card className="p-5">
            <div className="flex justify-center py-2">
              <Donut
                size={180}
                stroke={11}
                // هر هدف یک‌سوم حلقه است و به اندازه‌ی پیشرفتش پر می‌شود
                segments={trackers.flatMap((t) => [{ value: Math.max(0.03, pct(t.value, t.goal)), color: COLORS[t.key] }, { value: 1 - Math.max(0.03, pct(t.value, t.goal)), color: 'transparent' }])}
                center={
                  <div className="rounded-2xl bg-ink-900/[.06] px-3 py-1.5 text-sm tabular-nums dark:bg-white/[.08]">
                    {num(todayPct * 100)}٪
                  </div>
                }
              />
            </div>
            <div className="mt-3 space-y-1">
              {trackers.map((t) => (
                <div key={t.key} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[t.key] }} />
                  <span className="flex-1">{t.title}</span>
                  <span className="text-xs tabular-nums text-ink-500 dark:text-ink-400">
                    {num(t.value)} / {num(t.goal)} {t.unit}
                  </span>
                  <button
                    onClick={() => logActivity(t.key, t.step)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/[.06] transition hover:bg-ink-900/10 dark:bg-white/[.08] dark:hover:bg-white/[.14]"
                    aria-label={`ثبت ${t.title}`}
                  >
                    <Plus size={13} strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* بخش‌های لایه‌ای */}
      <SectionTitle title="کاوش" />
      <StackSections
        items={[
          { to: '/fityab', title: 'باشگاه‌های اطراف', subtitle: 'ورود بدون ثبت‌نام با عضویت کی‌فیت', grad: 'grad-lavender' },
          { to: '/fityar', title: 'مربی و دستیار هوشمند', subtitle: 'برنامه‌ی تمرین و تغذیه‌ی اختصاصی', grad: 'grad-mint' },
          { to: '/challenges', title: 'چالش‌ها', subtitle: 'رقابت کن، جایزه ببر', grad: 'grad-peach' },
          { to: '/fitzone', title: 'فیت‌زون', subtitle: 'جامعه‌ی ورزشکاران', grad: '', dark: true },
        ]}
      />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: '/shop', t: 'فروشگاه', d: 'مکمل و لوازم' },
          { to: '/buffet', t: 'بوفه', d: 'غذای سالم' },
          { to: '/doctors', t: 'پزشک', d: 'ویزیت آنلاین' },
          { to: '/wallet', t: 'کیف پول', d: 'عضویت و اعتبار' },
        ].map((m, i) => (
          <Link key={m.to} to={m.to} className="relative overflow-hidden rounded-3xl bg-white p-4 shadow-card transition hover:-translate-y-0.5 dark:bg-ink-850 dark:shadow-none">
            <Orbs seed={m.to + i} intensity={0.35} />
            <div className="relative font-display text-2xl leading-none">{m.t}</div>
            <div className="relative mt-1 text-[11px] text-ink-500 dark:text-ink-400">{m.d}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* برنامه‌ی امروز */}
        <div>
          <SectionTitle title="برنامه‌ی امروز" action={<span className="text-xs tabular-nums text-ink-500">{num(log.missionsDone.length)} از {num(DAILY_MISSIONS.length)}</span>} />
          <Card className="px-5 py-2">
            {DAILY_MISSIONS.map((m, i) => {
              const done = log.missionsDone.includes(m.id)
              const link = m.id === 'social' ? '/fitzone' : m.id === 'ai' ? '/fityar' : m.id === 'workout' ? '/fityab' : undefined
              return (
                <MetricRow
                  key={m.id}
                  icon={done ? <Check size={16} /> : <MissionIcon id={m.id} size={17} />}
                  tone={(['emerald', 'rose', 'amber', 'violet', 'emerald'] as const)[i]}
                  title={m.title}
                  value={`+${num(m.xp)}`}
                  done={done}
                  onClick={link && !done ? () => nav(link) : undefined}
                />
              )
            })}
            <button
              disabled={!allDone || log.rewardClaimed}
              onClick={() => run(claimDailyReward, '۱۰۰ امتیاز به حساب شما اضافه شد')}
              className="my-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right text-sm text-ink-500 transition enabled:grad-peach enabled:text-ink-950"
            >
              <Gift size={17} strokeWidth={1.5} />
              <span className="flex-1">{log.rewardClaimed ? 'پاداش امروز دریافت شد' : allDone ? 'دریافت پاداش روزانه' : 'با تکمیل همه‌ی موارد، پاداش روزانه باز می‌شود'}</span>
            </button>
          </Card>
        </div>

        {/* جمله‌ی روز */}
        <div>
          <SectionTitle title="جمله‌ی امروز" />
          <div className="relative flex min-h-[22rem] flex-col items-center justify-between overflow-hidden rounded-[2rem] bg-ink-850 px-6 py-10 text-center">
            <p className="relative max-w-xs bg-gradient-to-l from-brand-300 via-coral-300 to-brand-300 bg-clip-text font-display text-[2.2rem] leading-[1.25] text-transparent">{QUOTES[dayIdx % QUOTES.length]}</p>
            <div className="relative h-36 w-full">
              <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-[70%] -translate-y-1/2 rounded-full bg-gold-300 opacity-80 blur-2xl" />
              <div className="absolute left-1/2 top-1/2 h-32 w-36 -translate-x-[20%] -translate-y-[40%] rounded-full bg-brand-400 opacity-80 blur-2xl" />
              <div className="absolute left-1/2 top-1/2 h-20 w-24 -translate-x-[40%] -translate-y-[10%] rounded-full bg-coral-300 opacity-70 blur-2xl" />
            </div>
            <div className="relative text-sm tabular-nums text-white/70">{num(missionPct * 100)}٪ از برنامه‌ی امروز</div>
          </div>
        </div>
      </div>

      {/* عضویت */}
      <SectionTitle title="عضویت شما" action={<More to="/wallet" label="مدیریت" />} />
      <Link to={sub ? '/fityab' : '/wallet'} className="block max-w-md">
        {sub ? (
          <KeyCard
            tone={sub.plan.id === 'plan-diamond' ? 'mint' : sub.plan.id === 'plan-gold' ? 'lavender' : 'peach'}
            title={`KEYFIT · ${sub.plan.name}`}
            subtitle="اعتبار ورود به باشگاه‌ها"
            amount={sub.credit}
            footer={<><span>{me.name}</span><span>{num(daysLeft(sub.expiresAt))} روز باقی‌مانده</span></>}
          />
        ) : (
          <KeyCard tone="lavender" title="KEYFIT" subtitle="عضویت فعال ندارید" amount="فعال‌سازی عضویت" footer={<span>ورود به همه‌ی باشگاه‌ها با یک عضویت</span>} />
        )}
      </Link>

      {myChallenges.length > 0 && (
        <>
          <SectionTitle title="چالش‌های من" action={<More to="/challenges" />} />
          <Card className="px-5 py-1">
            {myChallenges.map((c) => {
              const ranked = rankings(c)
              const rank = ranked.findIndex((p) => p.userId === me.id) + 1
              const mine = ranked[rank - 1]
              return (
                <Link key={c.id} to={`/challenges/${c.id}`} className="flex items-center gap-3 border-b hairline py-3.5 last:border-0">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl grad-lavender text-ink-950">
                    <MetricIcon metric={c.metric} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{c.title}</div>
                    <Progress value={mine.score / c.goal} className="mt-2" />
                  </div>
                  <div className="w-12 text-left">
                    <div className="text-[10px] text-ink-400">رتبه</div>
                    <div className="font-display text-2xl leading-none">{num(rank)}</div>
                  </div>
                </Link>
              )
            })}
          </Card>
        </>
      )}

      <SectionTitle title="چالش‌های تازه" action={<More to="/challenges" />} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {hotChallenges.map((c) => <ChallengeCard key={c.id} c={c} me={me.id} compact />)}
        <Link to="/challenges/new" className="flex w-52 shrink-0 flex-col items-center justify-center gap-2 rounded-[2rem] border border-dashed border-ink-300 text-sm text-ink-500 transition hover:text-ink-950 dark:border-white/15 dark:hover:text-white">
          <Plus size={18} strokeWidth={1.5} /> ایجاد چالش
        </Link>
      </div>

      <SectionTitle title="باشگاه‌های نزدیک" action={<More to="/fityab" label="نقشه" />} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {nearGyms.map(({ g, d }) => <GymCard key={g.id} gym={g} distance={d} compact />)}
      </div>

      {/* دستیار */}
      <HeroHeader seed="ai-tip" className="mt-9 p-6">
        <div className="font-display text-[1.9rem] leading-none">فیت‌یار</div>
        <p className="mt-3 max-w-lg text-[15px] leading-8 text-white/80">{TIPS[dayIdx % TIPS.length]}</p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            nav(`/fityar?q=${encodeURIComponent(q)}`)
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="پرسش خود را بپرسید…" className="min-w-0 flex-1 rounded-full bg-white/15 px-5 py-3 text-sm text-white outline-none backdrop-blur placeholder:text-white/50 focus:bg-white/20" />
          <button type="submit" className="rounded-full bg-white px-6 text-sm font-medium text-ink-950">
            بپرس
          </button>
        </form>
      </HeroHeader>

      <SectionTitle title="پیشنهاد بوفه" action={<More to="/buffet" />} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {foods.slice(0, 6).map((f) => (
          <Link key={f.id} to={`/buffet/${f.restaurantId}`} className="w-44 shrink-0 rounded-3xl bg-white p-3 shadow-card transition hover:-translate-y-0.5 dark:bg-ink-850 dark:shadow-none">
            <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-ink-900/[.04] text-ink-950 dark:bg-ink-800">
              {f.image ? <img src={f.image} alt="" className="h-full w-full object-cover" /> : <><Orbs seed={f.id} intensity={0.7} /><FoodIcon size={24} className="relative text-white" /></>}
            </div>
            <div className="mt-3 truncate text-[13px] font-medium">{f.name}</div>
            <div className="mt-0.5 text-[11px] tabular-nums text-ink-400">{num(f.calories)} کالری · {num(f.protein)} گرم پروتئین</div>
            <div className="mt-2 text-xs tabular-nums">{toman(f.price)}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
