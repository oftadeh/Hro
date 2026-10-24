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

/** وقتی عنصر برای اولین بار در دید کاربر قرار می‌گیرد true می‌شود (برای پر شدن نوارها و شمارش عددها) */
export function useInView<T extends Element>(margin = '0px 0px -10% 0px') {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [seen, margin])
  return [ref, seen] as const
}

const CONFETTI = ['#a993ff', '#ff5fa2', '#2ee6c9', '#ff7a2f', '#c6ff3d']

/**
 * لحظه‌ی موفقیت: کاغذرنگی کوتاه از نقطه‌ی مشخص (یا وسط صفحه) و لرزش کوتاه گوشی.
 * در حالت «کاهش حرکت» فقط لرزش انجام می‌شود.
 */
export function celebrate(origin?: { x: number; y: number }, opts: { pieces?: number; haptic?: boolean } = {}) {
  if (opts.haptic !== false) navigator.vibrate?.([18, 40, 26])
  if (reduced() || typeof document === 'undefined') return
  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? window.innerHeight / 2.6
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1200;overflow:hidden'
  document.body.appendChild(layer)
  const n = opts.pieces ?? 26
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span')
    const size = 6 + Math.random() * 6
    p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px;border-radius:${Math.random() > 0.6 ? '50%' : '2px'};background:${CONFETTI[i % CONFETTI.length]}`
    layer.appendChild(p)
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4
    const dist = 70 + Math.random() * 110
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist - 60
    p.animate(
      [
        { transform: 'translate(-50%,-50%) scale(.6) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${200 + Math.random() * 300}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + 140}px)) rotate(${420 + Math.random() * 200}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 400, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' },
    )
  }
  setTimeout(() => layer.remove(), 1700)
}

/** تیک موفقیت که کشیده می‌شود */
export function SuccessCheck({ size = 88, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" className={className} aria-hidden>
      <circle cx="44" cy="44" r="40" className="success-ring" fill="none" stroke="currentColor" strokeWidth="5" pathLength={1} />
      <path d="M27 45 L39 57 L62 33" className="success-tick" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
    </svg>
  )
}
