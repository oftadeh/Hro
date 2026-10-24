import { useEffect, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'

type VTDoc = Document & { startViewTransition?: (cb: () => void) => unknown }

/** نام عنصر مشترک بین دو صفحه (مثلاً کاور کارت باشگاه ← سربرگ صفحه‌ی باشگاه) */
export const vtName = (name: string): CSSProperties => ({ viewTransitionName: name }) as CSSProperties

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
      doc.startViewTransition(() => {
        flushSync(() => nav(to))
      })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [nav])
  return null
}
