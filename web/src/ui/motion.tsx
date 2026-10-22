import { useEffect, useRef, useState } from 'react'
import { num } from '@/core/format'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** عددی که از صفر تا مقدار نهایی می‌شمارد */
export function CountUp({ value, duration = 1100, format = num }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(reduced() ? value : 0)
  const from = useRef(0)
  useEffect(() => {
    if (reduced()) return setShown(value)
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(a + (value - a) * eased)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{format(shown)}</>
}

/** پس از اولین رندر true می‌شود تا انیمیشن‌های CSS از صفر شروع شوند */
export function useMounted(delay = 60) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setM(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return m
}
