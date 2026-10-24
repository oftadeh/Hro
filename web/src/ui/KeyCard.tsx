import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Money } from './kit'
import { Emblem } from '@/layouts/Logo'

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
  const grad = { lavender: 'card-violet', mint: 'card-mint', peach: 'card-peach', pink: 'card-pink' }[tone as 'lavender'] ?? 'card-violet'
  return (
    <div className={clsx('relative aspect-[1.586] w-full overflow-hidden rounded-[30px] p-6 text-ink-950 shadow-soft', grad, className)}>
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/30 blur-2xl" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[14px] font-bold text-ink-950/75">{title}</div>
            {subtitle && <div className="mt-1 text-[12px] text-ink-950/60">{subtitle}</div>}
          </div>
          <Emblem size={36} />
        </div>
        <div className="mt-auto">
          <div className="text-[34px] font-black leading-none">{typeof amount === 'number' ? <Money value={amount} /> : amount}</div>
          {footer && <div className="mt-3 flex items-center justify-between text-[12px] text-ink-950/65">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
