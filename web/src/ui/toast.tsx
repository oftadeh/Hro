import { create } from 'zustand'
import { AppError } from '@/core/db'

interface Toast {
  id: number
  text: string
  kind: 'success' | 'error' | 'info'
}

export const useToasts = create<{ items: Toast[]; push: (t: Omit<Toast, 'id'>) => void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random()
    set((s) => ({ items: [...s.items, { ...t, id }] }))
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 3200)
  },
}))

export const toast = {
  success: (text: string) => useToasts.getState().push({ text, kind: 'success' }),
  error: (text: string) => useToasts.getState().push({ text, kind: 'error' }),
  info: (text: string) => useToasts.getState().push({ text, kind: 'info' }),
}

/** اجرای یک اکشن و نمایش خطا/موفقیت به صورت توست */
export async function run<T>(fn: () => T | Promise<T>, success?: string): Promise<T | undefined> {
  try {
    const r = await fn()
    if (success) toast.success(success)
    return r
  } catch (e) {
    toast.error(e instanceof AppError ? e.message : 'خطای غیرمنتظره رخ داد')
    if (!(e instanceof AppError)) console.error(e)
    return undefined
  }
}

/** مانند run، ولی فقط موفقیت/شکست را برمی‌گرداند (برای اکشن‌های بدون خروجی) */
export async function runOk(fn: () => unknown, success?: string): Promise<boolean> {
  let ok = false
  await run(async () => {
    await fn()
    ok = true
  }, success)
  return ok
}

export function Toaster() {
  const items = useToasts((s) => s.items)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[1000] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex animate-pop items-center gap-2.5 rounded-full bg-ink-950 py-2.5 pl-5 pr-4 text-[13px] text-white shadow-soft ring-1 ring-white/10 dark:bg-white dark:text-ink-950"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${t.kind === 'success' ? 'bg-emerald-400' : t.kind === 'error' ? 'bg-coral-400' : 'bg-brand-300'}`} />
          {t.text}
        </div>
      ))}
    </div>
  )
}
