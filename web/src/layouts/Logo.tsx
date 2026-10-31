import { useId } from 'react'
import clsx from 'clsx'

/**
 * نشان کی‌فیت: حرف K که در محل اتصال بازوها یک «سوراخ کلید» دارد —
 * کلید ورود به همه‌ی باشگاه‌ها (Unlock your potential).
 * رنگ کرم روی کاشی تیره، مطابق لوگوی رسمی.
 */
export function Emblem({ size = 32, className, animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={clsx('shrink-0', className)} role="img" aria-label="نشان کی‌فیت">
      <defs>
        <mask id={`kh${id}`}>
          <rect width="64" height="64" fill="#fff" />
          <circle cx="27.6" cy="31.5" r="4.6" fill="#000" />
          <path d="M25.9 34.5h3.4l1.1 10.5h-5.6z" fill="#000" />
        </mask>
      </defs>
      <rect width="64" height="64" rx="16" fill="#16131b" />
      <rect x=".75" y=".75" width="62.5" height="62.5" rx="15.25" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="1.5" />
      <g fill="#f1ece3" mask={`url(#kh${id})`} className={animated ? 'emblem-rise' : undefined}>
        <path d="M15 11h11.5v42H15z" />
        <path d="M26.5 27.5 41.5 11H53L31.5 35z" />
        <path d="M30 30.5 52.5 53H41.2L26.5 38.2z" />
      </g>
    </svg>
  )
}

/** نشان + نام: «keyfit» لاتین مطابق لوگو و نام فارسی زیر آن */
export function Logo({ size = 32, withText = true, sub = false }: { size?: number; withText?: boolean; sub?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" dir="ltr">
      <Emblem size={size} />
      {withText && (
        <div className="leading-none">
          <div className="text-[1.45rem] font-extrabold tracking-tight">keyfit</div>
          {sub && <div dir="rtl" className="mt-1 text-[12px] font-semibold opacity-55">کی‌فیت</div>}
        </div>
      )}
    </div>
  )
}
