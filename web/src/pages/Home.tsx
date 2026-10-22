import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronLeft, Gift, Plus } from 'lucide-react'
import { useDB } from '@/core/db'
import { DAILY_MISSIONS, DEFAULT_CENTER } from '@/core/config'
import { dayKey, distanceKm, num, toman, daysLeft } from '@/core/format'
import { claimDailyReward, levelOf, logActivity } from '@/core/services/engagement'
import { activeSubscription } from '@/core/services/wallet'
import { rankings } from '@/core/services/challenges'
import { Card, Donut, HeroHeader, MetricRow, Orbs, Progress, Ring, SectionTitle, StackSections, Stat } from '@/ui/kit'
import { Bot, ChatBubbles, Coach, Doctor as DoctorArt, Flame as FlameArt, HeartPulse, Lifter, MapPin, Runner, SaladBowl, Shaker, Trophy, WaterGlass, WalletCoins, Yoga } from '@/ui/art'
import { CountUp } from '@/ui/motion'
import { KeyCard } from '@/ui/KeyCard'
import { MetricIcon, MissionIcon } from '@/ui/icons'
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

function AddBtn({ onClick, label, light }: { onClick: () => void; label: string; light?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`absolute bottom-3 right-3 z-10 flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-medium backdrop-blur transition active:scale-90 ${light ? 'bg-white/25 text-white hover:bg-white/35' : 'bg-white/60 text-ink-950 hover:bg-white/80'}`}
      aria-label={`ثبت ${label}`}
    >
      <Plus size={12} strokeWidth={2} /> {label}
    </button>
  )
}

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
          <Runner size={190} className="pointer-events-none absolute -bottom-6 left-2 drop-shadow-2xl" />
          <div className="relative flex h-full min-h-[12rem] flex-col justify-between">
            <div>
              <div className="font-display text-[2.4rem] leading-[1.05]">تمرین امروز</div>
              <div className="mt-2 text-sm text-white/70">
                {log.workoutMinutes >= 20 ? 'هدف امروز را کامل کردی' : `${num(Math.max(0, 20 - log.workoutMinutes))} دقیقه تا هدف روزانه`}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-xs text-white/70">
                سطح {num(lvl.level)} · {lvl.title}
              </div>
              <Link to="/fityab" className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink-950 shadow-soft transition hover:scale-105 max-sm:hidden" aria-label="رفتن به باشگاه">
                <span className="absolute inset-0 rounded-full bg-white kf-ripple" />
                <ArrowLeft size={22} strokeWidth={1.75} className="relative" />
              </Link>
            </div>
            <Link to="/fityab" className="mt-4 flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-ink-950 shadow-soft sm:hidden">
              شروع تمرین <ArrowLeft size={16} strokeWidth={1.75} />
            </Link>
          </div>
        </HeroHeader>

        <div className="stagger grid grid-cols-2 gap-3">
          <Stat tone="violet" art={<Trophy size={78} />} value={<CountUp value={me.xp} />} label="امتیاز تجربه" />
          <Stat tone="emerald" art={<FlameArt size={70} />} value={<><CountUp value={me.streak} /> روز</>} label="پیاپی فعال" />
          <Link to={sub ? '/fityab' : '/wallet'} className="col-span-2">
            <Stat tone="rose" art={<WalletCoins size={92} />} value={sub ? <><CountUp value={sub.credit} /> تومان</> : 'فعال‌سازی عضویت'} label={sub ? `اعتبار ورود · ${num(daysLeft(sub.expiresAt))} روز باقی‌مانده` : 'ورود به همه‌ی باشگاه‌ها با یک عضویت'} />
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

        {/* امروز: کاشی‌های زنده */}
        <div>
          <SectionTitle title="امروز" action={<span className="text-xs tabular-nums text-ink-500">{num(todayPct * 100)}٪ از اهداف</span>} />
          <div className="stagger grid grid-cols-2 gap-3">
            {/* قدم */}
            <div className="lift-hover relative min-h-[12.5rem] overflow-hidden rounded-3xl bg-gradient-to-br from-coral-300 to-coral-400 p-4 text-ink-950">
              <div className="relative z-10">
                <div className="text-xs font-medium opacity-70">پیاده‌روی</div>
                <div className="mt-1 font-display text-[2rem] leading-none"><CountUp value={log.steps} /></div>
                <div className="text-[11px] opacity-70">از {num(6000)} قدم</div>
              </div>
              <Runner size={104} shirt="#fff" accent="#fcd679" className="absolute -bottom-3 -left-3" />
              <div className="absolute left-3 top-3">
                <Ring value={pct(log.steps, 6000)} size={38} stroke={4} color="#ffffff">
                  <span className="text-[9px] tabular-nums">{num(pct(log.steps, 6000) * 100)}٪</span>
                </Ring>
              </div>
              <AddBtn onClick={() => logActivity('steps', 1000)} label="+۱۰۰۰" />
            </div>
            {/* آب */}
            <div className="lift-hover relative row-span-2 overflow-hidden rounded-3xl bg-gradient-to-b from-aqua-400 to-[#3b82f6] p-4 text-white">
              <div className="relative z-10">
                <div className="text-xs font-medium opacity-80">آب</div>
                <div className="mt-1 font-display text-[2rem] leading-none"><CountUp value={log.water} /> <span className="font-sans text-xs">لیوان</span></div>
                <div className="text-[11px] opacity-80">هدف {num(8)} لیوان</div>
              </div>
              <WaterGlass level={log.water / 8} size={150} className="mx-auto mb-10 mt-4" />
              <AddBtn onClick={() => logActivity('water', 1)} label="+۱ لیوان" light />
            </div>
            {/* تمرین */}
            <div className="lift-hover relative min-h-[12.5rem] overflow-hidden rounded-3xl grad-lavender p-4 text-ink-950">
              <div className="relative z-10">
                <div className="text-xs font-medium opacity-70">تمرین</div>
                <div className="mt-1 font-display text-[2rem] leading-none"><CountUp value={log.workoutMinutes} /> <span className="font-sans text-xs">دقیقه</span></div>
                <div className="text-[11px] opacity-70">هدف {num(20)} دقیقه</div>
              </div>
              <Lifter size={100} shirt="#fff" className="absolute -bottom-3 -left-3" />
              <AddBtn onClick={() => logActivity('workoutMinutes', 10)} label="+۱۰" />
            </div>
            {/* خلاصه */}
            <div className="relative col-span-2 flex items-center gap-4 overflow-hidden rounded-3xl bg-white p-4 shadow-card dark:bg-ink-850 dark:shadow-none">
              <Donut
                size={96}
                stroke={8}
                // هر هدف یک‌سوم حلقه است و به اندازه‌ی پیشرفتش پر می‌شود
                segments={trackers.flatMap((t) => [{ value: Math.max(0.03, pct(t.value, t.goal)), color: COLORS[t.key] }, { value: 1 - Math.max(0.03, pct(t.value, t.goal)), color: 'transparent' }])}
                center={<span className="text-sm tabular-nums">{num(todayPct * 100)}٪</span>}
              />
              <div className="min-w-0 flex-1">
                <div className="font-display text-2xl leading-none">ضربان روز</div>
                <div className="mt-1 text-xs leading-6 text-ink-500 dark:text-ink-400">
                  {todayPct >= 1 ? 'همه‌ی اهداف امروز کامل شد!' : 'هر ثبت، حلقه را کامل‌تر می‌کند.'}
                </div>
              </div>
              <HeartPulse size={84} className="shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* بخش‌های لایه‌ای */}
      <SectionTitle title="کاوش" />
      <StackSections
        items={[
          { to: '/fityab', title: 'باشگاه‌های اطراف', subtitle: 'ورود بدون ثبت‌نام با عضویت کی‌فیت', grad: 'grad-lavender', art: <MapPin size={110} /> },
          { to: '/fityar', title: 'مربی و دستیار هوشمند', subtitle: 'برنامه‌ی تمرین و تغذیه‌ی اختصاصی', grad: 'grad-mint', art: <Coach size={120} shirt="#a78bfa" /> },
          { to: '/challenges', title: 'چالش‌ها', subtitle: 'رقابت کن، جایزه ببر', grad: 'grad-peach', art: <Trophy size={112} /> },
          { to: '/fitzone', title: 'فیت‌زون', subtitle: 'جامعه‌ی ورزشکاران', grad: '', dark: true, art: <ChatBubbles size={118} /> },
        ]}
      />
      <div className="stagger mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: '/shop', t: 'فروشگاه', d: 'مکمل و لوازم', art: <Shaker size={84} /> },
          { to: '/buffet', t: 'بوفه', d: 'غذای سالم', art: <SaladBowl size={92} /> },
          { to: '/doctors', t: 'پزشک', d: 'ویزیت آنلاین', art: <DoctorArt size={92} /> },
          { to: '/wallet', t: 'کیف پول', d: 'عضویت و اعتبار', art: <WalletCoins size={88} /> },
        ].map((m, i) => (
          <Link key={m.to} to={m.to} className="lift-hover relative min-h-[9.5rem] overflow-hidden rounded-3xl bg-white p-4 shadow-card dark:bg-ink-850 dark:shadow-none">
            <Orbs seed={m.to + i} intensity={0.3} />
            <div className="relative font-display text-2xl leading-none">{m.t}</div>
            <div className="relative mt-1 text-[11px] text-ink-500 dark:text-ink-400">{m.d}</div>
            <div className="absolute -bottom-1 left-2">{m.art}</div>
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
            <div className="relative flex h-40 w-full items-center justify-center">
              <div className="kf-drift absolute left-1/2 top-1/2 h-32 w-32 -translate-x-[70%] -translate-y-1/2 rounded-full bg-gold-300 opacity-60 blur-2xl" />
              <div className="kf-drift absolute left-1/2 top-1/2 h-32 w-36 -translate-x-[20%] -translate-y-[40%] rounded-full bg-brand-400 opacity-60 blur-2xl" style={{ animationDelay: '-6s' }} />
              <Yoga size={150} className="relative" />
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
      <div className="stagger -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {hotChallenges.map((c) => <ChallengeCard key={c.id} c={c} me={me.id} compact />)}
        <Link to="/challenges/new" className="flex w-52 shrink-0 flex-col items-center justify-center gap-2 rounded-[2rem] border border-dashed border-ink-300 text-sm text-ink-500 transition hover:text-ink-950 dark:border-white/15 dark:hover:text-white">
          <Plus size={18} strokeWidth={1.5} /> ایجاد چالش
        </Link>
      </div>

      <SectionTitle title="باشگاه‌های نزدیک" action={<More to="/fityab" label="نقشه" />} />
      <div className="stagger -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {nearGyms.map(({ g, d }) => <GymCard key={g.id} gym={g} distance={d} compact />)}
      </div>

      {/* دستیار */}
      <HeroHeader seed="ai-tip" className="mt-9 p-6">
        <Bot size={110} className="pointer-events-none absolute -top-2 left-0 sm:left-4" />
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
              {f.image ? <img src={f.image} alt="" className="h-full w-full object-cover" /> : <><Orbs seed={f.id} intensity={0.6} /><SaladBowl size={86} className="relative" /></>}
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
