import clsx from 'clsx'
import type { ReactNode } from 'react'

/** کارت به سبک کارت بانکی (الهام از کارت VISA طرح مرجع) */
export function KeyCard({ title, subtitle, amount, footer, tone = 'coral', className, chip, tilt }: {
  title: ReactNode
  subtitle?: ReactNode
  amount: ReactNode
  footer?: ReactNode
  tone?: 'coral' | 'violet' | 'navy' | 'gold'
  className?: string
  chip?: ReactNode
  tilt?: boolean
}) {
  const bg = {
    coral: 'from-coral-400 via-coral-500 to-fuchsia-600 shadow-[0_24px_50px_-20px_rgb(244_80_110/.75)]',
    violet: 'from-brand-400 via-brand-600 to-violet-900 shadow-glow',
    navy: 'from-indigo-500 via-blue-700 to-ink-900 shadow-[0_24px_50px_-20px_rgb(40_60_160/.7)]',
    gold: 'from-gold-300 via-gold-400 to-gold-600 text-ink-950 shadow-gold',
  }[tone]
  return (
    <div className={clsx('relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br p-5 text-white transition', bg, tilt && 'hover:-rotate-1 hover:scale-[1.01]', className)}>
      <div className="pointer-events-none absolute -left-10 -top-16 h-44 w-44 rounded-full bg-white/15" />
      <div className="pointer-events-none absolute -bottom-20 right-6 h-44 w-44 rounded-full bg-black/10" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-sm font-black tracking-wide">{title}</div>
          {subtitle && <div className="text-[10px] font-semibold uppercase tracking-widest opacity-75">{subtitle}</div>}
        </div>
        {chip ?? <span className="h-7 w-7 rounded-full border-2 border-white/60 bg-white/20" />}
      </div>
      <div className="relative mt-5 flex items-center gap-3 text-lg tracking-[.35em] opacity-90" dir="ltr">
        <span>••••</span>
        <span>••••</span>
        <span>••••</span>
      </div>
      <div className="relative mt-2 text-2xl font-black tracking-tight">{amount}</div>
      {footer && <div className="relative mt-3 flex items-center justify-between text-[11px] font-semibold opacity-85">{footer}</div>}
    </div>
  )
}
