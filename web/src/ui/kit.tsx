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
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[.97] disabled:opacity-50 disabled:active:scale-100',
        size === 'sm' && 'h-9 px-3 text-xs',
        size === 'md' && 'h-11 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        variant === 'primary' && 'bg-gradient-to-l from-emerald-500 to-teal-500 text-white shadow-glow hover:brightness-110',
        variant === 'secondary' && 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300',
        variant === 'ghost' && 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/5',
        variant === 'outline' && 'border border-ink-200 text-ink-700 hover:bg-ink-50 dark:border-white/10 dark:text-ink-200 dark:hover:bg-white/5',
        variant === 'danger' && 'bg-rose-500 text-white hover:bg-rose-600',
        variant === 'dark' && 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900',
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
        'rounded-3xl border border-ink-100 bg-white p-4 shadow-soft dark:border-white/5 dark:bg-ink-900',
        onClick && 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Badge({ children, color = 'emerald', className }: { children: ReactNode; color?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate'; className?: string }) {
  const map = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    slate: 'bg-ink-100 text-ink-600 dark:bg-white/10 dark:text-ink-300',
  }
  return <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold', map[color], className)}>{children}</span>
}

const fieldCls =
  'w-full rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm outline-none transition placeholder:text-ink-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5 dark:focus:bg-white/10'

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
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative max-h-[92dvh] w-full animate-fade-up overflow-y-auto rounded-t-[2rem] bg-white p-5 pb-8 shadow-2xl dark:bg-ink-900 sm:rounded-[2rem]',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink-200 dark:bg-white/10 sm:hidden" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-white/5" aria-label="بستن">
            <X size={18} />
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
    <div className={clsx('flex gap-1 overflow-x-auto rounded-2xl bg-ink-100 p-1 no-scrollbar dark:bg-white/5', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            'flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition',
            value === it.value ? 'bg-white text-ink-900 shadow dark:bg-ink-800 dark:text-white' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200',
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
            'whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition',
            value === it.value
              ? 'border-transparent bg-ink-900 text-white dark:bg-white dark:text-ink-900'
              : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 dark:border-white/10 dark:bg-ink-900 dark:text-ink-300',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

const AVATAR_GRADIENTS = ['from-emerald-400 to-teal-600', 'from-sky-400 to-indigo-600', 'from-orange-400 to-rose-600', 'from-fuchsia-400 to-purple-600', 'from-amber-400 to-orange-600', 'from-lime-400 to-green-600']

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
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink-200 px-6 py-12 text-center dark:border-white/10">
      <div className="mb-3 text-4xl">{icon}</div>
      <div className="font-bold">{title}</div>
      {desc && <p className="mt-1 max-w-xs text-sm text-ink-500">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, icon, hint, tone = 'emerald' }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; tone?: 'emerald' | 'violet' | 'amber' | 'sky' | 'rose' }) {
  const tones = {
    emerald: 'from-emerald-500/15 to-teal-500/5 text-emerald-600 dark:text-emerald-300',
    violet: 'from-violet-500/15 to-fuchsia-500/5 text-violet-600 dark:text-violet-300',
    amber: 'from-amber-500/15 to-orange-500/5 text-amber-600 dark:text-amber-300',
    sky: 'from-sky-500/15 to-indigo-500/5 text-sky-600 dark:text-sky-300',
    rose: 'from-rose-500/15 to-pink-500/5 text-rose-600 dark:text-rose-300',
  }
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-ink-500">{label}</div>
          <div className="mt-1 truncate text-lg font-extrabold text-ink-900 dark:text-white">{value}</div>
          {hint && <div className="mt-0.5 text-[11px] text-ink-400">{hint}</div>}
        </div>
        {icon && <div className={clsx('rounded-2xl bg-gradient-to-br p-2.5', tones[tone])}>{icon}</div>}
      </div>
    </Card>
  )
}

export function PageHeader({ title, subtitle, back, actions }: { title: ReactNode; subtitle?: ReactNode; back?: boolean | string; actions?: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="mb-4 flex items-center gap-3">
      {back && (
        <button
          onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
          className="rounded-2xl border border-ink-200 bg-white p-2.5 text-ink-600 hover:bg-ink-50 dark:border-white/10 dark:bg-ink-900 dark:text-ink-300"
          aria-label="بازگشت"
        >
          <ArrowRight size={18} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-extrabold">{title}</h1>
        {subtitle && <p className="truncate text-xs text-ink-500">{subtitle}</p>}
      </div>
      {actions}
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

export function Progress({ value, className, tone = 'from-emerald-400 to-teal-500' }: { value: number; className?: string; tone?: string }) {
  return (
    <div className={clsx('h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10', className)}>
      <div className={clsx('h-full rounded-full bg-gradient-to-l transition-all duration-700', tone)} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  )
}

export function Ring({ value, size = 64, stroke = 7, children, color = '#10b981' }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
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
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 py-6 text-sm text-ink-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-white/10"
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
