import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { Bell, Check, Dumbbell, Heart, Home, LayoutGrid, MapPin, MessageCircle, Play, Plus, QrCode, Star, Trophy, Users } from 'lucide-react'
import { Emblem } from '@/layouts/Logo'
import { useInView } from '@/ui/motion'

/*
 * «در حرکت ببین»: نسخه‌ی کوچک صفحه‌های واقعی اپ داخل قاب گوشی.
 * هر صحنه چند گام زمان‌بندی‌شده دارد؛ با هر گام، انگشت جابه‌جا می‌شود، لمس می‌کند
 * و صفحه همان واکنشی را نشان می‌دهد که در اپ اصلی می‌بینی.
 * اندازه‌ی صفحه‌ی داخلی: ۲۶۶×۵۳۶؛ نوار وضعیت ۳۴ و نوار پایین ۵۸ پیکسل.
 */

type Tab = 'home' | 'fityab' | 'ch' | 'zone'
interface Pt {
  x: number
  y: number
  tap?: boolean
}
interface SceneDef {
  id: string
  title: string
  desc: string
  icon: typeof Home
  tab: Tab
  steps: number[]
  finger: (s: number) => Pt | null
  Screen: (p: { s: number }) => ReactNode
}

const LIME = '#c6ff3d'

/* ───────── قطعه‌های مشترک ───────── */

function Finger({ p, s }: { p: Pt | null; s: number }) {
  // وقتی انگشت کنار می‌رود، در همان جای آخر محو شود
  const last = useRef<Pt>({ x: 200, y: 420 })
  if (p) last.current = p
  const at = p ?? last.current
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-40 -ml-5 -mt-5 h-10 w-10 transition-[left,top,opacity] duration-700 ease-out-soft"
      style={{ left: at.x, top: at.y, opacity: p ? 1 : 0 }}
    >
      <span key={p?.tap ? s : 'idle'} className={clsx('absolute inset-0 rounded-full border-2 border-white/85 bg-white/25 shadow-[0_6px_20px_rgba(0,0,0,.4)] backdrop-blur-sm', p?.tap && 'sc-tap')} />
      {p?.tap && <span key={`r${s}`} className="sc-ripple absolute inset-0 rounded-full border-2 border-white" />}
    </span>
  )
}

const BURST = [LIME, '#7b5cff', '#ff5fa2', '#2ee6c9', '#ff7a2f']
function Burst({ x, y }: { x: number; y: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute z-30" style={{ left: x, top: y }}>
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2
        const r = 58 + (i % 3) * 24
        return (
          <i
            key={i}
            className="absolute h-2.5 w-1.5 rounded-sm"
            style={{ background: BURST[i % 5], animation: `sc-burst 1s ${(i % 4) * 35}ms cubic-bezier(.23,1,.32,1) both`, '--dx': `${Math.cos(a) * r}px`, '--dy': `${Math.sin(a) * r + 26}px` } as CSSProperties}
          />
        )
      })}
    </span>
  )
}

const NAV = [
  { t: 'home', i: Home, l: 'خانه' },
  { t: 'fityab', i: MapPin, l: 'فیت‌یاب' },
  { t: 'ch', i: Trophy, l: 'چالش‌ها' },
  { t: 'zone', i: Users, l: 'فیت‌زون' },
  { t: 'more', i: LayoutGrid, l: 'خدمات' },
] as const

function MiniNav({ tab }: { tab: Tab }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex h-[58px] items-end justify-around border-t border-white/[.06] bg-[#16131b]/95 px-2 pb-2 backdrop-blur">
      {NAV.map((n) =>
        n.t === 'ch' ? (
          <span key={n.t} className={clsx('card-lime mb-1 flex h-11 w-11 items-center justify-center rounded-full text-ink-950 shadow-glow transition-transform duration-300', tab === 'ch' && 'scale-110')}>
            <Trophy size={19} />
          </span>
        ) : (
          <span key={n.t} className={clsx('flex flex-col items-center gap-0.5 text-[9px] transition-colors duration-300', tab === n.t ? 'text-white' : 'text-white/40')}>
            <span className={clsx('flex h-6 w-10 items-center justify-center rounded-full transition-colors duration-300', tab === n.t && 'bg-white/[.12]')}>
              <n.i size={15} />
            </span>
            {n.l}
          </span>
        ),
      )}
    </div>
  )
}

