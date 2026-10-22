import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronLeft, Gift, Plus } from 'lucide-react'
import { useDB } from '@/core/db'
import { DAILY_MISSIONS, DEFAULT_CENTER } from '@/core/config'
import { dayKey, distanceKm, num, toman, daysLeft } from '@/core/format'
import { claimDailyReward, levelOf, logActivity } from '@/core/services/engagement'
import { activeSubscription } from '@/core/services/wallet'
import { rankings } from '@/core/services/challenges'
import { Card, HeroHeader, MetricRow, Progress, SectionTitle } from '@/ui/kit'
import { KeyCard } from '@/ui/KeyCard'
import { FoodIcon, MetricIcon, MissionIcon } from '@/ui/icons'
import { useMe } from '@/ui/hooks'
import { run } from '@/ui/toast'
import { MODULES } from '@/layouts/nav'
import { GymCard } from '@/modules/fityab/GymCard'
import { ChallengeCard } from '@/modules/challenges/ChallengeCard'
import { StoriesBar } from '@/modules/fitzone/Stories'

const TIPS = [
  'پروتئین هر وعده را به ۲۰ تا ۴۰ گرم برسانید تا عضله‌سازی بهینه شود.',
  'یک لیوان آب پیش از هر وعده، هم سیرکننده است و هم به متابولیسم کمک می‌کند.',
  'ده دقیقه پیاده‌روی پس از غذا، قند خون را متعادل نگه می‌دارد.',
  'خواب کمتر از شش ساعت، اشتها را تا ۲۵ درصد افزایش می‌دهد.',
  'اضافه‌بار پیش‌رونده رمز پیشرفت است؛ هر هفته کمی سنگین‌تر یا بیشتر.',
]

