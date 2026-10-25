/** کارت نمره‌ی سلامت روزانه */
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useDB } from '@/core/db'
import { num } from '@/core/format'
import { healthScore } from '@/core/services/health'
import { Donut, Progress } from '@/ui/kit'
import { HeartPulse } from '@/ui/art'

export const scoreColor = (s: number) => (s >= 75 ? '#4ff3da' : s >= 50 ? '#a48bff' : s >= 30 ? '#ff9a4d' : '#ff2f7d')
export const scoreLabel = (s: number) => (s >= 75 ? 'عالی' : s >= 50 ? 'خوب' : s >= 30 ? 'متوسط' : 'نیاز به توجه')

export function HealthScoreCard({ userId, compact }: { userId: string; compact?: boolean }) {
  const state = useDB((s) => s)
  const hs = healthScore(userId, undefined, state)
  return (
    <Link to="/progress" className="relative block overflow-hidden rounded-[2rem] bg-white p-5 shadow-card transition hover:-translate-y-0.5 dark:bg-ink-850 dark:shadow-none">
      <HeartPulse size={80} className="pointer-events-none absolute -bottom-2 left-2 opacity-70" />
      <div className="flex items-center gap-4">
        <Donut size={compact ? 92 : 110} stroke={9} segments={[{ value: hs.score / 100, color: scoreColor(hs.score) }, { value: 1 - hs.score / 100, color: 'transparent' }]} center={<div><div className="font-display text-[2.2rem] leading-none">{num(hs.score)}</div><div className="text-[12px] text-ink-400">از ۱۰۰</div></div>} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-xs text-ink-500">
            نمره‌ی سلامت امروز <ChevronLeft size={13} />
          </div>
          <div className="mt-1 font-display text-2xl leading-none">{scoreLabel(hs.score)}</div>
          {!compact && (
            <div className="mt-3 space-y-1.5">
              {hs.parts.map((p) => (
                <div key={p.key} className="flex items-center gap-2 text-[12px]">
                  <span className="w-12 shrink-0 text-ink-500">{p.label}</span>
                  <Progress value={p.value / p.max} className="flex-1" tone={p.value / p.max > 0.7 ? 'emerald' : 'violet'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
