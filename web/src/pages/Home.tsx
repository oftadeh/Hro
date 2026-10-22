import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Droplets, Flame, Footprints, Gift, Plus, Sparkles, Timer } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { DAILY_MISSIONS, DEFAULT_CENTER } from '@/core/config'
import { dayKey, distanceKm, num, toman, daysLeft } from '@/core/format'
import { claimDailyReward, levelOf, logActivity } from '@/core/services/engagement'
import { activeSubscription } from '@/core/services/wallet'
import { rankings } from '@/core/services/challenges'
import { Avatar, Card, HeroHeader, MetricRow, Progress, RaisedSheet, SectionTitle } from '@/ui/kit'
import { KeyCard } from '@/ui/KeyCard'
import { useMe } from '@/ui/hooks'
import { run } from '@/ui/toast'
import { MODULES } from '@/layouts/nav'
import { GymCard } from '@/modules/fityab/GymCard'
import { ChallengeCard } from '@/modules/challenges/ChallengeCard'
import { StoriesBar } from '@/modules/fitzone/Stories'

const TIPS = [
  'پروتئین هر وعده رو به ۲۰ تا ۴۰ گرم برسون تا عضله‌سازی بهینه بشه 💪',
  'قبل از هر وعده یک لیوان آب بنوش؛ هم سیرکننده است هم متابولیسم رو بالا می‌بره 💧',
  '۱۰ دقیقه پیاده‌روی بعد از غذا قند خون رو متعادل می‌کنه 🚶',
  'خواب کمتر از ۶ ساعت اشتها رو تا ۲۵٪ زیاد می‌کنه 😴',
  'اضافه‌بار پیشرونده رمز پیشرفته؛ هر هفته کمی سنگین‌تر یا بیشتر 📈',
]

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

  const trackers = [
    { key: 'water' as const, icon: <Droplets size={20} />, title: 'آب', unit: 'لیوان', value: log.water, goal: 8, step: 1, add: '+۱', tone: 'sky' as const },
    { key: 'steps' as const, icon: <Footprints size={20} />, title: 'قدم', unit: 'قدم', value: log.steps, goal: 6000, step: 1000, add: '+۱۰۰۰', tone: 'rose' as const },
    { key: 'workoutMinutes' as const, icon: <Timer size={20} />, title: 'تمرین', unit: 'دقیقه', value: log.workoutMinutes, goal: 20, step: 10, add: '+۱۰', tone: 'violet' as const },
  ]
  const missionTone = ['sky', 'rose', 'amber', 'violet', 'emerald'] as const

  return (
    <div className="animate-fade-up">
      {/* هدر بنفش موج‌دار با عدد بزرگ */}
      <HeroHeader className="px-5 pb-14 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar name={me.name} src={me.avatar} size={40} ring />
            <div>
              <div className="text-xs text-white/70">{greet} 👋</div>
              <div className="text-sm font-extrabold">{me.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">
            <Flame size={15} className="text-gold-300" /> {num(me.streak)} روز پیاپی
          </div>
        </div>
        <div className="mt-6 text-center">
          <div className="text-xs font-semibold text-white/70">امتیاز تجربه · سطح {num(lvl.level)} — {lvl.title}</div>
          <div className="mt-1 text-[2.75rem] font-black leading-none tracking-tight">
            {num(me.xp)} <span className="text-lg font-bold text-white/60">XP</span>
          </div>
          {lvl.next && (
            <div className="mx-auto mt-3 max-w-xs">
              <Progress value={lvl.progress} className="h-1.5 !bg-white/20" tone="from-white to-white/70 dark:from-gold-300 dark:to-gold-500" />
              <div className="mt-1.5 text-[11px] text-white/70">{num(lvl.next.xp - me.xp)} امتیاز تا «{lvl.next.title}»</div>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-center gap-2">
          {[
            { to: '/fityab', label: 'برو باشگاه', icon: '📍' },
            { to: '/challenges', label: 'چالش‌ها', icon: '🏆' },
            { to: '/fityar', label: 'فیت‌یار', icon: '🤖' },
          ].map((a) => (
            <Link key={a.to} to={a.to} className="rounded-2xl bg-white/15 px-3.5 py-2 text-xs font-bold backdrop-blur transition hover:bg-white/25">
              {a.icon} {a.label}
            </Link>
          ))}
        </div>
      </HeroHeader>

      {/* ورقه‌ی سفید که روی هدر بالا می‌آید */}
      <RaisedSheet>
        <div className="grid gap-4 md:grid-cols-[minmax(0,300px)_1fr]">
          <Link to={sub ? '/fityab' : '/wallet'} className="block">
            {sub ? (
              <KeyCard
                tilt
                tone={sub.plan.id === 'plan-diamond' ? 'navy' : 'coral'}
                title={`KEYFIT ${sub.plan.name}`}
                subtitle="اعتبار ورود به باشگاه‌ها"
                amount={toman(sub.credit)}
                footer={<><span>{me.name}</span><span>{num(daysLeft(sub.expiresAt))} روز مانده</span></>}
              />
            ) : (
              <KeyCard tilt tone="violet" title="KEYFIT" subtitle="هنوز اشتراک نداری" amount="خرید اشتراک ←" footer={<span>با یک اشتراک وارد همه‌ی باشگاه‌ها شو</span>} />
            )}
          </Link>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-black">امروز من</h2>
              <span className="text-xs text-ink-400">برای ثبت، روی + بزن</span>
            </div>
            {trackers.map((t) => (
              <div key={t.key} className="flex items-center gap-2">
                <div className="flex-1">
                  <MetricRow tone={t.tone} icon={t.icon} title={`${num(t.value)} ${t.unit}`} value={`${num(Math.min(100, (t.value / t.goal) * 100))}٪`} progress={t.value / t.goal} />
                </div>
                <button
                  onClick={() => logActivity(t.key, t.step)}
                  className="h-[70px] w-14 shrink-0 rounded-[1.4rem] bg-ink-900 text-xs font-black text-white transition active:scale-95 dark:bg-gold-400 dark:text-ink-950"
                  aria-label={`${t.add} ${t.title}`}
                >
                  {t.add}
                  <div className="text-[10px] font-semibold opacity-70">{t.title}</div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </RaisedSheet>

      <div className="pt-5">
        <StoriesBar />
      </div>

      {/* مأموریت‌های روزانه */}
      <SectionTitle title="🎯 مأموریت‌های امروز" action={<span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow-card dark:bg-white/5 dark:shadow-none">{num(log.missionsDone.length)} / {num(DAILY_MISSIONS.length)}</span>} />
      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {DAILY_MISSIONS.map((m, i) => {
            const done = log.missionsDone.includes(m.id)
            const link = m.id === 'social' ? '/fitzone' : m.id === 'ai' ? '/fityar' : m.id === 'workout' ? '/fityab' : undefined
            return (
              <MetricRow
                key={m.id}
                tone={missionTone[i % missionTone.length]}
                icon={<span className="text-lg">{done ? '✓' : m.icon}</span>}
                title={m.title}
                value={`+${num(m.xp)} XP`}
                progress={done ? 1 : 0.06}
                done={done}
                onClick={link && !done ? () => nav(link) : undefined}
              />
            )
          })}
          <button
            disabled={!allDone || log.rewardClaimed}
            onClick={() => run(claimDailyReward, '🎁 ۱۰۰ امتیاز گرفتی!')}
            className={clsx(
              'flex items-center gap-3 rounded-[1.4rem] p-3 text-right transition',
              allDone && !log.rewardClaimed ? 'bg-gradient-to-l from-gold-300 to-gold-500 text-ink-950 shadow-gold' : 'border-2 border-dashed border-ink-200 text-ink-400 dark:border-white/10',
            )}
          >
            <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[.95rem] bg-white/40 dark:bg-white/10"><Gift size={20} /></span>
            <span className="flex-1 text-sm font-bold">
              {log.rewardClaimed ? 'جایزه‌ی امروز گرفته شد — فردا برگرد!' : allDone ? 'باز کردن جعبه‌ی جایزه 🎁' : 'همه رو انجام بده تا جعبه باز بشه'}
            </span>
          </button>
        </div>
      </Card>

      {/* ماژول‌ها */}
      <SectionTitle title="همه‌ی خدمات" />
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to} className="group flex flex-col items-center gap-2 rounded-[1.5rem] bg-white py-3 shadow-card transition hover:-translate-y-1 dark:bg-white/[.04] dark:shadow-none">
            <span className={`flex h-12 w-12 items-center justify-center rounded-[1rem] bg-gradient-to-br ${m.color} text-white shadow-soft`}>
              <m.icon size={22} />
            </span>
            <span className="text-[11px] font-bold">{m.label}</span>
          </Link>
        ))}
      </div>

      {/* فیت‌یار هوشمند */}
      <HeroHeader tone="navy" className="mt-6 p-5">
        <div className="flex items-center gap-2 text-sm font-extrabold">
          <Sparkles size={18} className="text-gold-300" /> نکته‌ی امروز فیت‌یار
        </div>
        <p className="mt-2 text-sm leading-7 text-white/80">{tip}</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            nav(`/fityar?q=${encodeURIComponent(q)}`)
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="از فیت‌یار بپرس: برنامه کاهش وزن…" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-gold-400/50" />
          <button type="submit" className="rounded-2xl bg-gradient-to-l from-gold-300 to-gold-500 px-5 text-sm font-black text-ink-950 shadow-gold">بپرس</button>
        </form>
      </HeroHeader>

      {/* چالش‌های من */}
      {myChallenges.length > 0 && (
        <>
          <SectionTitle title="🏆 چالش‌های من" action={<Link to="/challenges" className="flex items-center text-xs font-bold text-brand-600 dark:text-gold-300">همه <ChevronLeft size={14} /></Link>} />
          <div className="space-y-2">
            {myChallenges.map((c) => {
              const ranked = rankings(c)
              const rank = ranked.findIndex((p) => p.userId === me.id) + 1
              const mine = ranked[rank - 1]
              return (
                <Link key={c.id} to={`/challenges/${c.id}`} className="flex items-center gap-3 rounded-[1.6rem] bg-white p-3 shadow-card dark:border dark:border-white/[.07] dark:bg-ink-900/70 dark:shadow-none">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-[1rem] bg-gradient-to-br ${c.gradient} text-2xl shadow-soft`}>{c.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{c.title}</div>
                    <Progress value={mine.score / c.goal} className="mt-1.5" tone="from-coral-400 to-coral-600" />
                    <div className="mt-1 text-[11px] text-ink-400">{num(mine.score)} از {num(c.goal)} {c.unit}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-ink-400">رتبه</div>
                    <div className="text-xl font-black text-brand-600 dark:text-gold-300">{num(rank)}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      <SectionTitle title="🔥 چالش‌های داغ" action={<Link to="/challenges" className="flex items-center text-xs font-bold text-brand-600 dark:text-gold-300">همه <ChevronLeft size={14} /></Link>} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {hotChallenges.map((c) => <ChallengeCard key={c.id} c={c} me={me.id} compact />)}
        <Link to="/challenges/new" className="flex w-48 shrink-0 flex-col items-center justify-center gap-2 rounded-[1.75rem] border-2 border-dashed border-brand-300 text-brand-600 dark:border-gold-400/30 dark:text-gold-300">
          <Plus /> <span className="text-sm font-bold">چالش خودت رو بساز</span>
        </Link>
      </div>

      <SectionTitle title="📍 باشگاه‌های نزدیک" action={<Link to="/fityab" className="flex items-center text-xs font-bold text-brand-600 dark:text-gold-300">نقشه <ChevronLeft size={14} /></Link>} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {nearGyms.map(({ g, d }) => <GymCard key={g.id} gym={g} distance={d} compact />)}
      </div>

      <SectionTitle title="🥗 پیشنهاد سالم امروز" action={<Link to="/buffet" className="flex items-center text-xs font-bold text-brand-600 dark:text-gold-300">بوفه <ChevronLeft size={14} /></Link>} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {foods.slice(0, 6).map((f) => (
          <Link key={f.id} to={`/buffet/${f.restaurantId}`} className="w-40 shrink-0 rounded-[1.6rem] bg-white p-3 shadow-card dark:border dark:border-white/[.07] dark:bg-ink-900/70 dark:shadow-none">
            <div className="flex h-20 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-aqua-300/30 to-brand-200/40 text-4xl dark:from-white/5 dark:to-white/[.02]">{f.emoji}</div>
            <div className="mt-2 truncate text-sm font-bold">{f.name}</div>
            <div className="text-[11px] text-ink-400">{num(f.calories)} کالری · {num(f.protein)}g پروتئین</div>
            <div className="mt-1 text-xs font-black text-brand-600 dark:text-gold-300">{toman(f.price)}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
