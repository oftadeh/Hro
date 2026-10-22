import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Money } from './kit'

/** کارت عضویت به سبک کارت فلزی مشکی با جزئیات شامپاینی */
export function KeyCard({ title, subtitle, amount, footer, tone = 'black', className }: {
  title: ReactNode
  subtitle?: ReactNode
  amount: ReactNode
  footer?: ReactNode
  tone?: 'black' | 'graphite' | 'champagne' | string
  className?: string
  tilt?: boolean
  chip?: ReactNode
}) {
  const bg = {
    black: 'bg-[linear-gradient(135deg,#1e1e1c_0%,#0e0e0d_55%,#262624_100%)] text-white',
    graphite: 'bg-[linear-gradient(135deg,#3e3d39_0%,#1e1e1c_60%,#3e3d39_100%)] text-white',
    champagne: 'bg-[linear-gradient(135deg,#e7dcc3_0%,#c6ab78_55%,#e7dcc3_100%)] text-ink-950',
  }[tone as 'black'] ?? 'bg-[linear-gradient(135deg,#1e1e1c_0%,#0e0e0d_55%,#262624_100%)] text-white'
  const light = tone === 'champagne'
  return (
    <div className={clsx('relative aspect-[1.586] w-full overflow-hidden rounded-2xl p-5 ring-1 ring-white/10', bg, className)}>
      {/* درخشش مورب ملایم */}
      <div className="pointer-events-none absolute -inset-1/2 rotate-12 bg-[linear-gradient(100deg,transparent_40%,rgba(255,255,255,.07)_50%,transparent_60%)]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div>
            <div className={clsx('text-[11px] font-medium tracking-[.3em]', light ? 'text-ink-800' : 'text-brand-300')}>{title}</div>
            {subtitle && <div className={clsx('mt-1 text-[11px]', light ? 'text-ink-700' : 'text-white/50')}>{subtitle}</div>}
          </div>
          {/* تراشه */}
          <div className={clsx('h-7 w-9 rounded-md ring-1', light ? 'bg-ink-950/10 ring-ink-950/20' : 'bg-[linear-gradient(135deg,#dcc59a,#95784a)] ring-white/20')} />
        </div>
        <div className="mt-auto">
          <div className="text-[1.65rem] font-light tracking-tight">{typeof amount === 'number' ? <Money value={amount} /> : amount}</div>
          {footer && <div className={clsx('mt-2 flex items-center justify-between text-[11px]', light ? 'text-ink-800' : 'text-white/55')}>{footer}</div>}
        </div>
      </div>
    </div>
  )
}