/** محتوای اسکرول‌شونده‌ی هر صفحه (بین نوار وضعیت و نوار پایین) */
function Body({ children, y = 0, className }: { children: ReactNode; y?: number; className?: string }) {
  return (
    <div className="absolute inset-x-0 bottom-[58px] top-[34px] overflow-hidden">
      <div className={clsx('sc-t px-3 pt-2', className)} style={{ transform: `translateY(${y}px)` }}>
        {children}
      </div>
    </div>
  )
}

/** صفحه‌ی دوم که از سمت چپ وارد می‌شود (حرکت «رفتن به جزئیات» در اپ راست‌به‌چپ) */
function Push({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <div className="sc-t absolute inset-x-0 bottom-[58px] top-[34px] z-10 overflow-hidden bg-[#131118]" style={{ transform: `translateX(${on ? 0 : -105}%)`, boxShadow: on ? '0 0 40px rgba(0,0,0,.6)' : 'none' }}>
      {children}
    </div>
  )
}

function Sheet({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <>
      <div className="absolute inset-0 z-20 bg-black/50 transition-opacity duration-500" style={{ opacity: on ? 1 : 0 }} />
      <div className="sc-t absolute inset-x-0 bottom-0 z-30 rounded-t-[26px] bg-[#1d1a23] px-4 pb-5 pt-2" style={{ transform: `translateY(${on ? 0 : 105}%)` }}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        {children}
      </div>
    </>
  )
}

function Ring({ value, size = 64, stroke = 9, color = 'currentColor' }: { value: number; size?: number; stroke?: number; color?: string }) {
  const C = 2 * Math.PI * 42
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} className="-rotate-90" aria-hidden>
      <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeOpacity=".18" strokeWidth={stroke} />
      <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - value)} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.23,1,.32,1)' }} />
    </svg>
  )
}

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx('h-1.5 overflow-hidden rounded-full bg-white/45', className)}>
      <div className="h-full rounded-full bg-ink-950 transition-[width] duration-1000 ease-out-soft" style={{ width: `${value * 100}%` }} />
    </div>
  )
}

/** QR نمایشی */
function MiniQr({ size = 120 }: { size?: number }) {
  return (
    <div className="grid grid-cols-9 grid-rows-9 gap-[2px] rounded-xl bg-white p-2" style={{ width: size, height: size }}>
      {Array.from({ length: 81 }, (_, i) => {
        const r = Math.floor(i / 9)
        const c = i % 9
        const eye = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)
        const on = eye ? !(r % 6 === 1 && c % 6 === 1) || (r % 6 === 1 && c % 6 === 1) : (i * 13) % 7 < 3
        return <span key={i} className={clsx('rounded-[2px]', on ? 'bg-ink-950' : 'bg-transparent')} />
      })}
    </div>
  )
}

/* ───────── ۱. خانه: ثبت قدم و پر شدن هدف ───────── */

