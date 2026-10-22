/**
 * کیت طراحی کی‌فیت — زبان بصری «آرام و شاعرانه»:
 * پس‌زمینه‌ی زغالی-بنفش، گرادیان‌های پاستلی (یاسی، صورتی، نعنایی، هلویی)،
 * گوی‌های رنگی محو، تیترهای سریف (مرکزی) و کارت‌های لایه‌ای با گوشه‌های گرد.
 */
import { uploadImage } from '@/core/client/remote'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Star, X } from 'lucide-react'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { num } from '@/core/format'
import { useMounted } from './motion'
import { Yoga } from './art'

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'dark'

export function Button({
  variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-200 active:scale-[.98] disabled:opacity-40 disabled:active:scale-100',
        size === 'sm' && 'h-9 px-4 text-xs',
        size === 'md' && 'h-11 px-5 text-sm',
        size === 'lg' && 'h-12 px-6 text-[15px]',
        variant === 'primary' && 'grad-lavender text-ink-950 shadow-glow hover:brightness-105',
        variant === 'dark' && 'bg-ink-950 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100',
        variant === 'secondary' && 'bg-ink-900/[.06] text-ink-900 hover:bg-ink-900/10 dark:bg-white/[.08] dark:text-ink-100 dark:hover:bg-white/[.12]',
        variant === 'ghost' && 'text-ink-600 hover:bg-ink-900/[.05] dark:text-ink-300 dark:hover:bg-white/[.06]',
        variant === 'outline' && 'border border-ink-200 text-ink-800 hover:bg-white dark:border-white/15 dark:text-ink-100 dark:hover:bg-white/[.05]',
        variant === 'danger' && 'bg-coral-500 text-white hover:bg-coral-600',
        className,
      )}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" /> : icon}
      {children}
    </button>
  )
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-3xl bg-white p-4 shadow-card dark:bg-ink-850 dark:shadow-none',
        onClick && 'lift-hover cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Badge({ children, color = 'slate', className }: { children: ReactNode; color?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate'; className?: string }) {
  const map = {
    emerald: 'text-aqua-700 bg-aqua-400/15 dark:text-aqua-300',
    amber: 'text-gold-600 bg-gold-400/20 dark:text-gold-300',
    rose: 'text-coral-600 bg-coral-400/15 dark:text-coral-300',
    sky: 'text-brand-700 bg-brand-400/15 dark:text-brand-300',
    violet: 'text-brand-700 bg-brand-400/15 dark:text-brand-300',
    slate: 'text-ink-600 bg-ink-900/[.06] dark:text-ink-200 dark:bg-white/[.1]',
  }
  return <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium', map[color], className)}>{children}</span>
}

const fieldCls =
  'w-full rounded-2xl border border-transparent bg-ink-900/[.05] px-4 py-3 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-300 focus:bg-white dark:bg-white/[.06] dark:focus:border-brand-300/50 dark:focus:bg-white/[.08]'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-ink-500 dark:text-ink-400">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-400">{hint}</span>}
    </label>
  )
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={clsx(fieldCls, p.className)} />
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={4} {...p} className={clsx(fieldCls, 'resize-none leading-7', p.className)} />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={clsx(fieldCls, p.className)} />

/** ورودی عددی که ارقام فارسی را هم می‌پذیرد */
export function NumberInput({ value, onChange, ...rest }: { value: number; onChange: (n: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <Input
      {...rest}
      inputMode="decimal"
      value={value ? String(value) : ''}
      onChange={(e) => {
        const en = e.target.value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[^\d.]/g, '')
        onChange(en ? Number(en) : 0)
      }}
      dir="ltr"
      className="text-left tabular-nums"
    />
  )
}

export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[900] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative max-h-[92dvh] w-full animate-sheet-up overflow-y-auto rounded-t-[2rem] bg-white p-6 pt-3 shadow-soft dark:bg-ink-850 sm:rounded-[2rem]',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-200 dark:bg-white/15" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl leading-none">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-white/5 dark:hover:text-white" aria-label="بستن">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={clsx('flex gap-1 overflow-x-auto rounded-full bg-ink-900/[.05] p-1 no-scrollbar dark:bg-white/[.06]', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            'flex flex-1 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] transition',
            value === it.value ? 'bg-white font-medium text-ink-950 shadow-card dark:bg-ink-700 dark:text-white dark:shadow-none' : 'text-ink-500 hover:text-ink-900 dark:hover:text-ink-100',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Chips<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            'whitespace-nowrap rounded-full px-4 py-1.5 text-xs transition',
            value === it.value ? 'grad-lavender font-medium text-ink-950' : 'bg-ink-900/[.05] text-ink-600 hover:text-ink-900 dark:bg-white/[.06] dark:text-ink-300',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

