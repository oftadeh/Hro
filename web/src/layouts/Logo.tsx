import { useId } from 'react'
import clsx from 'clsx'

/**
 * نشان کی‌فیت: حرف K که ساقه‌اش یک کلید است (حلقه‌ی بالا و دندانه‌ها) و بازوی بالایی‌اش
 * مثل ورزشکاری با دست بالا رفته به یک نقطه ختم می‌شود — «کلید» ورود به همه‌ی ورزش‌ها.
 */
export function Emblem({ size = 32, className, animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={clsx('shrink-0', className)} role="img" aria-label="نشان کی‌فیت">
      <defs>
        <linearGradient id={`kg${id}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8f72ff" />
          <stop offset=".55" stopColor="#b06bff" />
          <stop offset="1" stopColor="#ff5fa2" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#kg${id})`} />
      <g fill="none" stroke="#17141c" strokeLinecap="round" strokeLinejoin="round" className={animated ? 'emblem-draw' : undefined}>
        <circle cx="22" cy="18.5" r="6.5" strokeWidth="5" pathLength={1} />
        <path d="M22 25v26M22 40.5h-6M22 46.5h-4.5" strokeWidth="5" pathLength={1} />
        <path d="M27 37 44.5 19.5" strokeWidth="5.5" pathLength={1} />
        <path d="M31.5 33.5 45 50" strokeWidth="5.5" pathLength={1} />
      </g>
      <circle cx="47.5" cy="16.5" r="4.2" fill="#17141c" className={animated ? 'emblem-dot' : undefined} />
    </svg>
  )
}

export function Logo({ size = 32, withText = true, sub = false }: { size?: number; withText?: boolean; sub?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Emblem size={size} />
      {withText && (
        <div className="leading-none">
          <div className="text-[1.5rem] font-black tracking-tight">کی‌فیت</div>
          {sub && <div dir="ltr" className="mt-1 text-right text-[10px] font-bold tracking-[.32em] opacity-50">KEYFIT</div>}
        </div>
      )}
    </div>
  )
}