const More = ({ to, label = 'همه' }: { to: string; label?: string }) => (
  <Link to={to} className="flex items-center gap-0.5 text-xs text-ink-500 transition hover:text-ink-950 dark:hover:text-white">
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
  const myChallenges = challenges.filter((c) => c.status === 'active' && c.participants.some((p) => p.userId === me.id))
  const hotChallenges = challenges.filter((c) => c.status === 'active' && !c.participants.some((p) => p.userId === me.id)).sort((a, b) => b.pool - a.pool)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'روز بخیر' : 'عصر بخیر'
  const tip = TIPS[new Date().getDate() % TIPS.length]
  const allDone = log.missionsDone.length >= DAILY_MISSIONS.length
  const dateLabel = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  const trackers = [
    { key: 'water' as const, title: 'آب', unit: 'لیوان', value: log.water, goal: 8, step: 1 },
    { key: 'steps' as const, title: 'قدم', unit: 'قدم', value: log.steps, goal: 6000, step: 1000 },
    { key: 'workoutMinutes' as const, title: 'تمرین', unit: 'دقیقه', value: log.workoutMinutes, goal: 20, step: 10 },
  ]

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <div className="text-[13px] text-ink-500">{dateLabel}</div>
        <h1 className="mt-1 text-[1.75rem] font-light tracking-tight">
          {greet}، <span className="font-medium">{me.name.split(' ')[0]}</span>
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* خلاصه‌ی امروز */}
        <HeroHeader className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] tracking-wide text-white/50">امتیاز تجربه</div>
              <div className="mt-1 text-[3.25rem] font-extralight leading-none tabular-nums tracking-tightest">{num(me.xp)}</div>
              <div className="mt-2 text-xs text-white/60">
                سطح {num(lvl.level)} · {lvl.title}
                {lvl.next && <span className="text-white/40"> — {num(lvl.next.xp - me.xp)} تا {lvl.next.title}</span>}
              </div>
            </div>
            <div className="text-left">
              <div className="text-[11px] tracking-wide text-white/50">روزهای پیاپی</div>
              <div className="mt-1 text-3xl font-extralight tabular-nums text-brand-300">{num(me.streak)}</div>
            </div>
          </div>
          {lvl.next && <Progress value={lvl.progress} className="mt-5 !bg-white/10 [&>div]:!bg-brand-300" />}

          <div className="mt-6 grid grid-cols-3 divide-x divide-x-reverse divide-white/10 border-t border-white/10 pt-5">
            {trackers.map((t) => (
              <div key={t.key} className="px-3 first:pr-0 last:pl-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/50">{t.title}</span>
                  <button
                    onClick={() => logActivity(t.key, t.step)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-brand-300 hover:text-brand-300"
                    aria-label={`ثبت ${t.title}`}
                  >
                    <Plus size={12} strokeWidth={1.75} />
                  </button>
                </div>
                <div className="mt-1.5 text-xl font-light tabular-nums">{num(t.value)}</div>
                <div className="mt-0.5 truncate text-[10px] text-white/35">هدف {num(t.goal)}</div>
              </div>
            ))}
          </div>
        </HeroHeader>

        {/* کارت عضویت */}
        <Link to={sub ? '/fityab' : '/wallet'} className="block">
          {sub ? (
            <KeyCard
              tone={sub.plan.id === 'plan-diamond' ? 'champagne' : sub.plan.id === 'plan-gold' ? 'black' : 'graphite'}
              title={`KEYFIT · ${sub.plan.name}`}
              subtitle="اعتبار ورود به باشگاه‌ها"
              amount={sub.credit}
              footer={<><span>{me.name}</span><span>{num(daysLeft(sub.expiresAt))} روز باقی‌مانده</span></>}
            />
          ) : (
            <KeyCard tone="graphite" title="KEYFIT" subtitle="عضویت فعال ندارید" amount="فعال‌سازی عضویت" footer={<span>ورود به همه‌ی باشگاه‌ها با یک عضویت</span>} />
          )}
        </Link>
      </div>

      <div className="mt-8">
        <StoriesBar />
      </div>

      <div className="grid gap-x-6 lg:grid-cols-2">
        {/* برنامه‌ی امروز */}
        <div>
          <SectionTitle title="برنامه‌ی امروز" action={<span className="text-xs tabular-nums text-ink-500">{num(log.missionsDone.length)} از {num(DAILY_MISSIONS.length)}</span>} />
          <Card className="divide-y hairline px-4 py-1 [&>*]:border-inherit">
            {DAILY_MISSIONS.map((m) => {
              const done = log.missionsDone.includes(m.id)
              const link = m.id === 'social' ? '/fitzone' : m.id === 'ai' ? '/fityar' : m.id === 'workout' ? '/fityab' : undefined
              return (
                <MetricRow
                  key={m.id}
                  icon={done ? <Check size={16} /> : <MissionIcon id={m.id} size={17} />}
                  tone={done ? 'amber' : 'emerald'}
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
              className="flex w-full items-center gap-3 py-3.5 text-right text-sm text-ink-500 disabled:cursor-default enabled:text-ink-950 dark:enabled:text-brand-300"
            >
              <Gift size={17} strokeWidth={1.5} />
              <span className="flex-1">{log.rewardClaimed ? 'پاداش امروز دریافت شد' : allDone ? 'دریافت پاداش روزانه' : 'با تکمیل همه‌ی موارد، پاداش روزانه باز می‌شود'}</span>
              {allDone && !log.rewardClaimed && <ArrowLeft size={16} strokeWidth={1.5} />}
            </button>
          </Card>
        </div>

        {/* خدمات */}
        <div>
          <SectionTitle title="خدمات" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {MODULES.map((m) => (
              <Link key={m.to} to={m.to} className="group flex items-center gap-3 rounded-2xl border hairline bg-white p-3 transition hover:border-ink-300 dark:bg-ink-900 dark:hover:border-white/15">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900/[.05] text-ink-800 dark:bg-white/[.06] dark:text-ink-100">
                  <m.icon size={18} strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{m.label}</div>
                  <div className="truncate text-[11px] text-ink-400">{m.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* فیت‌یار */}
      <Card className="mt-8 p-5">
        <div className="text-[11px] font-medium tracking-wide text-brand-600 dark:text-brand-300">نکته‌ی امروز فیت‌یار</div>
        <p className="mt-2 text-[15px] leading-8">{tip}</p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            nav(`/fityar?q=${encodeURIComponent(q)}`)
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="پرسش خود را از دستیار هوشمند بپرسید…" className="min-w-0 flex-1 rounded-xl border hairline bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-ink-400 focus:border-ink-900 dark:focus:border-brand-300/60" />
          <button type="submit" className="rounded-xl bg-ink-950 px-5 text-sm text-white dark:bg-brand-300 dark:text-ink-950">
            پرسیدن
          </button>
        </form>
      </Card>

      {myChallenges.length > 0 && (
        <>
          <SectionTitle title="چالش‌های من" action={<More to="/challenges" />} />
          <Card className="divide-y hairline px-4 py-1 [&>*]:border-inherit">
            {myChallenges.map((c) => {
              const ranked = rankings(c)
              const rank = ranked.findIndex((p) => p.userId === me.id) + 1
              const mine = ranked[rank - 1]
              return (
                <Link key={c.id} to={`/challenges/${c.id}`} className="flex items-center gap-3 py-3.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-950 text-brand-300">
                    <MetricIcon metric={c.metric} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{c.title}</div>
                    <Progress value={mine.score / c.goal} className="mt-2" />
                  </div>
                  <div className="w-14 text-left">
                    <div className="text-[10px] text-ink-400">رتبه</div>
                    <div className="text-lg font-light tabular-nums">{num(rank)}</div>
                  </div>
                </Link>
              )
            })}
          </Card>
        </>
      )}

      <SectionTitle title="چالش‌های فعال" action={<More to="/challenges" />} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {hotChallenges.map((c) => <ChallengeCard key={c.id} c={c} me={me.id} compact />)}
        <Link to="/challenges/new" className="flex w-52 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed hairline text-sm text-ink-500 transition hover:text-ink-950 dark:hover:text-white">
          <Plus size={18} strokeWidth={1.5} /> ایجاد چالش
        </Link>
      </div>

      <SectionTitle title="باشگاه‌های نزدیک" action={<More to="/fityab" label="نقشه" />} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {nearGyms.map(({ g, d }) => <GymCard key={g.id} gym={g} distance={d} compact />)}
      </div>

      <SectionTitle title="پیشنهاد بوفه" action={<More to="/buffet" />} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {foods.slice(0, 6).map((f) => (
          <Link key={f.id} to={`/buffet/${f.restaurantId}`} className="w-44 shrink-0 rounded-2xl border hairline bg-white p-3 transition hover:border-ink-300 dark:bg-ink-900 dark:hover:border-white/15">
            <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-ink-900/[.04] text-ink-300 dark:bg-white/[.04] dark:text-ink-600">
              {f.image ? <img src={f.image} alt="" className="h-full w-full object-cover" /> : <FoodIcon size={26} />}
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
