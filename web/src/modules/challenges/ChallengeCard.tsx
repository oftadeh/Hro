import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { Challenge } from '@/core/types'
import { daysLeft, num, toman } from '@/core/format'
import { Badge, Cover } from '@/ui/kit'

export function ChallengeCard({ c, me, compact }: { c: Challenge; me?: string; compact?: boolean }) {
  const joined = me && c.participants.some((p) => p.userId === me)
  const left = daysLeft(c.endAt)
  return (
    <Link
      to={`/challenges/${c.id}`}
      className={`group block overflow-hidden rounded-[1.75rem] bg-white shadow-card transition hover:-translate-y-0.5 dark:border dark:border-white/[.07] dark:bg-ink-900/70 dark:shadow-none ${compact ? 'w-72 shrink-0' : ''}`}
    >
      <Cover gradient={c.gradient} className="m-2 h-28 rounded-[1.4rem]">
        <div className="absolute inset-0 flex items-center justify-between p-4 text-white">
          <div className="text-5xl drop-shadow-lg transition group-hover:scale-110">{c.emoji}</div>
          <div className="text-left">
            <div className="text-[11px] opacity-80">صندوق جایزه</div>
            <div className="text-xl font-black tracking-tight">{toman(c.pool)}</div>
          </div>
        </div>
        <div className="absolute right-3 top-3 flex gap-1">
          {c.status === 'finished' ? <Badge color="slate">پایان‌یافته</Badge> : <Badge color="slate" className="!bg-black/40 !text-white">{left > 0 ? `${num(left)} روز مانده` : 'در انتظار اعلام نتایج'}</Badge>}
          {joined && <Badge color="emerald">شرکت کرده‌ای</Badge>}
        </div>
      </Cover>
      <div className="px-4 pb-4 pt-1.5">
        <h3 className="truncate font-bold">{c.title}</h3>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
          <span className="flex items-center gap-1">
            <Users size={13} /> {num(c.participants.length)} نفر
          </span>
          <span className="font-bold text-brand-600 dark:text-gold-300">{c.entryFee ? `ورودی ${toman(c.entryFee)}` : 'ورود رایگان'}</span>
        </div>
      </div>
    </Link>
  )
}
