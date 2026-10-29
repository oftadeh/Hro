/**
 * زبان حرکتی مشترک کارت‌ها: آیکون زنده (AnimIcon) و کاشی‌های زنده (LiveTiles).
 * کاشی‌ها داده‌اند نه تزئین: هر کاشی یک واحد از داده‌ی واقعی کارت است و فقط با تغییر داده ورق می‌خورد.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** فنر میرا به‌صورت linear() برای Web Animations (مقادیر ثابت سیستم طراحی) */
function spring(k: number, c: number) {
  const dt = 1 / 120
  let x = 0, v = 0, t = 0
  const p: number[] = []
  while (t < 3) {
    v += (-k * (x - 1) - c * v) * dt
    x += v * dt
    t += dt
    p.push(x)
    if (t > 0.3 && Math.abs(x - 1) < 0.0008 && Math.abs(v) < 0.01) break
  }
  const st = Math.max(1, Math.floor(p.length / 60))
  const s = p.filter((_, i) => i % st === 0)
  s.push(1)
  return { easing: `linear(${[0, ...s].map((n) => n.toFixed(4)).join(',')})`, duration: Math.round(t * 1000) }
}
export const SP = { snap: spring(600, 35), soft: spring(260, 28), pop: spring(220, 12), open: spring(300, 30), close: spring(420, 40) }
export const EASE_OUT = 'cubic-bezier(.23,1,.32,1)'

const anim = (el: Element | null | undefined, k: Keyframe[], o: KeyframeAnimationOptions) => {
  if (!el || reduced()) return
  ;(el as HTMLElement).animate(k, o)
}
const draw = (el: SVGPathElement | SVGCircleElement | null | undefined, dur = 450, delay = 0) => {
  if (!el || reduced()) return
  const L = el.getTotalLength()
  el.style.strokeDasharray = String(L)
  el.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: dur, delay, easing: EASE_OUT, fill: 'backwards' })
}

/* ───────── آیکون‌های زنده: لایه‌ی خطی + لایه‌ی تأکید ───────── */
type IconDef = { svg: ReactNode; play: (q: (s: string) => Element | null, root: SVGSVGElement) => void; live?: boolean }
const bob = [{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'none' }]

