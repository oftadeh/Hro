import { Link } from 'react-router-dom'
import type { Challenge } from '@/core/types'
import { daysLeft, num, toman } from '@/core/format'
import { MetricIcon } from '@/ui/icons'
import { Money } from '@/ui/kit'

export function ChallengeCard({ c, me, compact }: { c: Challenge; me?: string; compact?: boolean }) {
  const joined = me && c.participants.some((p) => p.userId === me)
  const left = daysLeft(c.endAt)
  return (
    <Link
      to={`/challenges/${c.id}`}
      className={`group flex flex-col rounded-2xl bg-ink-950 p-5 text-white ring-1 ring-white/[.06] transition hover:ring-brand-300/40 ${compact ? 'w-72 shrink-0' : ''}`}
    >
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span className="flex items-center gap-1.5 text-brand-300">
          <MetricIcon metric={c.metric} size={15} />
          {c.unit}
        </span>
        <span>{c.status === 'finished' ? 'پایان‌یافته' : left > 0 ? `${num(left)} روز مانده` : 'اعلام نتایج'}</span>
      </div>
      <h3 className="mt-4 line-clamp-2 min-h-[2.75rem] text-[15px] font-medium leading-6">{c.title}</h3>
      <div className="mt-4 text-[11px] text-white/45">صندوق جایزه</div>
      <div className="text-2xl font-extralight tracking-tight"><Money value={c.pool} /></div>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/55">
        <span>{num(c.participants.length)} شرکت‌کننده</span>
        <span className={joined ? 'text-brand-300' : ''}>{joined ? 'عضو هستید' : c.entryFee ? `ورودی ${toman(c.entryFee)}` : 'ورود رایگان'}</span>
      </div>
    </Link>
  )
}
