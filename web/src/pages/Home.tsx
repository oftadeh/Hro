import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Droplets, Flame, Footprints, Gift, Plus, Sparkles, Timer } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { DAILY_MISSIONS, DEFAULT_CENTER } from '@/core/config'
import { dayKey, distanceKm, num, toman, daysLeft } from '@/core/format'
import { claimDailyReward, levelOf, logActivity } from '@/core/services/engagement'
import { activeSubscription } from '@/core/services/wallet'
import { rankings } from '@/core/services/challenges'
import { Button, Card, Progress, Ring, SectionTitle } from '@/ui/kit'
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

  return (
    <div className="space-y-2 animate-fade-up">
      {/* خوش‌آمد و سطح */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink-900 via-ink-850 to-ink-800 p-5 text-white shadow-soft">
        <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-48 w-48 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <Ring value={lvl.progress} size={76} stroke={7} color="#34d399">
            <div>
              <div className="text-[10px] text-white/60">سطح</div>
              <div className="text-xl font-black">{num(lvl.level)}</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white/60">{greet} 👋</div>
            <div className="truncate text-xl font-extrabold">{me.name}</div>
            <div className="mt-1 text-xs text-white/70">
              {lvl.title} · {num(me.xp)} XP {lvl.next && <span className="opacity-70">· {num(lvl.next.xp - me.xp)} تا {lvl.next.title}</span>}
            </div>
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-white/10 px-3 py-2 backdrop-blur">
            <Flame className="text-orange-400" size={22} />
            <div className="text-lg font-black leading-none">{num(me.streak)}</div>
            <div className="text-[10px] text-white/60">روز پیاپی</div>
          </div>
        </div>
        {/* اشتراک */}
        <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur">
          {sub ? (
            <>
              <div className={`rounded-xl bg-gradient-to-br ${sub.plan.color} px-2.5 py-1 text-xs font-black text-ink-900`}>{sub.plan.name}</div>
              <div className="min-w-0 flex-1 text-xs">
                <div className="font-bold">اعتبار ورود: {toman(sub.credit)}</div>
                <div className="text-white/60">{num(daysLeft(sub.expiresAt))} روز تا پایان اشتراک</div>
              </div>
              <Link to="/fityab" className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-ink-900">برو باشگاه</Link>
            </>
          ) : (
            <>
              <div className="flex-1 text-xs">
                <div className="font-bold">هنوز اشتراک نداری!</div>
                <div className="text-white/60">با یک اشتراک وارد همه‌ی باشگاه‌ها شو</div>
              </div>
              <Link to="/wallet" className="rounded-xl bg-gradient-to-l from-emerald-400 to-teal-400 px-3 py-2 text-xs font-bold text-ink-900">خرید اشتراک</Link>
            </>
          )}
        </div>
      </div>

      <div className="pt-3">
        <StoriesBar />
      </div>

      {/* ردیابی روزانه */}
      <SectionTitle title="امروز من" />
      <div className="grid grid-cols-3 gap-3">
        <Tracker icon={<Droplets size={18} />} label="آب" value={log.water} goal={8} unit="لیوان" color="#38bdf8" onAdd={() => logActivity('water', 1)} />
        <Tracker icon={<Footprints size={18} />} label="قدم" value={log.steps} goal={6000} unit="قدم" color="#f97316" onAdd={() => logActivity('steps', 1000)} addLabel="+۱۰۰۰" />
        <Tracker icon={<Timer size={18} />} label="تمرین" value={log.workoutMinutes} goal={20} unit="دقیقه" color="#a855f7" onAdd={() => logActivity('workoutMinutes', 10)} addLabel="+۱۰" />
      </div>

      {/* مأموریت‌های روزانه */}
      <SectionTitle title="🎯 مأموریت‌های امروز" action={<span className="text-xs text-ink-400">{num(log.missionsDone.length)} از {num(DAILY_MISSIONS.length)}</span>} />
      <Card>
        <Progress value={log.missionsDone.length / DAILY_MISSIONS.length} className="mb-3" />
        <div className="space-y-1">
          {DAILY_MISSIONS.map((m) => {
            const done = log.missionsDone.includes(m.id)
            const link = m.id === 'social' ? '/fitzone' : m.id === 'ai' ? '/fityar' : m.id === 'workout' ? '/fityab' : undefined
            return (
              <div key={m.id} onClick={() => link && !done && nav(link)} className={clsx('flex items-center gap-3 rounded-2xl p-2', link && !done && 'cursor-pointer hover:bg-ink-50 dark:hover:bg-white/5')}>
                <span className={clsx('flex h-9 w-9 items-center justify-center rounded-xl text-lg', done ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-ink-100 dark:bg-white/5')}>{done ? '✅' : m.icon}</span>
                <span className={clsx('flex-1 text-sm', done && 'text-ink-400 line-through')}>{m.title}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{num(m.xp)} XP</span>
              </div>
            )
          })}
        </div>
        <Button
          className="mt-3 w-full"
          variant={allDone && !log.rewardClaimed ? 'primary' : 'outline'}
          disabled={!allDone || log.rewardClaimed}
          icon={<Gift size={18} />}
          onClick={() => run(claimDailyReward, '🎁 ۱۰۰ امتیاز گرفتی!')}
        >
          {log.rewardClaimed ? 'جایزه‌ی امروز دریافت شد — فردا برگرد!' : allDone ? 'باز کردن جعبه‌ی جایزه' : 'همه‌ی مأموریت‌ها رو انجام بده تا جعبه باز بشه'}
        </Button>
      </Card>

      {/* ماژول‌ها */}
      <SectionTitle title="همه‌ی خدمات" />
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to} className="group flex flex-col items-center gap-1.5">
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} text-white shadow-soft transition group-hover:-translate-y-1 group-hover:shadow-lg`}>
              <m.icon size={24} />
            </span>
            <span className="text-[11px] font-semibold">{m.label}</span>
          </Link>
        ))}
      </div>

      {/* فیت‌یار هوشمند */}
      <Card className="mt-6 bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-500/10 dark:to-indigo-500/10">
        <div className="flex items-center gap-2 text-sm font-extrabold">
          <Sparkles size={18} className="text-indigo-500" /> نکته‌ی امروز فیت‌یار
        </div>
        <p className="mt-2 text-sm leading-7 text-ink-600 dark:text-ink-300">{tip}</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            nav(`/fityar?q=${encodeURIComponent(q)}`)
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="از فیت‌یار بپرس: برنامه کاهش وزن…" className="flex-1 rounded-2xl border border-indigo-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-ink-900" />
          <Button type="submit" className="!bg-none !bg-indigo-500 !shadow-none">بپرس</Button>
        </form>
      </Card>

      {/* چالش‌های من */}
      {myChallenges.length > 0 && (
        <>
          <SectionTitle title="🏆 چالش‌های من" action={<Link to="/challenges" className="flex items-center text-xs font-semibold text-emerald-600">همه <ChevronLeft size={14} /></Link>} />
          <div className="space-y-2">
            {myChallenges.map((c) => {
              const ranked = rankings(c)
              const rank = ranked.findIndex((p) => p.userId === me.id) + 1
              const mine = ranked[rank - 1]
              return (
                <Link key={c.id} to={`/challenges/${c.id}`} className="flex items-center gap-3 rounded-3xl border border-ink-100 bg-white p-3 shadow-soft dark:border-white/5 dark:bg-ink-900">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${c.gradient} text-2xl`}>{c.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{c.title}</div>
                    <Progress value={mine.score / c.goal} className="mt-1.5" tone="from-amber-400 to-orange-500" />
                    <div className="mt-1 text-[11px] text-ink-400">{num(mine.score)} از {num(c.goal)} {c.unit}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-ink-400">رتبه</div>
                    <div className="text-xl font-black text-amber-500">{num(rank)}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      <SectionTitle title="🔥 چالش‌های داغ" action={<Link to="/challenges" className="flex items-center text-xs font-semibold text-emerald-600">همه <ChevronLeft size={14} /></Link>} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {hotChallenges.map((c) => <ChallengeCard key={c.id} c={c} me={me.id} compact />)}
        <Link to="/challenges/new" className="flex w-48 shrink-0 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-amber-300 text-amber-600 dark:border-amber-500/30">
          <Plus /> <span className="text-sm font-bold">چالش خودت رو بساز</span>
        </Link>
      </div>

      <SectionTitle title="📍 باشگاه‌های نزدیک" action={<Link to="/fityab" className="flex items-center text-xs font-semibold text-emerald-600">نقشه <ChevronLeft size={14} /></Link>} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {nearGyms.map(({ g, d }) => <GymCard key={g.id} gym={g} distance={d} compact />)}
      </div>

      <SectionTitle title="🥗 پیشنهاد سالم امروز" action={<Link to="/buffet" className="flex items-center text-xs font-semibold text-emerald-600">بوفه <ChevronLeft size={14} /></Link>} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {foods.slice(0, 6).map((f) => (
          <Link key={f.id} to={`/buffet/${f.restaurantId}`} className="w-40 shrink-0 rounded-3xl border border-ink-100 bg-white p-3 shadow-soft dark:border-white/5 dark:bg-ink-900">
            <div className="flex h-20 items-center justify-center rounded-2xl bg-lime-50 text-4xl dark:bg-lime-500/10">{f.emoji}</div>
            <div className="mt-2 truncate text-sm font-bold">{f.name}</div>
            <div className="text-[11px] text-ink-400">{num(f.calories)} کالری · {num(f.protein)}g پروتئین</div>
            <div className="mt-1 text-xs font-bold text-emerald-600">{toman(f.price)}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Tracker({ icon, label, value, goal, unit, color, onAdd, addLabel = '+۱' }: { icon: ReactNode; label: string; value: number; goal: number; unit: string; color: string; onAdd: () => void; addLabel?: string }) {
  return (
    <Card className="flex flex-col items-center p-3 text-center">
      <Ring value={value / goal} size={62} stroke={6} color={color}>
        <span style={{ color }}>{icon}</span>
      </Ring>
      <div className="mt-2 text-sm font-extrabold">{num(value)}</div>
      <div className="text-[10px] text-ink-400">
        از {num(goal)} {unit}
      </div>
      <button onClick={onAdd} className="mt-2 w-full rounded-xl bg-ink-100 py-1.5 text-xs font-bold hover:bg-ink-200 dark:bg-white/5 dark:hover:bg-white/10">
        {addLabel} {label}
      </button>
    </Card>
  )
}
