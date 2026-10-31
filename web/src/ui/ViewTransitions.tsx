import { useEffect, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'

type VTDoc = Document & { startViewTransition?: (cb: () => void) => unknown }

/** نام عنصر مشترک بین دو صفحه (مثلاً کاور کارت باشگاه ← سربرگ صفحه‌ی باشگاه) */
export const vtName = (name: string): CSSProperties => ({ viewTransitionName: name }) as CSSProperties

/**
 * ناوبری با انتقال یکسان سیستم طراحی: push = صفحه‌ی جدید از چپ (RTL رو به جلو)، back = برعکس، tab = محو نرم،
 * open = کارت به صفحه‌ی جزئیات بزرگ می‌شود و صفحه‌ی پشت کوچک و تیره می‌شود.
 */
export function vtNavigate(go: () => void, dir: 'push' | 'back' | 'tab' | 'open' = 'push') {
  const doc = document as VTDoc
  if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return go()
  const root = document.documentElement
  root.dataset.vt = dir
  const t = doc.startViewTransition(() => {
    flushSync(go)
  }) as { finished?: Promise<void> } | undefined
  const done = () => {
    if (root.dataset.vt === dir) delete root.dataset.vt
  }
  if (t?.finished) t.finished.then(done, done)
  else setTimeout(done, 600)
}

/**
 * انتقال نرم بین صفحه‌ها با View Transitions API: کلیک روی هر لینک داخلی،
 * ناوبری را داخل یک ترنزیشن انجام می‌دهد. مرورگرهای بدون پشتیبانی یا
 * حالت «کاهش حرکت» همان ناوبری عادی را دارند.
 */
export function ViewTransitions() {
  const nav = useNavigate()
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== location.origin) return
      const doc = document as VTDoc
      if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (a.pathname.startsWith('/api/') || a.pathname.startsWith('/uploads/')) return
      const to = a.pathname + a.search + a.hash
      if (to === location.pathname + location.search + location.hash) return
      // لینک Link خودش ناوبری نمی‌کند چون defaultPrevented است؛ onClick خود لینک همچنان اجرا می‌شود
      e.preventDefault()
      // کارتی که عنصر مشترک با صفحه‌ی مقصد دارد: خود کارت بزرگ می‌شود (open)، نه اسلاید صفحه
      const card = a.style.viewTransitionName || a.querySelector('[style*="view-transition-name"]')
      vtNavigate(() => nav(to), a.closest('nav') ? 'tab' : card ? 'open' : 'push')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [nav])
  return null
}