const AVATAR_BG = ['grad-lavender', 'grad-mint', 'grad-peach', 'grad-pink']

export function Avatar({ name, src, size = 40, ring, className }: { name: string; src?: string; size?: number; ring?: boolean; className?: string }) {
  const initial = name.replace('دکتر ', '').trim()[0] ?? ''
  const bg = AVATAR_BG[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_BG.length]
  return (
    <div className={clsx('shrink-0 rounded-full', ring && 'bg-[conic-gradient(from_200deg,#6ee7c8,#a78bfa,#f2a3e2,#fcd679,#6ee7c8)] p-[2px]', className)} style={{ width: size, height: size }}>
      <div className={clsx('h-full w-full overflow-hidden rounded-full', ring && 'border-2 border-ink-50 dark:border-ink-950')}>
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className={clsx('flex h-full w-full items-center justify-center font-display text-ink-950', bg)} style={{ fontSize: size * 0.48 }}>
            {initial}
          </div>
        )}
      </div>
    </div>
  )
}

/** گوی‌های رنگی محو (مِش) — امضای بصری طرح */
const ORBS: [string, string, string][] = [
  ['#a78bfa', '#6ee7c8', '#fcd679'],
  ['#f2a3e2', '#a78bfa', '#6ee7c8'],
  ['#6ee7c8', '#a78bfa', '#f2a3e2'],
  ['#fcd679', '#f2a3e2', '#a78bfa'],
  ['#a78bfa', '#f2a3e2', '#fcd679'],
]
export const orbsFor = (seed: string) => ORBS[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % ORBS.length]

