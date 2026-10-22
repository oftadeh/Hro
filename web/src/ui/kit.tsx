/**
 * کیت طراحی کی‌فیت — زبان بصری مینیمال و خنثی:
 * سیاه/سفید گرم، یک رنگ تأکیدی شامپاینی، خطوط باریک، آیکون خطی و تایپوگرافی سبک.
 */
import clsx from 'clsx'
import { ArrowRight, Inbox, Star, X } from 'lucide-react'
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
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium tracking-tight transition duration-200 active:scale-[.98] disabled:opacity-40 disabled:active:scale-100',
        size === 'sm' && 'h-9 px-3.5 text-xs',
        size === 'md' && 'h-11 px-5 text-sm',
        size === 'lg' && 'h-12 px-6 text-[15px]',
        variant === 'primary' && 'bg-ink-950 text-white hover:bg-ink-800 dark:bg-brand-300 dark:text-ink-950 dark:hover:bg-brand-200',
        variant === 'dark' && 'bg-ink-950 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-950',
        variant === 'secondary' && 'bg-ink-100 text-ink-900 hover:bg-ink-200 dark:bg-white/[.07] dark:text-ink-100 dark:hover:bg-white/10',
        variant === 'ghost' && 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/5',
        variant === 'outline' && 'border hairline bg-transparent text-ink-800 hover:bg-white dark:text-ink-100 dark:hover:bg-white/[.04]',
        variant === 'danger' && 'bg-coral-600 text-white hover:bg-coral-700',
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
        'rounded-2xl border hairline bg-white p-4 dark:bg-ink-900',
        onClick && 'cursor-pointer transition hover:border-ink-300 dark:hover:border-white/15',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Badge({ children, color = 'slate', className }: { children: ReactNode; color?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate'; className?: string }) {
  const map = {
    emerald: 'text-emerald-700 bg-emerald-500/[.08] dark:text-emerald-300',
    amber: 'text-brand-700 bg-brand-500/10 dark:text-brand-300',
    rose: 'text-coral-700 bg-coral-500/10 dark:text-coral-300',
    sky: 'text-aqua-700 bg-aqua-500/10 dark:text-aqua-300',
    violet: 'text-ink-800 bg-ink-900/[.06] dark:text-ink-200 dark:bg-white/[.07]',
    slate: 'text-ink-600 bg-ink-900/[.05] dark:text-ink-300 dark:bg-white/[.06]',
  }
  return <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium', map[color], className)}>{children}</span>
}

const fieldCls =
  'w-full rounded-xl border hairline bg-white px-4 py-3 text-sm outline-none transition placeholder:text-ink-400 focus:border-ink-900 dark:bg-white/[.03] dark:focus:border-brand-300/60'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-ink-500 dark:text-ink-400">{label}</span>
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
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative max-h-[92dvh] w-full animate-sheet-up overflow-y-auto rounded-t-3xl border-t hairline bg-white p-6 pt-3 shadow-soft dark:bg-ink-900 sm:rounded-3xl sm:border',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-ink-200 dark:bg-white/15 sm:hidden" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
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

/** کنترل تکه‌ای (Segmented control) */
export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={clsx('flex gap-0.5 overflow-x-auto rounded-xl bg-ink-900/[.05] p-0.5 no-scrollbar dark:bg-white/[.06]', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            'flex flex-1 items-center justify-center whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition',
            value === it.value ? 'bg-white text-ink-950 shadow-card dark:bg-ink-700 dark:text-white' : 'text-ink-500 hover:text-ink-900 dark:hover:text-ink-100',
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
            'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition',
            value === it.value
              ? 'border-ink-950 bg-ink-950 text-white dark:border-brand-300 dark:bg-brand-300 dark:text-ink-950'
              : 'hairline text-ink-600 hover:border-ink-400 dark:text-ink-300',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Avatar({ name, src, size = 40, ring, className }: { name: string; src?: string; size?: number; ring?: boolean; className?: string }) {
  const initial = name.replace('دکتر ', '').trim()[0] ?? ''
  return (
    <div className={clsx('shrink-0 rounded-full', ring && 'p-[2px] ring-1 ring-brand-400 ring-offset-0', className)} style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-ink-200 font-medium text-ink-700 dark:bg-ink-700 dark:text-ink-100" style={{ fontSize: size * 0.4 }}>
          {initial}
        </div>
      )}
    </div>
  )
}

// پالت کاورهای خنثی؛ هر گرادیان قدیمی به یکی از این‌ها نگاشت می‌شود
const COVERS = [
  'bg-[radial-gradient(120%_120%_at_100%_0%,#3e3d39_0%,#171716_60%)]',
  'bg-[radial-gradient(120%_120%_at_0%_0%,#5a4830_0%,#1e1e1c_65%)]',
  'bg-[radial-gradient(120%_120%_at_100%_100%,#435258_0%,#171716_65%)]',
  'bg-[radial-gradient(120%_120%_at_0%_100%,#523431_0%,#171716_65%)]',
  'bg-[radial-gradient(120%_120%_at_50%_0%,#57554f_0%,#0e0e0d_70%)]',
]
export const coverFor = (seed: string) => COVERS[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % COVERS.length]

export function Cover({ gradient, image, className, children, label }: { gradient: string; emoji?: string; image?: string; className?: string; children?: ReactNode; label?: string }) {
  return (
    <div className={clsx('relative overflow-hidden', coverFor(gradient), className)}>
      {image ? (
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute inset-0 opacity-[.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:28px_28px]" />
          {label && <div className="absolute bottom-3 left-4 text-[11px] font-medium uppercase tracking-[.25em] text-white/40">{label}</div>}
        </>
      )}
      {children}
    </div>
  )
}

export function Empty({ title, desc, action }: { icon?: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed hairline px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border hairline text-ink-400">
        <Inbox size={18} strokeWidth={1.5} />
      </div>
      <div className="text-sm font-medium">{title}</div>
      {desc && <p className="mt-1 max-w-xs text-xs leading-6 text-ink-500">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

const TILE = {
  emerald: 'bg-ink-900/[.05] text-ink-900 dark:bg-white/[.06] dark:text-white',
  violet: 'bg-ink-900/[.05] text-ink-900 dark:bg-white/[.06] dark:text-white',
  amber: 'bg-brand-500/10 text-brand-700 dark:text-brand-300',
  sky: 'bg-aqua-500/10 text-aqua-700 dark:text-aqua-300',
  rose: 'bg-coral-500/10 text-coral-700 dark:text-coral-300',
} as const

export type Tone = keyof typeof TILE

export function IconTile({ tone = 'emerald', size = 40, children, className }: { tone?: Tone; size?: number; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('flex shrink-0 items-center justify-center rounded-xl [&_svg]:stroke-[1.5]', TILE[tone], className)} style={{ width: size, height: size }}>
      {children}
    </span>
  )
}

export function Stat({ label, value, icon, hint, tone = 'emerald' }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-ink-500">{label}</div>
        {icon && <IconTile tone={tone} size={30}>{icon}</IconTile>}
      </div>
      <div className="mt-3 truncate text-xl font-medium tabular-nums tracking-tight text-ink-950 dark:text-white">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-ink-400">{hint}</div>}
    </Card>
  )
}

/** سطر شاخص با آیکون، عنوان، مقدار و نوار پیشرفت باریک */
export function MetricRow({ icon, tone = 'emerald', title, value, progress, onClick, done }: { icon: ReactNode; tone?: Tone; title: ReactNode; value?: ReactNode; progress?: number; onClick?: () => void; done?: boolean }) {
  return (
    <div onClick={onClick} className={clsx('flex items-center gap-3 py-3', onClick && 'cursor-pointer', done && 'opacity-50')}>
      <IconTile tone={tone}>{icon}</IconTile>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={clsx('truncate text-sm', done && 'line-through')}>{title}</span>
          {value !== undefined && <span className="shrink-0 text-xs tabular-nums text-ink-500">{value}</span>}
        </div>
        {progress !== undefined && <Progress value={progress} className="mt-2" />}
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border hairline text-ink-700 transition hover:bg-white dark:text-ink-200 dark:hover:bg-white/5"
          aria-label="بازگشت"
        >
          <ArrowRight size={18} strokeWidth={1.5} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[13px] text-ink-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

/** بلوک تیره‌ی شاخص صفحه با هایلایت شامپاینی ملایم */
export function HeroHeader({ children, className }: { children: ReactNode; className?: string; tone?: string; gradient?: string }) {
  return (
    <div className={clsx('relative overflow-hidden rounded-3xl bg-ink-950 text-white ring-1 ring-white/[.06]', className)}>
      <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-brand-400/[.18] blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  )
}

/** مبلغ با عدد درشت و واحد کوچک */
export function Money({ value, className, unitClass }: { value: number; className?: string; unitClass?: string }) {
  return (
    <span className={clsx('tabular-nums', className)}>
      {num(value)}
      <span className={clsx('mr-1.5 text-[.4em] font-light opacity-50', unitClass)}>تومان</span>
    </span>
  )
}

export function RaisedSheet({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('relative -mt-6 rounded-3xl border hairline bg-white p-5 dark:bg-ink-900', className)}>{children}</div>
}

export function SectionTitle({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-end justify-between">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  )
}

export function Progress({ value, className }: { value: number; className?: string; tone?: string }) {
  return (
    <div className={clsx('h-1 overflow-hidden rounded-full bg-ink-900/[.07] dark:bg-white/10', className)}>
      <div className="h-full rounded-full bg-ink-900 transition-all duration-700 dark:bg-brand-300" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  )
}

export function Ring({ value, size = 64, stroke = 3, children }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-ink-900/10 dark:stroke-white/10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" strokeLinecap="round" className="stroke-brand-400"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} style={{ transition: 'stroke-dashoffset .8s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs tabular-nums text-ink-600 dark:text-ink-300">
      <Star size={12} className="fill-brand-400 stroke-brand-400" />
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
