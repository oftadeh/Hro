/** اجزای مشترک پروفایل شخصی و عمومی */
import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Award, CalendarCheck, Flame, Footprints, MapPin as Pin, Medal, Trophy as TrophyIcon, Users } from 'lucide-react'
import { ROLE_META } from '@/core/config'
import { num } from '@/core/format'
import { GOALS } from '@/core/profile'
import { levelOf } from '@/core/services/engagement'
import type { User } from '@/core/types'
import { Avatar, Donut, Orbs } from '@/ui/kit'
import { RoleIcon } from '@/ui/icons'
import { Runner, Yoga } from '@/ui/art'
import { CountUp } from '@/ui/motion'

export function ProfileHero({ user, actions, extra }: { user: User; actions?: ReactNode; extra?: ReactNode }) {
  const lvl = levelOf(user.xp)
  const since = new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt))
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-ink-850 text-white">
      <Orbs seed={user.id} intensity={0.9} />
      <div className="pointer-events-none absolute -bottom-4 left-2 opacity-90 max-sm:hidden">
        {user.gender === 'female' ? <Yoga size={170} /> : <Runner size={180} male={user.gender === 'male'} />}
      </div>
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          {/* آواتار با حلقه‌ی پیشرفت سطح */}
          <div className="relative shrink-0">
            <Donut size={96} stroke={4} segments={[{ value: Math.max(0.02, lvl.progress), color: '#a48bff' }, { value: 1 - Math.max(0.02, lvl.progress), color: 'rgba(255,255,255,.12)' }]} center={<Avatar name={user.name} src={user.avatar} size={80} />} />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full card-violet px-2 py-0.5 text-[12px] font-medium text-ink-950">سطح {num(lvl.level)}</span>
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="truncate font-display text-[2rem] leading-[1.1]">{user.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/60">
              {user.city && <span className="flex items-center gap-1"><Pin size={11} /> {user.city}</span>}
              <span>عضو از {since}</span>
              {user.goal && <span>هدف: {GOALS[user.goal]}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[12px]">{lvl.title}</span>
              {user.roles
                .filter((r) => r !== 'user')
                .map((r) => (
                  <span key={r} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[12px]">
                    <RoleIcon role={r} size={11} /> {ROLE_META[r].label}
                  </span>
                ))}
            </div>
          </div>
        </div>
        {user.bio && <p className="mt-4 max-w-md text-sm leading-7 text-white/75">{user.bio}</p>}
        {extra}
        {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function StatRow({ items }: { items: [string, number][] }) {
  return (
    <div className="mt-3 grid grid-cols-4 divide-x divide-x-reverse divide-ink-900/[.06] rounded-3xl bg-white py-4 shadow-card dark:divide-white/[.06] dark:bg-ink-850 dark:shadow-none">
      {items.map(([l, v]) => (
        <div key={l} className="text-center">
          <div className="font-display text-[1.7rem] leading-none tabular-nums"><CountUp value={v} /></div>
          <div className="mt-1 text-[12px] text-ink-400">{l}</div>
        </div>
      ))}
    </div>
  )
}

export interface Achievement {
  id: string
  title: string
  desc: string
  icon: ReactNode
  done: boolean
}

export function achievementsOf(user: User, s: { checkins: number; challenges: number; wins: number; posts: number; followers: number }): Achievement[] {
  return [
    { id: 'first', title: 'اولین ورود', desc: 'ورود به باشگاه با کی‌فیت', icon: <CalendarCheck size={18} />, done: s.checkins >= 1 },
    { id: 'regular', title: 'پای ثابت', desc: '۱۰ ورود به باشگاه', icon: <Footprints size={18} />, done: s.checkins >= 10 },
    { id: 'streak7', title: 'هفته‌ی آتشین', desc: '۷ روز فعالیت پیاپی', icon: <Flame size={18} />, done: user.streak >= 7 },
    { id: 'streak30', title: 'بی‌وقفه', desc: '۳۰ روز فعالیت پیاپی', icon: <Flame size={18} />, done: user.streak >= 30 },
    { id: 'challenger', title: 'رقابت‌جو', desc: 'شرکت در یک چالش', icon: <TrophyIcon size={18} />, done: s.challenges >= 1 },
    { id: 'winner', title: 'برنده', desc: 'تکمیل هدف یک چالش', icon: <Medal size={18} />, done: s.wins >= 1 },
    { id: 'social', title: 'الهام‌بخش', desc: '۱۰ دنبال‌کننده', icon: <Users size={18} />, done: s.followers >= 10 },
    { id: 'hero', title: 'قهرمان', desc: 'رسیدن به سطح ۵', icon: <Award size={18} />, done: levelOf(user.xp).level >= 5 },
  ]
}

export function Achievements({ list }: { list: Achievement[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {list.map((a) => (
        <div key={a.id} className={clsx('rounded-3xl p-4 transition', a.done ? 'grad-peach text-ink-950' : 'bg-white text-ink-400 shadow-card dark:bg-ink-850 dark:shadow-none')}>
          <span className={clsx('flex h-10 w-10 items-center justify-center rounded-2xl', a.done ? 'bg-white/60' : 'bg-ink-900/[.05] dark:bg-white/[.06]')}>{a.icon}</span>
          <div className={clsx('mt-3 text-sm font-medium', !a.done && 'text-ink-500')}>{a.title}</div>
          <div className="mt-0.5 text-[12px] leading-5 opacity-70">{a.desc}</div>
        </div>
      ))}
    </div>
  )
}

/** نشانگر BMI روی طیف رنگی */
export function BmiGauge({ bmi }: { bmi: number }) {
  const pos = Math.min(1, Math.max(0, (bmi - 15) / (35 - 15)))
  return (
    <div className="mt-4">
      <div className="relative h-2.5 rounded-full" style={{ background: 'linear-gradient(to left, #ff9a4d 0%, #4ff3da 17.5%, #4ff3da 50%, #ff9a4d 75%, #ff2f7d 100%)' }}>
        <span className="absolute top-1/2 h-5 w-5 -translate-y-1/2 translate-x-1/2 rounded-full border-4 border-white bg-ink-950 shadow-soft transition-all duration-700" style={{ right: `${pos * 100}%` }} />
      </div>
      <div className="relative mt-2 h-4 text-[12px] tabular-nums text-ink-400">
        {[15, 18.5, 25, 30, 35].map((t) => (
          <span key={t} className="absolute translate-x-1/2" style={{ right: `${((t - 15) / 20) * 100}%` }}>
            {t.toLocaleString('fa-IR')}
          </span>
        ))}
      </div>
    </div>
  )
}