function HomeScreen({ s }: { s: number }) {
  const done = s >= 2
  return (
    <>
      <Body y={s >= 4 ? -186 : 0}>
        <div className="flex h-9 items-center justify-between">
          <div>
            <div className="text-[10px] text-white/50">جمعه ۲ آبان</div>
            <div className="text-[15px] font-extrabold">عصر بخیر، سارا</div>
          </div>
          <span className="card-lime flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-ink-950">
            <QrCode size={12} /> ورود
          </span>
        </div>
        <div className="card-mint anim-enter mt-2 h-[150px] rounded-[22px] p-3.5 text-ink-950">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold opacity-70">امروز</span>
            <span className="flex rounded-full bg-white/45 p-0.5">
              <span className="rounded-full bg-ink-950 px-2 py-0.5 font-bold text-white">قدم</span>
              <span className="px-2 py-0.5 opacity-60">آب</span>
              <span className="px-2 py-0.5 opacity-60">تمرین</span>
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div key={done ? 'b' : 'a'} className={clsx('text-[30px] font-black leading-none', done && 'sc-pop')}>{done ? '۷٬۴۸۰' : '۶٬۴۸۰'}</div>
              <div className="mt-1 text-[10px] opacity-70">{s >= 3 ? 'هدف امروز کامل شد!' : 'از هدف ۸٬۰۰۰ قدم'}</div>
            </div>
            <Ring value={s >= 3 ? 1 : done ? 0.93 : 0.62} />
          </div>
          <span className={clsx('mt-2.5 inline-flex h-8 items-center gap-1 rounded-full bg-ink-950 px-3 text-[11px] font-bold text-white transition-transform duration-150', s === 2 && 'scale-95')}>
            <Plus size={13} /> ثبت ۱٬۰۰۰ قدم
          </span>
        </div>
        <div className="card-night anim-enter relative mt-2.5 overflow-hidden rounded-[22px] p-3.5" style={{ animationDelay: '80ms' }}>
          <span className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(140,110,255,.5),transparent_65%)]" />
          <div className="relative text-[10px] text-white/55">تمرین امروز</div>
          <div className="relative text-[14px] font-extrabold">روز ۳: پا و سرینی</div>
          <div className="relative mt-2 flex justify-between">
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((d, i) => (
              <span key={d} className={clsx('flex h-6 w-6 items-center justify-center rounded-full text-[9px]', i < 3 ? 'card-lime font-bold text-ink-950' : i === 3 ? 'border border-dashed border-white/40' : 'bg-white/10')}>
                {i < 3 ? <Check size={11} strokeWidth={3} /> : d}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[14px] font-extrabold">چالش‌ها</span>
          <span className="text-[10px] text-white/50">همه</span>
        </div>
        <div className="sc-t mt-2 flex gap-2" style={{ transform: `translateX(${s >= 5 ? 96 : 0}px)` }}>
          {[
            { t: '۳۰ روز، ۳۰ تمرین', tone: 'card-violet', v: 0.7 },
            { t: '۳۰۰ هزار قدم', tone: 'card-lime', v: 0.6 },
            { t: 'ماراتن ۴۲ کیلومتر', tone: 'card-peach', v: 0.45 },
          ].map((c) => (
            <div key={c.t} className={clsx('flex h-[112px] w-[132px] shrink-0 flex-col rounded-[20px] p-3 text-ink-950', c.tone)}>
              <span className="text-[9px] font-bold opacity-60">۱۲ روز مانده</span>
              <span className="mt-1 text-[12px] font-extrabold leading-5">{c.t}</span>
              <Bar value={s >= 4 ? c.v : 0} className="mt-auto" />
            </div>
          ))}
        </div>
        <div className="mt-4 text-[14px] font-extrabold">امکانات</div>
        <div className="mt-2 space-y-[-28px]">
          {['card-pink', 'card-violet', 'card-mint'].map((t, i) => (
            <div key={t} className={clsx('h-[64px] rounded-[20px] p-3 text-[12px] font-extrabold text-ink-950', t)} style={{ position: 'relative', zIndex: 3 - i }}>
              {['ورزش', 'سلامت', 'فروشگاه'][i]}
            </div>
          ))}
        </div>
      </Body>
      {s === 3 && (
        <>
          <Burst x={133} y={160} />
          <div className="sc-pop absolute left-1/2 top-[52px] z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-ink-950 shadow-lg">هدف امروز کامل شد!</div>
        </>
      )}
    </>
  )
}

/* ───────── ۲. فیت‌یاب: نقشه، باشگاه، خرید بلیت ───────── */

const PINS = [
  { x: 64, y: 70, tone: 'card-lime' },
  { x: 170, y: 52, tone: 'card-violet' },
  { x: 200, y: 140, tone: 'card-pink' },
  { x: 92, y: 168, tone: 'card-mint' },
  { x: 150, y: 214, tone: 'card-peach' },
]

