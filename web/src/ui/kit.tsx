import clsx from 'clsx'
import { ArrowRight, Star, X } from 'lucide-react'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { num } from '@/core/format'

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'dark'

export function Button({
  variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition duration-200 active:scale-[.97] disabled:opacity-45 disabled:active:scale-100',
        size === 'sm' && 'h-9 px-3.5 text-xs',
        size === 'md' && 'h-11 px-5 text-sm',
        size === 'lg' && 'h-14 rounded-[1.1rem] px-6 text-base',
        // روشن: گرادیان بنفش | تیره: طلایی (مانند دکمه‌ی End در طرح ناوبری)
        variant === 'primary' &&
          'bg-gradient-to-l from-brand-500 via-brand-600 to-violet-700 text-white shadow-glow hover:brightness-110 dark:from-gold-300 dark:via-gold-400 dark:to-gold-600 dark:text-ink-950 dark:shadow-gold',
        variant === 'secondary' && 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-white/[.07] dark:text-brand-200 dark:hover:bg-white/10',
        variant === 'ghost' && 'text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/5',
        variant === 'outline' && 'border border-ink-200 bg-white/60 text-ink-700 hover:bg-white dark:border-white/10 dark:bg-white/[.03] dark:text-ink-200 dark:hover:bg-white/[.07]',
        variant === 'danger' && 'bg-coral-500 text-white shadow-[0_12px_28px_-12px_rgb(244_80_110/.7)] hover:bg-coral-600',
        variant === 'dark' && 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-950',
        className,
      )}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  )
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-[1.75rem] border border-white/70 bg-white p-4 shadow-card dark:border-white/[.07] dark:bg-ink-900/70 dark:shadow-none dark:backdrop-blur-xl',
        onClick && 'cursor-pointer transition hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Badge({ children, color = 'emerald', className }: { children: ReactNode; color?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate'; className?: string }) {
  const map = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    violet: 'bg-brand-100 text-brand-700 dark:bg-brand-400/15 dark:text-brand-200',
    slate: 'bg-ink-100 text-ink-600 dark:bg-white/10 dark:text-ink-300',
  }
  return <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold', map[color], className)}>{children}</span>
}

