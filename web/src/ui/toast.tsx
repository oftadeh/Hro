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

/* ───── پنجره‌ی تأیید درون‌برنامه‌ای (جایگزین window.confirm که در بعضی مرورگرهای داخل‌برنامه‌ای کار نمی‌کند) ───── */
interface Ask { id: number; text: string; resolve: (v: boolean) => void }
const useAsk = create<{ q: Ask | null; set: (q: Ask | null) => void }>((set) => ({ q: null, set: (q) => set({ q }) }))

/** پرسیدن تأیید از کاربر؛ نتیجه true/false */
export function ask(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    useAsk.getState().q?.resolve(false)
    useAsk.getState().set({ id: Date.now(), text, resolve })
  })
}

function AskHost() {
  const q = useAsk((s) => s.q)
  const close = (v: boolean) => {
    if (!q) return
    q.resolve(v)
    useAsk.getState().set(null)
  }
  if (!q) return null
  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" role="alertdialog" aria-modal="true" aria-label={q.text} onClick={() => close(false)}>
      <div className="animate-sheet-up w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-soft dark:bg-ink-850" onClick={(e) => e.stopPropagation()}>
        <p className="text-[16px] font-semibold leading-8">{q.text}</p>
        <div className="mt-5 flex gap-2.5">
          <button autoFocus onClick={() => close(true)} className="h-12 flex-1 rounded-full bg-ink-950 text-[15px] font-bold text-white dark:bg-white dark:text-ink-950">بله</button>
          <button onClick={() => close(false)} className="h-12 flex-1 rounded-full bg-ink-100 text-[15px] font-semibold dark:bg-ink-800">انصراف</button>
        </div>
      </div>
    </div>
  )
}

export function Toaster() {
  const items = useToasts((s) => s.items)
  return (
    <>
    <AskHost />
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
    </>
  )
}
