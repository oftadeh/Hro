import { Link } from 'react-router-dom'
import type { Challenge } from '@/core/types'
import { daysLeft, num, toman } from '@/core/format'
import { MetricIcon } from '@/ui/icons'
import { Money, Orbs } from '@/ui/kit'
import { MetricArt } from '@/ui/art'

/** کارت چالش به سبک «Relieve Stress»: تیتر سریف روی گوی‌های رنگی */
export function ChallengeCard({ c, me, compact }: { c: Challenge; me?: string; compact?: boolean }) {
  const joined = me && c.participants.some((p) => p.userId === me)
  const left = daysLeft(c.endAt)
  return (
    <Link
      to={`/challenges/${c.id}`}
      className={`lift-hover group relative flex min-h-[16rem] flex-col overflow-hidden rounded-[2rem] bg-ink-850 p-5 text-white ${compact ? 'w-72 shrink-0' : ''}`}
    >
      <Orbs seed={c.id} intensity={0.85} />
      <MetricArt metric={c.metric} size={118} className="pointer-events-none absolute -bottom-2 left-1 opacity-95" />
      <div className="relative flex items-center justify-between text-[11px] text-white/75">
        <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
          <MetricIcon metric={c.metric} size={13} />
          {c.unit}
        </span>
        <span>{c.status === 'finished' ? 'پایان‌یافته' : left > 0 ? `${num(left)} روز مانده` : 'اعلام نتایج'}</span>
      </div>
      <h3 className="relative mt-4 line-clamp-2 max-w-[75%] font-display text-[1.9rem] leading-[1.1]">{c.title}</h3>
      <div className="relative mt-auto pr-0 pt-4 text-right">
        <div className="text-[11px] text-white/65">صندوق جایزه</div>
        <div className="font-display text-[1.75rem] leading-none"><Money value={c.pool} unitClass="font-sans" /></div>
        <div className="mt-3 flex flex-col items-start gap-2 text-[11px] text-white/70">
          <span>{num(c.participants.length)} شرکت‌کننده</span>
          <span className="rounded-full bg-white/20 px-2.5 py-1 backdrop-blur">{joined ? 'عضو هستید' : c.entryFee ? `ورودی ${toman(c.entryFee)}` : 'ورود رایگان'}</span>
        </div>
      </div>
    </Link>
  )
}