const fieldCls =
  'w-full rounded-2xl border border-transparent bg-ink-100/70 px-4 py-3 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:bg-white/[.06] dark:focus:border-gold-400/40 dark:focus:bg-white/[.08] dark:focus:ring-gold-400/10'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-ink-600 dark:text-ink-300">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-400">{hint}</span>}
    </label>
  )
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={clsx(fieldCls, p.className)} />
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={4} {...p} className={clsx(fieldCls, 'resize-none', p.className)} />
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
      className="text-left"
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
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-md" onClick={onClose} />
      <div
        className={clsx(
          'relative max-h-[92dvh] w-full animate-sheet-up overflow-y-auto rounded-t-[2.25rem] bg-white p-5 pb-8 pt-3 shadow-2xl dark:border dark:border-white/10 dark:bg-ink-900/95 dark:backdrop-blur-2xl sm:rounded-[2.25rem]',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-ink-200 dark:bg-white/20" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="rounded-full bg-ink-100 p-2 text-ink-500 hover:bg-ink-200 dark:bg-white/[.07] dark:text-ink-300" aria-label="بستن">
            <X size={16} />
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
    <div className={clsx('flex gap-1 overflow-x-auto rounded-[1.1rem] bg-white p-1 shadow-card no-scrollbar dark:bg-white/[.05] dark:shadow-none', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            'flex flex-1 items-center justify-center whitespace-nowrap rounded-[.85rem] px-3 py-2 text-sm font-bold transition',
            value === it.value
              ? 'bg-gradient-to-l from-brand-500 to-violet-700 text-white shadow-glow dark:from-gold-300 dark:to-gold-500 dark:text-ink-950 dark:shadow-none'
              : 'text-ink-400 hover:text-ink-700 dark:hover:text-ink-200',
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
            'whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition',
            value === it.value
              ? 'bg-brand-600 text-white shadow-glow dark:bg-gold-400 dark:text-ink-950 dark:shadow-none'
              : 'bg-white text-ink-500 shadow-card hover:text-ink-800 dark:bg-white/[.06] dark:text-ink-300 dark:shadow-none',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

const AVATAR_GRADIENTS = ['from-brand-400 to-violet-700', 'from-coral-400 to-fuchsia-600', 'from-aqua-300 to-sky-600', 'from-gold-300 to-orange-500', 'from-fuchsia-400 to-brand-600', 'from-sky-400 to-indigo-600']

export function Avatar({ name, src, size = 40, ring, className }: { name: string; src?: string; size?: number; ring?: boolean; className?: string }) {
  const g = AVATAR_GRADIENTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length]
  const initials = name.replace('دکتر ', '').split(' ').map((w) => w[0]).slice(0, 2).join('‌')
  return (
    <div
      className={clsx('shrink-0 rounded-full', ring && 'bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2.5px]', className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full rounded-full border-2 border-white object-cover dark:border-ink-900" />
      ) : (
        <div className={clsx('flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br font-bold text-white', g, ring && 'border-2 border-white dark:border-ink-900')} style={{ fontSize: size * 0.36 }}>
          {initials}
        </div>
      )}
    </div>
  )
}

export function Cover({ gradient, emoji, image, className, children }: { gradient: string; emoji?: string; image?: string; className?: string; children?: ReactNode }) {
  return (
    <div className={clsx('relative overflow-hidden bg-gradient-to-br', gradient, className)}>
      {image ? (
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-white/15 blur-xl" />
          <div className="absolute -bottom-10 right-4 h-36 w-36 rounded-full bg-black/10 blur-2xl" />
          {emoji && <div className="absolute inset-0 flex items-center justify-center text-5xl drop-shadow-lg">{emoji}</div>}
        </>
      )}
      {children}
    </div>
  )
}

export function Empty({ icon, title, desc, action }: { icon: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-ink-200 px-6 py-12 text-center dark:border-white/10">
      <div className="mb-3 text-4xl">{icon}</div>
      <div className="font-bold">{title}</div>
      {desc && <p className="mt-1 max-w-xs text-sm text-ink-500">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

const TILE = {
  emerald: 'bg-brand-500 text-white shadow-glow',
  violet: 'bg-violet-600 text-white shadow-glow',
  amber: 'bg-gold-400 text-ink-950 shadow-gold',
  sky: 'bg-aqua-400 text-white shadow-[0_12px_26px_-10px_rgb(70_185_210/.7)]',
  rose: 'bg-coral-500 text-white shadow-[0_12px_26px_-10px_rgb(244_80_110/.7)]',
} as const

export type Tone = keyof typeof TILE

/** کاشی آیکون رنگی با گوشه‌ی گرد (الهام از کارت‌های Volume/Open) */
export function IconTile({ tone = 'emerald', size = 44, children, className }: { tone?: Tone; size?: number; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('flex shrink-0 items-center justify-center rounded-[.95rem]', TILE[tone], className)} style={{ width: size, height: size }}>
      {children}
    </span>
  )
}

export function Stat({ label, value, icon, hint, tone = 'emerald' }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {icon && <IconTile tone={tone}>{icon}</IconTile>}
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-400">{label}</div>
          <div className="mt-0.5 truncate text-lg font-black tracking-tight text-ink-900 dark:text-white">{value}</div>
          {hint && <div className="text-[10px] text-ink-400">{hint}</div>}
        </div>
      </div>
    </Card>
  )
}

/** سطر شاخص با آیکون، عنوان، درصد و نوار پیشرفت باریک */
export function MetricRow({ icon, tone = 'rose', title, value, progress, onClick, done }: { icon: ReactNode; tone?: Tone; title: ReactNode; value?: ReactNode; progress?: number; onClick?: () => void; done?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={clsx('flex items-center gap-3 rounded-[1.4rem] bg-ink-50 p-3 transition dark:bg-white/[.04]', onClick && 'cursor-pointer hover:bg-ink-100 dark:hover:bg-white/[.07]', done && 'opacity-60')}
    >
      <IconTile tone={tone} size={46}>{icon}</IconTile>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={clsx('truncate text-sm font-bold', done && 'line-through')}>{title}</span>
          {value !== undefined && <span className="shrink-0 text-xs font-bold text-ink-400">{value}</span>}
        </div>
        {progress !== undefined && <Progress value={progress} tone={TONE_BAR[tone]} className="mt-2 h-1.5" />}
      </div>
    </div>
  )
}

const TONE_BAR: Record<Tone, string> = {
  emerald: 'from-brand-400 to-brand-600',
  violet: 'from-violet-400 to-violet-700',
  amber: 'from-gold-300 to-gold-500',
  sky: 'from-aqua-300 to-aqua-500',
  rose: 'from-coral-400 to-coral-600',
}

export function PageHeader({ title, subtitle, back, actions }: { title: ReactNode; subtitle?: ReactNode; back?: boolean | string; actions?: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="mb-5 flex items-center gap-3">
      {back && (
        <button
          onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ink-600 shadow-card hover:text-brand-600 dark:bg-white/[.06] dark:text-ink-200 dark:shadow-none"
          aria-label="بازگشت"
        >
          <ArrowRight size={18} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[1.4rem] font-black tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-ink-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

/** هدر گرادیانی با موج (مانند صفحه‌ی بیت‌کوین) که محتوای بعدی رویش بالا می‌آید */
export function HeroHeader({ children, className, tone = 'violet', gradient }: { children: ReactNode; className?: string; tone?: 'violet' | 'navy' | 'coral'; gradient?: string }) {
  const bg = {
    violet: 'from-brand-500 via-brand-600 to-violet-800 dark:from-ink-850 dark:via-ink-900 dark:to-ink-950',
    navy: 'from-ink-800 via-ink-900 to-ink-950',
    coral: 'from-coral-400 via-coral-500 to-fuchsia-600',
  }[tone]
  return (
    <div className={clsx('relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br text-white shadow-soft dark:border dark:border-white/[.06]', gradient ?? bg, className)}>
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 w-full opacity-30" viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden>
        <path d="M0 110 C 60 60, 110 140, 180 95 S 300 30, 400 70 L400 160 L0 160Z" fill="white" fillOpacity=".18" />
        <path d="M0 135 C 80 100, 150 160, 230 120 S 340 90, 400 110 L400 160 L0 160Z" fill="white" fillOpacity=".12" />
      </svg>
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl dark:bg-brand-500/20" />
      <div className="pointer-events-none absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-gold-400/10" />
      <div className="relative">{children}</div>
    </div>
  )
}

/** ورقه‌ی سفید با دستگیره که روی هدر رنگی سوار می‌شود */
export function RaisedSheet({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('relative -mt-8 rounded-[2.25rem] bg-white px-4 pb-5 pt-3 shadow-card dark:border dark:border-white/[.08] dark:bg-ink-900 dark:shadow-[0_-20px_40px_-20px_rgb(0_0_0/.6)]', className)}>
      <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-ink-200 dark:bg-white/20" />
      {children}
    </div>
  )
}

export function SectionTitle({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-base font-extrabold">{title}</h2>
      {action}
    </div>
  )
}

export function Progress({ value, className, tone = 'from-brand-400 to-violet-600' }: { value: number; className?: string; tone?: string }) {
  return (
    <div className={clsx('h-2 overflow-hidden rounded-full bg-ink-200/70 dark:bg-white/10', className)}>
      <div className={clsx('h-full rounded-full bg-gradient-to-l transition-all duration-700', tone)} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  )
}

export function Ring({ value, size = 64, stroke = 7, children, color = '#7c4dff' }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-ink-100 dark:stroke-white/10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke={color} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} style={{ transition: 'stroke-dashoffset .8s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
      <Star size={13} className="fill-amber-400 stroke-amber-400" />
      {value ? value.toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : 'جدید'}
      {count !== undefined && <span className="font-normal text-ink-400">({num(count)})</span>}
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
      onChange(await resizeImage(f, 900))
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
          <button onClick={() => onChange(undefined)} className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5 text-white" aria-label="حذف">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 py-6 text-sm text-ink-500 hover:border-brand-400 hover:text-brand-600 dark:border-white/10"
        >
          {busy ? 'در حال پردازش…' : `📷 ${label}`}
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