export function Orbs({ seed = 'keyfit', className, intensity = 1 }: { seed?: string; className?: string; intensity?: number }) {
  const [a, b, c] = orbsFor(seed)
  return (
    <div className={clsx('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="kf-drift absolute -bottom-1/4 -left-[10%] h-[85%] w-[70%] rounded-full blur-3xl" style={{ background: a, opacity: 0.75 * intensity }} />
      <div className="kf-drift absolute -bottom-[30%] left-[35%] h-[75%] w-[55%] rounded-full blur-3xl" style={{ background: b, opacity: 0.7 * intensity, animationDelay: '-5s' }} />
      <div className="kf-drift absolute bottom-[5%] left-[55%] h-[45%] w-[35%] rounded-full blur-3xl" style={{ background: c, opacity: 0.55 * intensity, animationDelay: '-9s' }} />
    </div>
  )
}

export function Cover({ gradient, image, className, children, label }: { gradient: string; emoji?: string; image?: string; className?: string; children?: ReactNode; label?: string }) {
  return (
    <div className={clsx('relative overflow-hidden bg-ink-850', className)}>
      {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <Orbs seed={gradient} />}
      {label && !image && <div className="absolute right-4 top-3 font-display text-xl text-white/85">{label}</div>}
      {children}
    </div>
  )
}

export function Empty({ title, desc, action, art }: { icon?: string; title: string; desc?: string; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-white px-6 py-12 text-center dark:bg-ink-850">
      {art ?? <Yoga size={120} className="mb-1" />}
      <div className="font-display text-xl">{title}</div>
      {desc && <p className="mt-1 max-w-xs text-xs leading-6 text-ink-500">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

const TILE = {
  emerald: 'bg-aqua-400/15 text-aqua-600 dark:text-aqua-300',
  violet: 'bg-brand-400/15 text-brand-600 dark:text-brand-300',
  amber: 'bg-gold-400/20 text-gold-600 dark:text-gold-300',
  sky: 'bg-brand-400/15 text-brand-600 dark:text-brand-300',
  rose: 'bg-coral-400/15 text-coral-600 dark:text-coral-300',
} as const

export type Tone = keyof typeof TILE

export function IconTile({ tone = 'violet', size = 40, children, className }: { tone?: Tone; size?: number; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('flex shrink-0 items-center justify-center rounded-2xl [&_svg]:stroke-[1.5]', TILE[tone], className)} style={{ width: size, height: size }}>
      {children}
    </span>
  )
}

// کاشی آمار با درخشش رنگی پایین (مانند «۲۳ جلسه مدیتیشن»)
const STAT_GLOW: Record<Tone, string> = {
  emerald: 'from-transparent to-aqua-400/30',
  violet: 'from-transparent to-brand-400/35',
  amber: 'from-transparent to-gold-400/30',
  sky: 'from-transparent to-brand-400/35',
  rose: 'from-transparent to-coral-400/30',
}

export function Stat({ label, value, icon, hint, tone = 'violet', art }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; tone?: Tone; art?: ReactNode }) {
  return (
    <div className={clsx('lift-hover relative overflow-hidden rounded-3xl bg-white p-4 shadow-card dark:bg-ink-850 dark:shadow-none', art && 'min-h-[8.5rem]')}>
      {art && <div className="pointer-events-none absolute -bottom-2 left-1">{art}</div>}
      <div className={clsx('pointer-events-none absolute inset-0 bg-gradient-to-b', STAT_GLOW[tone])} />
      <div className="relative">
        {icon && <div className={clsx('mb-3 [&_svg]:stroke-[1.4]', TILE[tone].split(' ').filter((c) => c.startsWith('text') || c.startsWith('dark:text')).join(' '))}>{icon}</div>}
        <div className="truncate text-lg font-medium tabular-nums text-ink-950 dark:text-white">{value}</div>
        <div className="text-[11px] text-ink-500 dark:text-ink-400">{label}</div>
        {hint && <div className="mt-0.5 text-[10px] text-ink-400">{hint}</div>}
      </div>
    </div>
  )
}

/** سطر شاخص: آیکون، عنوان، مقدار و نوار پیشرفت */
export function MetricRow({ icon, tone = 'violet', title, value, progress, onClick, done }: { icon: ReactNode; tone?: Tone; title: ReactNode; value?: ReactNode; progress?: number; onClick?: () => void; done?: boolean }) {
  return (
    <div onClick={onClick} className={clsx('flex items-center gap-3 py-3', onClick && 'cursor-pointer', done && 'opacity-50')}>
      <IconTile tone={tone}>{icon}</IconTile>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={clsx('truncate text-sm', done && 'line-through')}>{title}</span>
          {value !== undefined && <span className="shrink-0 text-xs tabular-nums text-ink-500 dark:text-ink-400">{value}</span>}
        </div>
        {progress !== undefined && <Progress value={progress} tone={tone} className="mt-2" />}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, back, actions }: { title: ReactNode; subtitle?: ReactNode; back?: boolean | string; actions?: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="mb-6 flex items-center gap-3">
      {back && (
        <button
          onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900/[.05] text-ink-700 transition hover:bg-ink-900/10 dark:bg-white/[.06] dark:text-ink-200"
          aria-label="بازگشت"
        >
          <ArrowRight size={18} strokeWidth={1.5} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[2.1rem] leading-[1.15]">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[13px] text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

/** کارت تیره با گوی‌های رنگی (مانند «Guided Meditation») */
export function HeroHeader({ children, className, seed = 'hero' }: { children: ReactNode; className?: string; tone?: string; gradient?: string; seed?: string }) {
  return (
    <div className={clsx('relative overflow-hidden rounded-[2rem] bg-ink-850 text-white', className)}>
      <Orbs seed={seed} intensity={0.9} />
      <div className="relative">{children}</div>
    </div>
  )
}

/** مبلغ با عدد درشت و واحد کوچک */
export function Money({ value, className, unitClass }: { value: number; className?: string; unitClass?: string }) {
  return (
    <span className={clsx('tabular-nums', className)}>
      {num(value)}
      <span className={clsx('mr-1.5 text-[.4em] font-light opacity-60', unitClass)}>تومان</span>
    </span>
  )
}

export function RaisedSheet({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('relative -mt-8 rounded-[2rem] bg-white p-5 shadow-card dark:bg-ink-850 dark:shadow-none', className)}>{children}</div>
}

/** بخش‌های لایه‌ای رنگی با گوشه‌ی گرد بزرگ (مانند Morning / Evening / Journeys) */
export function StackSections({ items }: { items: { to: string; title: string; subtitle?: string; grad: string; dark?: boolean; art?: ReactNode }[] }) {
  return (
    <div className="overflow-hidden rounded-[2rem]">
      {items.map((it, i) => (
        <Link
          key={it.to}
          to={it.to}
          className={clsx(
            'group relative flex min-h-[9rem] items-start justify-between overflow-hidden rounded-tl-[3rem] px-6 pb-12 pt-6 transition',
            i > 0 && '-mt-8',
            it.dark ? 'bg-ink-850 text-white' : clsx(it.grad, 'text-ink-950'),
          )}
          style={{ zIndex: i + 1 }}
        >
          <div className="relative z-10 max-w-[60%]">
            <div className="font-display text-[2rem] leading-[1.1]">{it.title}</div>
            {it.subtitle && <div className={clsx('mt-1 text-xs', it.dark ? 'text-white/55' : 'text-ink-950/60')}>{it.subtitle}</div>}
            <ArrowLeft size={20} strokeWidth={1.4} className="mt-3 opacity-60 transition group-hover:-translate-x-1 group-hover:opacity-100" />
          </div>
          {it.art && <div className="pointer-events-none absolute -bottom-1 left-4 transition duration-500 group-hover:-translate-y-1">{it.art}</div>}
        </Link>
      ))}
    </div>
  )
}

/** نمودار حلقه‌ای چندرنگ با فاصله بین بخش‌ها */
export function Donut({ segments, size = 200, stroke = 12, center }: { segments: { value: number; color: string }[]; size?: number; stroke?: number; center?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const total = Math.max(1, segments.reduce((a, s) => a + s.value, 0))
  const gap = segments.filter((s) => s.value > 0 && s.color !== 'transparent').length > 1 ? 14 : 0
  const mounted = useMounted()
  let offset = 0
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-ink-900/[.06] dark:stroke-white/[.06]" />
        {segments.map((s, i) => {
          const len = mounted ? Math.max(0, (s.value / total) * c - gap) : 0
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} style={{ filter: `drop-shadow(0 0 6px ${s.color}66)`, transition: `stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1) ${i * 0.08}s` }}
            />
          )
          offset += (s.value / total) * c
          return s.value > 0 && s.color !== 'transparent' ? el : null
        })}
      </svg>
      {center && <div className="absolute inset-0 flex items-center justify-center text-center">{center}</div>}
    </div>
  )
}

export function SectionTitle({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-9 flex items-end justify-between">
      <h2 className="font-display text-[1.65rem] leading-none">{title}</h2>
      {action}
    </div>
  )
}

const BAR: Record<string, string> = {
  emerald: 'from-aqua-300 to-aqua-400',
  violet: 'from-brand-300 to-coral-300',
  amber: 'from-gold-300 to-coral-300',
  sky: 'from-brand-300 to-coral-300',
  rose: 'from-coral-300 to-brand-300',
}

export function Progress({ value, className, tone = 'violet' }: { value: number; className?: string; tone?: string }) {
  const mounted = useMounted()
  return (
    <div className={clsx('h-1.5 overflow-hidden rounded-full bg-ink-900/[.07] dark:bg-white/10', className)}>
      <div className={clsx('h-full rounded-full bg-gradient-to-l transition-all duration-700', BAR[tone] ?? BAR.violet)} style={{ width: `${mounted ? Math.min(100, Math.max(0, value * 100)) : 0}%` }} />
    </div>
  )
}

export function Ring({ value, size = 64, stroke = 4, children, color = '#a78bfa' }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  return <Donut size={size} stroke={stroke} segments={[{ value: Math.min(1, value), color }, { value: Math.max(0, 1 - value), color: 'transparent' }]} center={children} />
}

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs tabular-nums text-ink-600 dark:text-ink-300">
      <Star size={12} className="fill-gold-400 stroke-gold-400" />
      {value ? value.toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : 'جدید'}
      {count !== undefined && <span className="text-ink-400">({num(count)})</span>}
    </span>
  )
}

/** انتخاب تصویر و کوچک‌سازی آن برای ذخیره (حداکثر ۹۰۰ پیکسل) */
export function ImagePicker({ value, onChange, label = 'افزودن تصویر', className }: { value?: string; onChange: (dataUrl?: string) => void; label?: string; className?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const onFile = async (f?: File) => {
    if (!f) return
    setBusy(true)
    try {
      onChange(await uploadImage(await resizeImage(f, 900)).catch(() => undefined))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={clsx('relative', className)}>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {value ? (
        <div className="relative overflow-hidden rounded-2xl">
          <img src={value} alt="" className="max-h-64 w-full object-cover" />
          <button onClick={() => onChange(undefined)} className="absolute left-2 top-2 rounded-full bg-ink-950/70 p-1.5 text-white backdrop-blur" aria-label="حذف">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed hairline py-7 text-sm text-ink-500 transition hover:border-ink-400 hover:text-ink-900 dark:hover:text-white"
        >
          {busy ? 'در حال پردازش…' : `${label}`}
        </button>
      )}
    </div>
  )
}

export function resizeImage(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.8))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