function FitYabScreen({ s }: { s: number }) {
  return (
    <>
      <div className="absolute inset-x-0 bottom-[58px] top-[34px] overflow-hidden bg-[#1a1720]">
        <svg viewBox="0 0 266 444" className="absolute inset-0 h-full w-full" aria-hidden>
          {[40, 110, 180, 250].map((y) => <path key={y} d={`M-10 ${y} L280 ${y - 30}`} stroke="rgba(255,255,255,.06)" strokeWidth="7" />)}
          {[30, 120, 210].map((x) => <path key={x} d={`M${x} -10 L${x + 26} 460`} stroke="rgba(255,255,255,.06)" strokeWidth="6" />)}
          {/* زاینده‌رود */}
          <path d="M-10 290 C60 250 120 300 170 262 S250 230 280 246" stroke="rgba(46,230,201,.22)" strokeWidth="16" fill="none" strokeLinecap="round" />
          <path d="M98 270 l18 -6" stroke="rgba(255,255,255,.18)" strokeWidth="5" />
        </svg>
        <div className="absolute inset-x-3 top-2 flex h-9 items-center gap-2 rounded-full bg-[#26222e]/95 px-3 text-[11px] text-white/50">
          <MapPin size={13} /> باشگاه، استخر، کلاس…
        </div>
        {PINS.map((p, i) => (
          <span key={i} className={clsx('sc-pop absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-ink-950 shadow-lg ring-2 ring-[#1a1720]', p.tone)} style={{ left: p.x, top: p.y + 30, animationDelay: `${i * 90}ms` }}>
            <Dumbbell size={13} />
          </span>
        ))}
        <span className="absolute h-3.5 w-3.5 rounded-full bg-[#2ee6c9] ring-4 ring-[#2ee6c9]/30" style={{ left: 120, top: 150 }}>
          <span className="sc-ping absolute inset-0 rounded-full bg-[#2ee6c9]" />
        </span>
        <div className="absolute inset-x-0 bottom-0 rounded-t-[22px] bg-[#1d1a23] px-3 pb-3 pt-2 shadow-[0_-10px_30px_rgba(0,0,0,.4)]">
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-white/20" />
          <div className="mb-2 text-[12px] font-extrabold">نزدیک تو در اصفهان</div>
          {[
            { n: 'باشگاه آیرون‌من', d: '۶۰۰ متر · چهارباغ', p: '۹۵ هزار', t: 'card-peach' },
            { n: 'مجموعه آبی آکوا', d: '۱٫۲ کیلومتر · نظر', p: '۱۲۰ هزار', t: 'card-mint' },
          ].map((g, i) => (
            <div key={g.n} className={clsx('flex items-center gap-2.5 rounded-[16px] p-2 transition-colors duration-200', i === 0 && s === 2 ? 'bg-white/[.12]' : 'bg-white/[.04]', i > 0 && 'mt-1.5')}>
              <span className={clsx('flex h-10 w-10 items-center justify-center rounded-[12px] text-ink-950', g.t)}><Dumbbell size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold">{g.n}</span>
                <span className="block text-[10px] text-white/50">{g.d}</span>
              </span>
              <span className="text-[10px] font-bold text-[#c6ff3d]">{g.p}</span>
            </div>
          ))}
        </div>
      </div>
      <Push on={s >= 3}>
        <div className="card-peach relative h-[132px] overflow-hidden text-ink-950">
          <svg viewBox="0 0 266 132" className="absolute inset-0 h-full w-full opacity-[.14]" aria-hidden>
            {[0, 1, 2, 3].map((i) => <ellipse key={i} cx="133" cy="150" rx={60 + i * 34} ry={50 + i * 26} fill="none" stroke="#121016" strokeWidth="3" />)}
          </svg>
          <span className="absolute right-3 top-3 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold">باز است · تا ۲۳</span>
          <Dumbbell size={54} strokeWidth={1.4} className="absolute bottom-3 left-4 opacity-70" />
        </div>
        <div className="px-3 pt-3">
          <div className="text-[17px] font-extrabold">باشگاه آیرون‌من</div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/55">
            <Star size={11} className="fill-[#ff7a2f] text-[#ff7a2f]" /> ۴٫۸ · ۲۴۰ نظر · چهارباغ
          </div>
          <div className="mt-2.5 flex gap-1.5">
            {['بدنسازی', 'کراس‌فیت', 'کاردیو'].map((x) => <span key={x} className="rounded-full bg-white/[.08] px-2.5 py-1 text-[10px]">{x}</span>)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            {[['۶۰۰ م', 'فاصله'], ['۹۵ هزار', 'هر سانس'], ['۳۸ نفر', 'الان']].map(([a, b]) => (
              <span key={b} className="rounded-[14px] bg-white/[.05] py-2">
                <span className="block text-[12px] font-extrabold">{a}</span>
                <span className="block text-[9px] text-white/45">{b}</span>
              </span>
            ))}
          </div>
          <div className="mt-3 h-[52px] rounded-[16px] bg-white/[.04] p-2.5 text-[10px] leading-4 text-white/55">سالن ۸۰۰ متری، دستگاه‌های تکنوجیم، رختکن و دوش، پارکینگ.</div>
          <span className={clsx('card-lime mt-3 flex h-10 items-center justify-center rounded-full text-[12px] font-extrabold text-ink-950 shadow-glow transition-transform duration-150', s === 5 && 'scale-95')}>خرید بلیت امروز</span>
        </div>
      </Push>
      <Sheet on={s >= 6}>
        <div className="flex flex-col items-center text-center">
          <span className="rounded-full bg-[#2ee6c9]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#2ee6c9]">فعال</span>
          <div className="mt-2 text-[13px] font-extrabold">بلیت ورود · باشگاه آیرون‌من</div>
          <div className="mt-3"><MiniQr size={112} /></div>
          <div className="mt-2 text-[22px] font-black tracking-widest">۵۶۳۶۵۳</div>
          <div className="text-[10px] text-white/50">QR یا کد را در پذیرش نشان بده</div>
        </div>
      </Sheet>
    </>
  )
}

/* ───────── ۳. ورود با اسکن QR ───────── */

function ScanScreen({ s }: { s: number }) {
  const ok = s >= 3
  return (
    <div className="absolute inset-x-0 bottom-[58px] top-[34px] overflow-hidden bg-[#0d0c10]">
      {/* نمای دوربین: دیوار پذیرش باشگاه */}
      <div className={clsx('absolute inset-0 transition-[filter,opacity] duration-500', ok && 'opacity-30 blur-sm')}>
        <div className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,#2a2533,#1a1720)]" />
        <div className="absolute inset-x-6 bottom-10 top-[52%] rounded-t-[10px] bg-[#231f2b]" />
        <div className="sc-t absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 rounded-[18px] bg-white p-2.5 shadow-2xl" style={{ transform: `translate(-50%,-50%) scale(${s >= 1 ? 1 : 0.82}) rotate(${s >= 1 ? 0 : -6}deg)` }}>
          <MiniQr size={104} />
          <div className="mt-1.5 flex items-center justify-center gap-1 text-[9px] font-bold text-ink-950">
            <Emblem size={12} /> ورود با کی‌فیت
          </div>
        </div>
        {/* قاب اسکن */}
        <div className="absolute left-1/2 top-[44%] h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2">
          {['right-0 top-0 border-r-4 border-t-4 rounded-tr-[22px]', 'left-0 top-0 border-l-4 border-t-4 rounded-tl-[22px]', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-[22px]', 'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-[22px]'].map((c) => (
            <span key={c} className={clsx('absolute h-8 w-8 border-[#c6ff3d]', c)} />
          ))}
          {s >= 1 && !ok && <span className="m-scan absolute inset-x-3 top-3 h-[3px] rounded-full bg-[#c6ff3d] shadow-[0_0_18px_4px_rgba(198,255,61,.6)]" />}
        </div>
        <div className="absolute inset-x-0 bottom-3 text-center text-[11px] text-white/70">QR دم در باشگاه را در قاب بگیر</div>
      </div>
      {s === 2 && <div className="sc-flash absolute inset-0 z-10 bg-white" />}
      {ok && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
          <Burst x={133} y={150} />
          <span className="sc-pop card-mint flex h-24 w-24 items-center justify-center rounded-full text-ink-950 shadow-[0_0_60px_rgba(46,230,201,.5)]">
            <Check size={46} strokeWidth={3} />
          </span>
          <div className="anim-enter mt-4 text-[18px] font-extrabold" style={{ animationDelay: '150ms' }}>ورودت ثبت شد</div>
          <div className="anim-enter mt-1 text-[11px] text-white/60" style={{ animationDelay: '220ms' }}>باشگاه آیرون‌من · ساعت ۱۸:۴۲</div>
          <div className="anim-enter mt-4 flex gap-1.5" style={{ animationDelay: '300ms' }}>
            <span className="card-lime rounded-full px-3 py-1 text-[11px] font-bold text-ink-950">+۲۰ امتیاز</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px]">یک قدم در چالش ۳۰ روزه</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────── ۴. چالش‌ها: انتخاب، رتبه‌بندی، پیوستن ───────── */

const CH = [
  { t: '۳۰ روز، ۳۰ تمرین', tone: 'card-violet', v: 0.7, p: '۴۸ نفر' },
  { t: '۳۰۰ هزار قدم', tone: 'card-lime', v: 0.55, p: '۱۲۶ نفر' },
  { t: 'ماراتن ۴۲ کیلومتر', tone: 'card-peach', v: 0.4, p: '۳۱ نفر' },
]

function ChallengesScreen({ s }: { s: number }) {
  const joined = s >= 6
  return (
    <>
      <Body>
        <div className="text-[18px] font-extrabold">چالش‌ها</div>
        <div className="mt-2 flex gap-1.5 text-[10px]">
          <span className="rounded-full bg-white px-3 py-1 font-bold text-ink-950">فعال</span>
          <span className="rounded-full bg-white/[.08] px-3 py-1">من</span>
          <span className="rounded-full bg-white/[.08] px-3 py-1">جایزه‌دار</span>
        </div>
        <div className="mt-3 space-y-2">
          {CH.map((c, i) => (
            <div key={c.t} className={clsx('anim-enter rounded-[20px] p-3 text-ink-950 transition-transform duration-150', c.tone, i === 1 && s === 2 && 'scale-[.97]')} style={{ animationDelay: `${i * 90}ms` }}>
              <div className="flex justify-between text-[9px] font-bold opacity-60">
                <span>۱۲ روز مانده</span>
                <span>{c.p}</span>
              </div>
              <div className="mt-1 text-[14px] font-extrabold">{c.t}</div>
              <div className="mt-2 flex items-center gap-2">
                <Bar value={s >= 1 ? c.v : 0} className="flex-1" />
                <span className="text-[9px] font-bold">رتبه‌ی {['۲', '۵', '۱'][i]}</span>
              </div>
            </div>
          ))}
        </div>
      </Body>
      <Push on={s >= 3}>
        <div className="px-3 pt-2">
          <div className="card-lime relative overflow-hidden rounded-[24px] p-4 text-ink-950">
            <Trophy size={70} strokeWidth={1.2} className="absolute -bottom-3 -left-2 opacity-20" />
            <div className="text-[10px] font-bold opacity-60">چالش قدم · ۱۲ روز مانده</div>
            <div className="mt-1 text-[19px] font-black">۳۰۰ هزار قدم</div>
            <div className="mt-2 inline-flex rounded-full bg-ink-950 px-2.5 py-1 text-[10px] font-bold text-white">جایزه: ۵ میلیون تومان</div>
            <div className="mt-3 flex -space-x-2 space-x-reverse">
              {['card-violet', 'card-pink', 'card-mint', 'card-peach'].map((t) => <span key={t} className={clsx('h-6 w-6 rounded-full ring-2 ring-[#d9ff7a]', t)} />)}
              <span className="mr-3 self-center text-[10px] font-bold">+۱۲۲ نفر</span>
            </div>
          </div>
          <div className="mt-3 text-[12px] font-extrabold">جدول امتیاز</div>
          {[
            ['مهدی کریمی', '۲۱۴ هزار'],
            ['نگار احمدی', '۱۹۸ هزار'],
            ['رضا نوری', '۱۸۰ هزار'],
          ].map(([n, v], i) => (
            <div key={n} className="sc-t mt-1.5 flex items-center gap-2 rounded-[14px] bg-white/[.05] p-2" style={{ transform: `translateX(${s >= 3 ? 0 : -40}px)`, opacity: s >= 3 ? 1 : 0, transitionDelay: `${200 + i * 90}ms` }}>
              <span className="w-4 text-center text-[11px] font-bold text-white/50">{['۱', '۲', '۳'][i]}</span>
              <span className={clsx('h-7 w-7 rounded-full', ['card-peach', 'card-pink', 'card-mint'][i])} />
              <span className="flex-1 text-[11px] font-semibold">{n}</span>
              <span className="text-[10px] text-white/55">{v} قدم</span>
            </div>
          ))}
          <span className={clsx('mt-3 flex h-10 items-center justify-center gap-1.5 rounded-full text-[12px] font-extrabold transition-all duration-300', joined ? 'card-mint text-ink-950' : 'bg-white text-ink-950', s === 5 && 'scale-95')}>
            {joined ? <><Check size={15} strokeWidth={3} /> به چالش پیوستی</> : 'بپیوند · ورودی ۵۰ هزار تومان'}
          </span>
        </div>
      </Push>
      {joined && <Burst x={133} y={400} />}
    </>
  )
}

/* ───────── ۵. فیت‌زون: استوری، فید، لایک ───────── */

function ZoneScreen({ s }: { s: number }) {
  const liked = s >= 4
  return (
    <Body y={s >= 5 ? -250 : s >= 1 ? -40 : 0}>
      <div className="flex items-center justify-between">
        <span className="text-[18px] font-extrabold">فیت‌زون</span>
        <span className="card-lime flex h-7 w-7 items-center justify-center rounded-full text-ink-950"><Plus size={15} /></span>
      </div>
      <div className="mt-2 flex gap-1.5">
        {['card-violet', 'card-pink', 'card-mint', 'card-peach', 'card-lime'].map((t, i) => (
          <span key={t} className={clsx('anim-enter h-[70px] w-[46px] shrink-0 rounded-[14px] p-[2px]', t)} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="flex h-full w-full items-end justify-center rounded-[12px] bg-ink-900/60 pb-1 text-[8px]">{['مینا', 'علی', 'سارا', 'رضا', 'نگار'][i]}</span>
          </span>
        ))}
      </div>
      <div className="mt-3 rounded-[22px] bg-white/[.05] p-2.5">
        <div className="flex items-center gap-2">
          <span className="card-pink h-7 w-7 rounded-full" />
          <span>
            <span className="block text-[11px] font-bold">نگار احمدی</span>
            <span className="block text-[9px] text-white/45">۲۰ دقیقه پیش</span>
          </span>
        </div>
        <div className="card-peach relative mt-2 flex h-[150px] items-center justify-center overflow-hidden rounded-[18px] p-4 text-center text-[16px] font-black leading-7 text-ink-950">
          امروز ۵ کیلومتر کنار زاینده‌رود دویدم!
          {liked && (
            <span className="sc-heart absolute inset-0 flex items-center justify-center">
              <Heart size={78} className="fill-white text-white drop-shadow-xl" />
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3 px-1 text-[11px] text-white/70">
          <span className="flex items-center gap-1">
            <Heart size={16} className={clsx('transition-colors duration-300', liked ? 'sc-pop fill-[#ff5fa2] text-[#ff5fa2]' : '')} /> {liked ? '۱۲۹' : '۱۲۸'}
          </span>
          <span className="flex items-center gap-1"><MessageCircle size={15} /> ۱۴</span>
        </div>
      </div>
      <div className="mt-3 rounded-[22px] bg-white/[.05] p-2.5">
        <div className="flex items-center gap-2">
          <span className="card-violet h-7 w-7 rounded-full" />
          <span className="text-[11px] font-bold">باشگاه آیرون‌من</span>
        </div>
        <div className="relative mt-2 h-[150px] overflow-hidden rounded-[18px] bg-[linear-gradient(140deg,#2a2533,#121016)]">
          <Dumbbell size={90} strokeWidth={1} className="absolute bottom-2 left-6 -rotate-12 text-white/15" />
          <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-950"><Play size={18} className="mr-[-2px] fill-current" /></span>
          <span className="absolute inset-x-3 bottom-2 h-1 overflow-hidden rounded-full bg-white/20">
            <span className="block h-full rounded-full bg-[#c6ff3d] transition-[width] duration-1000 ease-linear" style={{ width: s >= 5 ? '45%' : '0%' }} />
          </span>
        </div>
      </div>
    </Body>
  )
}

/* ───────── فهرست صحنه‌ها ───────── */

const SCENES: SceneDef[] = [
  {
    id: 'home', title: 'داشبورد روزانه', desc: 'قدم، آب و تمرین امروز را با یک لمس ثبت کن و پر شدن هدفت را ببین.', icon: Home, tab: 'home',
    steps: [800, 900, 500, 1600, 1300, 1400],
    finger: (s) => (s === 1 ? { x: 190, y: 214 } : s === 2 ? { x: 190, y: 214, tap: true } : s === 3 ? { x: 200, y: 260 } : null),
    Screen: HomeScreen,
  },
  {
    id: 'fityab', title: 'باشگاه نزدیک، بلیت فوری', desc: 'باشگاه‌ها و استخرهای اصفهان را روی نقشه ببین و با اعتبار اشتراک بلیت بگیر.', icon: MapPin, tab: 'fityab',
    steps: [900, 900, 450, 1200, 900, 450, 2000],
    finger: (s) => (s === 1 ? { x: 150, y: 388 } : s === 2 ? { x: 150, y: 388, tap: true } : s === 4 ? { x: 133, y: 408 } : s === 5 ? { x: 133, y: 408, tap: true } : null),
    Screen: FitYabScreen,
  },
  {
    id: 'scan', title: 'ورود با یک اسکن', desc: 'دم در باشگاه QR را اسکن کن؛ ورودت ثبت می‌شود و امتیاز می‌گیری.', icon: QrCode, tab: 'home',
    steps: [700, 1800, 350, 2200],
    finger: () => null,
    Screen: ScanScreen,
  },
  {
    id: 'ch', title: 'چالش و جایزه', desc: 'در چالش‌های قدم، تمرین و دویدن شرکت کن، رتبه بگیر و جایزه‌ی نقدی ببر.', icon: Trophy, tab: 'ch',
    steps: [800, 900, 450, 1300, 900, 450, 2000],
    finger: (s) => (s === 1 ? { x: 150, y: 236 } : s === 2 ? { x: 150, y: 236, tap: true } : s === 4 ? { x: 133, y: 398 } : s === 5 ? { x: 133, y: 398, tap: true } : null),
    Screen: ChallengesScreen,
  },
  {
    id: 'zone', title: 'فیت‌زون', desc: 'عکس، ویدیو و استوری تمرینت را بگذار و ورزشکارهای شهرت را دنبال کن.', icon: Heart, tab: 'zone',
    steps: [800, 1100, 600, 450, 1300, 1800],
    finger: (s) => (s === 2 ? { x: 133, y: 200 } : s === 3 ? { x: 133, y: 200, tap: true } : null),
    Screen: ZoneScreen,
  },
]

export function Showcase() {
  const [ref, seen] = useInView<HTMLElement>()
  const [i, setI] = useState(0)
  const [s, setS] = useState(0)
  const scene = SCENES[i]
  useEffect(() => {
    if (!seen) return
    const t = setTimeout(() => {
      if (s < scene.steps.length - 1) setS(s + 1)
      else {
        setI((i + 1) % SCENES.length)
        setS(0)
      }
    }, scene.steps[s])
    return () => clearTimeout(t)
  }, [seen, i, s, scene])
  const total = scene.steps.reduce((a, b) => a + b, 0)
  const S = scene.Screen
  return (
    <section ref={ref} id="tour" aria-label="معرفی قابلیت‌ها" className="grid items-center gap-10 lg:grid-cols-[1fr_340px]">
      <ol className="order-2 space-y-2 lg:order-1">
        {SCENES.map((x, j) => (
          <li key={x.id}>
            <button
              onClick={() => {
                setI(j)
                setS(0)
              }}
              aria-current={i === j}
              className={clsx('press relative w-full overflow-hidden rounded-[24px] p-4 text-start', i === j ? 'bg-white/[.08]' : 'opacity-55 hover:opacity-90')}
            >
              <span className="flex items-center gap-3">
                <span className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-300', i === j ? 'card-lime text-ink-950' : 'bg-white/10')}>
                  <x.icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-extrabold">{x.title}</span>
                  {i === j && <span className="anim-item mt-1 block text-[14px] leading-7 text-white/65">{x.desc}</span>}
                </span>
              </span>
              {i === j && seen && <span key={i} className="m-bar absolute inset-x-0 bottom-0 h-[3px] bg-[#c6ff3d]" style={{ animationDuration: `${total}ms` }} />}
            </button>
          </li>
        ))}
      </ol>
      <div className="order-1 mx-auto lg:order-2" aria-hidden>
        <div className="relative h-[560px] w-[290px] rounded-[48px] bg-[#0b0a0e] p-3 shadow-[0_40px_120px_-30px_rgba(123,92,255,.6)] ring-1 ring-white/10">
          <div className="absolute left-1/2 top-4 z-50 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          <div className="sport-bg relative h-full w-full overflow-hidden rounded-[38px] bg-[#131118] text-white">
            <div className="absolute inset-x-0 top-0 z-30 flex h-[34px] items-center justify-between px-6 pt-1 text-[10px] font-semibold text-white/70">
              <span>۱۸:۴۲</span>
              <span className="flex items-center gap-1">
                <Bell size={10} /> <span className="h-2 w-4 rounded-sm border border-white/60" />
              </span>
            </div>
            <div key={scene.id} className="anim-fade absolute inset-0">
              <S s={s} />
            </div>
            <MiniNav tab={scene.tab} />
            <Finger p={scene.finger(s)} s={s} />
          </div>
        </div>
      </div>
    </section>
  )
}