export const ICONS = {
  steps: {
    svg: (<><g className="l"><path d="M7 4.5c1.6 0 2.5 1.7 2.5 3.8S8.7 12 7.3 12 4.8 10.6 4.8 8.6 5.5 4.5 7 4.5z" /><path className="ac" d="M5.3 14.5h3.6" /></g><g className="r"><path d="M17 9c1.5 0 2.2 2.4 2.2 4.2s-1 3.6-2.4 3.6-2.3-1.3-2.3-3.3S15.4 9 17 9z" /><path className="ac" d="M15.1 19h3.6" /></g></>),
    play: (q) => { anim(q('.l'), bob, { duration: 300, easing: 'ease-out' }); anim(q('.r'), bob, { duration: 300, delay: 200, easing: 'ease-out' }) },
  },
  drop: {
    svg: (<><path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z" /><path className="ac w" d="M8.6 14.6a3.4 3.4 0 0 0 3.4 3.4" /></>),
    play: (q) => anim(q('.w'), [{ transform: 'translateY(3px)', opacity: 0 }, { transform: 'none', opacity: 1 }], SP.soft),
  },
  timer: {
    svg: (<><circle cx="12" cy="13" r="8" /><path d="M10 2.5h4" /><path className="ac hd" d="M12 13V8.5" style={{ transformOrigin: '12px 13px', transformBox: 'view-box' } as CSSProperties} /></>),
    play: (q) => anim(q('.hd'), [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 1100, easing: 'linear' }),
    live: true,
  },
  dumbbell: {
    svg: (<g className="d"><path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5" /><path className="ac" d="M6.5 12h11" /></g>),
    play: (q) => anim(q('.d'), [{ transform: 'none' }, { transform: 'translateY(-4px) rotate(-6deg)' }, { transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)' }),
  },
  trophy: {
    svg: (<><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4.5a3 3 0 0 0 3 4M17 6h2.5a3 3 0 0 1-3 4" /><path className="ac s" d="M10.2 6.2v3" /></>),
    play: (q, root) => { anim(root, [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(8deg)' }, { transform: 'none' }], { duration: 520, easing: 'ease-out' }); anim(q('.s'), [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-6px)', opacity: 0 }], { duration: 520 }) },
  },
  heart: {
    svg: (<><path className="h" d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" /><path className="ac p" d="M4 13h4l1.5-2.5 2 4 1.5-2.5H20" /></>),
    play: (q) => { anim(q('.h'), [{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 900 }); draw(q('.p') as SVGPathElement, 700) },
    live: true,
  },
  wallet: {
    svg: (<><circle className="ac c" cx="12" cy="5" r="2.4" /><path d="M4 9h15a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5V9.5" /><path d="M16 14.5h1.5" /></>),
    play: (q) => anim(q('.c'), [{ transform: 'translateY(-6px)', opacity: 0 }, { transform: 'none', opacity: 1 }, { transform: 'translateY(7px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 800 }),
  },
  check: {
    svg: (<><circle className="cc" cx="12" cy="12" r="9" /><path className="ac ck" d="M8 12.3l2.7 2.7L16.2 9.5" /></>),
    play: (q) => { draw(q('.cc') as SVGCircleElement, 450); draw(q('.ck') as SVGPathElement, 320, 330) },
  },
} satisfies Record<string, IconDef>
export type IconName = keyof typeof ICONS

/**
 * آیکون زنده؛ با تغییر `playKey` یک‌بار حرکتش را اجرا می‌کند (ورود، لمس، تغییر داده).
 * آیکون‌های «زنده» (ضربان، تایمر) فقط وقتی `live` باشد آرام تکرار می‌شوند.
 */
export function AnimIcon({ name, size = 26, playKey, live, className }: { name: IconName; size?: number; playKey?: unknown; live?: boolean; className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const def: IconDef = ICONS[name]
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const q = (s: string) => root.querySelector(s)
    const t = setTimeout(() => def.play(q, root), 60)
    if (!(live && def.live)) return () => clearTimeout(t)
    const iv = setInterval(() => def.play(q, root), 1800)
    return () => { clearTimeout(t); clearInterval(iv) }
  }, [name, playKey, live]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <svg ref={ref} viewBox="0 0 24 24" width={size} height={size} aria-hidden className={clsx('ai', className)}>
      {def.svg}
    </svg>
  )
}

/** دایره‌ی نیمه‌شفاف آیکون زنده در گوشه‌ی بالا‌چپ کارت */
export function CardIcon(props: { name: IconName; playKey?: unknown; live?: boolean }) {
  return (
    <span className="kic">
      <AnimIcon {...props} />
    </span>
  )
}

/* ───────── کاشی‌های زنده ───────── */
export interface Tile {
  on: boolean
  back?: ReactNode
  front?: ReactNode
  /** محور ورق خوردن (y برای سکه و کارت حرکت) */
  y?: boolean
  glow?: boolean
  soft?: boolean
  /** کلید محتوای روی کاشی؛ با تغییرش کاشی مثل تابلوی فرودگاه ورق می‌خورد */
  flap?: string
  /** کاشی برجسته‌ی «شما» */
  me?: boolean
}

/** آیکون کوچک پشت کاشی */
export const TILE_ICONS = {
  foot: <path d="M10.5 3.8c1.9 0 3.4 2.3 3.4 5.2s-1.5 5.2-3.4 5.2-3.4-2.3-3.4-5.2 1.5-5.2 3.4-5.2zM12.3 16a2.5 2.3 0 1 0 .1 0" />,
  cup: <><path d="M6 4h12l-1.5 16h-9z" /><path d="M6.6 10h10.8" /></>,
  timer: <><circle cx="12" cy="13" r="7" /><path d="M12 13V9M10 3h4" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  dumb: <path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11" />,
  trophy: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4.5a3 3 0 0 0 3 4M17 6h2.5a3 3 0 0 1-3 4" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
}
export const tileIcon = (n: keyof typeof TILE_ICONS) => <svg viewBox="0 0 24 24">{TILE_ICONS[n]}</svg>

/**
 * زمین کاشی ۴×۳ پایین‌چپ کارت. ترتیب کاشی‌ها از کنار متن (پایین‌راست زمین) به‌سمت لبه است.
 * کاشی‌هایی که با هم تغییر می‌کنند به نوبت ورق می‌خورند تا تغییر دیده شود.
 */
export function LiveTiles({ tiles, round, className }: { tiles: Tile[]; round?: boolean; className?: string }) {
  const prev = useRef<boolean[] | null>(null)
  const first = prev.current === null
  // ترتیب تأخیر: فقط کاشی‌هایی که وضعیتشان عوض شده، به نوبت
  let n = 0
  const delays = tiles.map((t, i) => (prev.current && prev.current[i] !== t.on ? n++ * 110 : 0))
  useEffect(() => {
    prev.current = tiles.map((t) => t.on)
  })
  // نگاشت ترتیب منطقی به خانه‌های شبکه: ستون نزدیک متن اول، از پایین به بالا
  const cells = Array.from({ length: 12 }, (_, slot) => {
    const col = 3 - Math.floor(slot / 3) // ۳ = نزدیک متن
    const row = 2 - (slot % 3)
    return { slot, col, row }
  })
  return (
    <div className={clsx('kf-field', round && 'kf-round', className)} aria-hidden>
      {cells.map(({ slot, col, row }) => {
        const t = tiles[slot]
        if (!t) return <span key={slot} className="t" style={{ gridColumn: col + 1, gridRow: row + 1 }}><span className="in"><span className="f" /></span></span>
        return (
          <span
            key={slot}
            className={clsx('t', t.y && 'y', t.on && 'on', t.glow && 'glow', t.me && 'me', first && 'enter')}
            style={{ gridColumn: col + 1, gridRow: row + 1, '--d': `${first ? (row + (3 - col)) * 55 : delays[slot]}ms` } as CSSProperties}
          >
            <span className="in">
              <span key={t.flap} className={clsx('f', t.flap !== undefined && 'flapf', t.flap !== undefined && !first && 'flap')}>{t.front}</span>
              <span className={clsx('b', t.soft && 'soft')}>{t.back}</span>
            </span>
          </span>
        )
      })}
    </div>
  )
}

/** n کاشی روشن از ۱۲ بر اساس نسبت پیشرفت */
export const progressTiles = (pct: number, back: ReactNode, total = 12): Tile[] => {
  const on = Math.round(Math.max(0, Math.min(1, pct)) * total)
  return Array.from({ length: total }, (_, i) => ({ on: i < on, back }))
}

const fa2 = (n: number) => String(Math.max(0, Math.min(99, Math.round(n)))).padStart(2, '0').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])

/**
 * تابلوی امتیاز چالش: ردیف بالا امتیاز (یا درصد)، ردیف میانی هدف، پایین جام و رتبه‌ی شما.
 * هر رقم یک کاشی است و با تغییر عدد ورق می‌خورد.
 */
export function boardTiles({ score, goal, rank, joined }: { score: number; goal: number; rank: number; joined: boolean }): Tile[] {
  const t: Tile[] = Array.from({ length: 12 }, () => ({ on: false }))
  t[3] = { on: false, front: tileIcon('trophy') }
  if (!joined) return t
  const small = goal < 100
  const top = small ? fa2(score) : fa2((score / Math.max(1, goal)) * 100)
  const mid = small ? fa2(goal) : ' ٪'
  // ستون ۳ = نزدیک متن (یکان)، ستون ۲ = دهگان
  t[5] = { on: false, front: top[0], flap: `s0${top[0]}` }
  t[2] = { on: false, front: top[1], flap: `s1${top[1]}` }
  t[4] = { on: false, front: mid[0] }
  t[1] = { on: false, front: mid[1] }
  t[0] = { on: false, front: rank > 0 ? (rank > 99 ? '+' : String(rank).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])) : '–', flap: `r${rank}`, me: true }
  return t
}

/**
 * شلوغی باشگاه: ۴ ستون = ورودهای چهار بازه‌ی ۴۵ دقیقه‌ای اخیر (ستون کنار متن = الان)،
 * ارتفاع هر ستون ۰ تا ۳ نسبت به ظرفیت. ستون «الان» می‌درخشد.
 */
export function crowdTiles(levels: number[]): Tile[] {
  const t: Tile[] = []
  for (let k = 0; k < 4; k++) {
    const lv = levels[k] ?? 0
    for (let r = 0; r < 3; r++) t.push({ on: r < lv, glow: k === 0 && r === Math.max(0, lv - 1) })
  }
  return t
}
