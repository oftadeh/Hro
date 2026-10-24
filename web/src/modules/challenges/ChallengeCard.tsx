import { Link } from 'react-router-dom'
import clsx from 'clsx'
import type { Challenge } from '@/core/types'
import { daysLeft, num, toman } from '@/core/format'
import { rankings } from '@/core/services/challenges'
import { MetricIcon } from '@/ui/icons'
import { Money, toneFor } from '@/ui/kit'
import { MetricArt } from '@/ui/art'
import { vtName } from '@/ui/ViewTransitions'

/** کارت رنگی چالش (هم‌سبک کارت‌های داشبورد) با پیشرفت و رتبه‌ی کاربر */
export function ChallengeCard({ c, me, compact }: { c: Challenge; me?: string; compact?: boolean }) {
  const mine = me ? c.participants.find((p) => p.userId === me) : undefined
  const rank = mine ? rankings(c).findIndex((p) => p.userId === me) + 1 : 0
  const pct = mine ? Math.min(1, mine.score / Math.max(1, c.goal)) : 0
  const left = daysLeft(c.endAt)
  return (
    <Link
      to={`/challenges/${c.id}`}
      style={vtName(`ch-${c.id}`)}
      className={clsx('press group relative flex min-h-[15rem] flex-col overflow-hidden rounded-[30px] p-5 text-ink-950', c.status === 'finished' ? 'card-night !text-white' : toneFor(c.id), compact && 'w-72 shrink-0')}
    >
      <MetricArt metric={c.metric} size={112} className="pointer-events-none absolute -bottom-2 left-1 opacity-90" />
      <div className="relative flex items-center justify-between text-[12px] font-semibold opacity-75">
        <span className="flex items-center gap-1.5 rounded-full bg-white/45 px-2.5 py-1">
          <MetricIcon metric={c.metric} size={13} />
          {c.unit}
        </span>
        <span>{c.status === 'finished' ? 'پایان‌یافته' : left > 0 ? `${num(left)} روز مانده` : 'اعلام نتایج'}</span>
      </div>
      <h3 className="relative mt-4 line-clamp-2 max-w-[78%] text-[22px] font-extrabold leading-snug">{c.title}</h3>
      <div className="relative mt-auto pt-4">
        {mine ? (
          <div className="max-w-[62%]">
            <div className="flex justify-between text-[12px] font-bold">
              <span>رتبه‌ی {num(rank)}</span>
              <span className="tabular-nums">{num(mine.score)} / {num(c.goal)}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/45">
              <div className="h-full rounded-full bg-ink-950 transition-[width] duration-700" style={{ width: `${pct * 100}%` }} />
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[12px] font-semibold opacity-70">صندوق جایزه</div>
            <div className="text-[22px] font-black leading-tight"><Money value={c.pool} /></div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
              <span className="opacity-70">{num(c.participants.length)} شرکت‌کننده</span>
              <span className="rounded-full bg-ink-950 px-3 py-1 text-white">{c.entryFee ? `ورودی ${toman(c.entryFee)}` : 'ورود رایگان'}</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
