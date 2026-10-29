import clsx from 'clsx'
import { num } from '@/core/format'

/** نمودار ستونی باریک با گرادیان نعنایی که به سمت پایین محو می‌شود */
export function WeekBars({ data, max, unit, format = num }: { data: { label: string; value: number; today?: boolean }[]; max?: number; unit?: string; format?: (n: number) => string }) {
  const top = Math.max(1, max ?? 0, ...data.map((d) => d.value))
  const ticks = [1, 0.75, 0.5, 0.25].map((t) => Math.round(top * t))
  return (
    <div className="relative mt-5 h-48">
      <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
        {ticks.map((t) => (
          <div key={t} className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-[9px] tabular-nums text-ink-400">{format(t)}{unit ? '' : ''}</span>
            <span className="h-px flex-1 bg-ink-900/[.06] dark:bg-white/[.06]" />
          </div>
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 right-11 flex items-stretch justify-between">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center" title={`${format(d.value)} ${unit ?? ''}`}>
            <div className="relative flex w-full flex-1 items-end justify-center pb-0">
              <div
                className={clsx('w-[5px] origin-bottom rounded-full bg-gradient-to-b transition-all duration-700', d.today ? 'from-brand-300 to-brand-300/0' : 'from-aqua-300 to-aqua-300/0')}
                style={{ height: `${Math.max(4, (d.value / top) * 100)}%`, boxShadow: d.value ? `0 0 12px ${d.today ? '#8a6bff55' : '#4ff3da55'}` : undefined, animation: `kf-grow-y .9s cubic-bezier(.2,.8,.2,1) ${i * 0.07}s both` }}
              />
            </div>
            <div className={clsx('mt-2 h-4 text-[12px]', d.today ? 'text-ink-900 dark:text-white' : 'text-ink-400')}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
