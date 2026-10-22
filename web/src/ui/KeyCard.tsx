import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Money } from './kit'

/** کارت عضویت با گرادیان پاستلی (مانند کارت‌های «Details / Days») */
export function KeyCard({ title, subtitle, amount, footer, tone = 'lavender', className }: {
  title: ReactNode
  subtitle?: ReactNode
  amount: ReactNode | number
  footer?: ReactNode
  tone?: 'lavender' | 'mint' | 'peach' | 'pink' | string
  className?: string
  tilt?: boolean
  chip?: ReactNode
}) {
  const grad = { lavender: 'grad-lavender', mint: 'grad-mint', peach: 'grad-peach', pink: 'grad-pink' }[tone as 'lavender'] ?? 'grad-lavender'
  return (
    <div className={clsx('relative aspect-[1.586] w-full overflow-hidden rounded-[2rem] p-6 text-ink-950 shadow-soft', grad, className)}>
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/30 blur-2xl" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium tracking-[.3em] text-ink-950/70">{title}</div>
            {subtitle && <div className="mt-1 text-[11px] text-ink-950/60">{subtitle}</div>}
          </div>
          <div className="h-8 w-8 rounded-full bg-white/50 ring-1 ring-white/60 backdrop-blur" />
        </div>
        <div className="mt-auto">
          <div className="font-display text-[2.2rem] leading-none">{typeof amount === 'number' ? <Money value={amount} unitClass="font-sans" /> : amount}</div>
          {footer && <div className="mt-3 flex items-center justify-between text-[11px] text-ink-950/65">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
