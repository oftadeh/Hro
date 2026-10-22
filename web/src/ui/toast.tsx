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
          className={`pointer-events-auto animate-pop rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-soft backdrop-blur ${
            t.kind === 'success' ? 'bg-emerald-600/95' : t.kind === 'error' ? 'bg-rose-600/95' : 'bg-ink-800/95'
          }`}
        >
          {t.kind === 'success' ? '✓ ' : t.kind === 'error' ? '⚠ ' : ''}
          {t.text}
        </div>
      ))}
    </div>
  )
}
