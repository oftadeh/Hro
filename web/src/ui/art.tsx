/**
 * تصویرسازی‌های متحرک کی‌فیت — کاراکترها و نمادهای تخت (Flat) به صورت SVG درون‌خطی.
 * همه‌ی حرکت‌ها با کلاس‌های kf-* در index.css انجام می‌شود و با «کاهش حرکت» سیستم غیرفعال می‌شوند.
 */
import { useId, type CSSProperties, type ReactNode } from 'react'
import type { ChallengeMetric } from '@/core/types'

const SKIN = '#f6c9a6'
const SKIN2 = '#e7a984'
const HAIR = '#2d2440'
const SHOE = '#1e1b25'

type ArtProps = { size?: number; className?: string; style?: CSSProperties }

const o = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` })
const d = (s: number): CSSProperties => ({ animationDelay: `${s}s` })

function Svg({ vb, size = 120, className, style, children, label }: ArtProps & { vb: string; children: ReactNode; label?: string }) {
  return (
    <svg data-art viewBox={vb} width={size} height={size} className={className} style={style} role="img" aria-label={label} fill="none">
      {children}
    </svg>
  )
}

const Shadow = ({ cx, cy, rx }: { cx: number; cy: number; rx: number }) => <ellipse cx={cx} cy={cy} rx={rx} ry={rx / 7} fill="#000" opacity=".18" />

/** دونده با حرکت دست و پا */
export function Runner({ shirt = '#a78bfa', pants = '#3a3545', accent = '#6ee7c8', ...p }: ArtProps & { shirt?: string; pants?: string; accent?: string }) {
  return (
    <Svg vb="0 0 120 140" label="دونده" {...p}>
      <Shadow cx={62} cy={133} rx={26} />
      <g className="kf-speed" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity=".7">
        <path d="M14 60h18M8 74h22M18 88h14" />
      </g>
      <g className="kf-bob">
        <g className="kf-swing-rev" style={o(60, 80)}>
          <path d="M60 80 L55 104 L46 122" stroke="#27232f" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M40 123h12" stroke={SHOE} strokeWidth="7" strokeLinecap="round" />
        </g>
        <g className="kf-swing" style={o(62, 52)}>
          <path d="M62 52 L55 68 L63 78" stroke={SKIN2} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d="M53 50 Q62 43 73 48 L71 83 Q62 88 55 83 Z" fill={shirt} />
        <path d="M58 60h10" stroke="#fff" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
        <circle cx="68" cy="35" r="10.5" fill={SKIN} />
        <path d="M57.5 34 Q59 21 72 24 Q80 27 78.5 34 Q71 29 64 31.5 Z" fill={HAIR} />
        <path d="M58 32.5 Q68 27 79 31" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <circle cx="72.5" cy="36" r="1.2" fill={HAIR} />
        <g className="kf-swing" style={o(62, 80)}>
          <path d="M62 80 L71 101 L67 122" stroke={pants} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M63 123h13" stroke={SHOE} strokeWidth="7" strokeLinecap="round" />
          <path d="M66 123h6" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="kf-swing-rev" style={o(66, 52)}>
          <path d="M66 52 L75 66 L86 60" stroke={SKIN} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </Svg>
  )
}

/** وزنه‌بردار با حرکت اسکات */
export function Lifter({ shirt = '#f2a3e2', pants = '#3a3545', ...p }: ArtProps & { shirt?: string; pants?: string }) {
  return (
    <Svg vb="0 0 120 140" label="وزنه‌بردار" {...p}>
      <Shadow cx={60} cy={133} rx={30} />
      <g className="kf-squat-legs" style={o(60, 128)}>
        <path d="M54 88 L46 108 L48 126" stroke={pants} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M66 88 L74 108 L72 126" stroke={pants} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M41 127h12M67 127h12" stroke={SHOE} strokeWidth="7" strokeLinecap="round" />
      </g>
      <g className="kf-squat-up">
        <path d="M46 56 Q60 49 74 56 L72 92 Q60 97 48 92 Z" fill={shirt} />
        <circle cx="60" cy="40" r="11" fill={SKIN} />
        <path d="M49 38 Q51 26 61 27 Q71 27 71 37 Q64 32 56 33 Q52 34 49 38Z" fill={HAIR} />
        <circle cx="56" cy="41" r="1.2" fill={HAIR} />
        <circle cx="64" cy="41" r="1.2" fill={HAIR} />
        <path d="M57 46 q3 2 6 0" stroke={HAIR} strokeWidth="1.4" strokeLinecap="round" />
        <g className="kf-lift">
          <path d="M48 58 L38 44 L40 26" stroke={SKIN} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M72 58 L82 44 L80 26" stroke={SKIN} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 24h84" stroke="#9a93a9" strokeWidth="4" strokeLinecap="round" />
          <rect x="12" y="13" width="9" height="22" rx="3" fill="#a78bfa" />
          <rect x="22" y="16" width="6" height="16" rx="2" fill="#6ee7c8" />
          <rect x="99" y="13" width="9" height="22" rx="3" fill="#a78bfa" />
          <rect x="92" y="16" width="6" height="16" rx="2" fill="#6ee7c8" />
        </g>
      </g>
    </Svg>
  )
}

/** دوچرخه‌سوار با چرخ‌های در حال چرخش */
export function Cyclist({ shirt = '#6ee7c8', ...p }: ArtProps & { shirt?: string }) {
  const Wheel = ({ cx }: { cx: number }) => (
    <g className="kf-spin" style={o(cx, 92)}>
      <circle cx={cx} cy="92" r="19" stroke="#3a3545" strokeWidth="4" />
      <path d={`M${cx - 19} 92h38M${cx} 73v38M${cx - 13} 79l26 26M${cx + 13} 79l-26 26`} stroke="#9a93a9" strokeWidth="1.5" />
    </g>
  )
  return (
    <Svg vb="0 0 140 130" label="دوچرخه‌سوار" {...p}>
      <Shadow cx={70} cy={118} rx={50} />
      <g className="kf-bob">
        <Wheel cx={34} />
        <Wheel cx={106} />
        <path d="M34 92 L60 92 L84 62 L52 62 L60 92 M84 62 L106 92 M52 62 L48 54 M82 62 L86 50 L96 50" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="42" y="50" width="14" height="5" rx="2.5" fill="#27232f" />
        <g className="kf-swing-sm" style={o(52, 54)}>
          <path d="M52 54 L66 72 L60 92" stroke="#27232f" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d="M50 54 Q58 34 78 34 L82 42 Q66 46 58 58 Z" fill={shirt} />
        <path d="M76 36 L90 46 L92 50" stroke={SKIN} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="86" cy="24" r="10" fill={SKIN} />
        <path d="M76 22 Q80 10 92 14 Q98 18 95 24 Q88 18 80 22Z" fill="#fcd679" />
        <path d="M74 21 Q85 9 97 20" stroke="#f2a3e2" strokeWidth="4" strokeLinecap="round" />
        <g className="kf-swing-sm-rev" style={o(54, 54)}>
          <path d="M54 54 L72 70 L66 92" stroke="#3a3545" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </Svg>
  )
}

/** مدیتیشن/یوگا با تنفس آرام */
export function Yoga({ shirt = '#c4b5fd', ...p }: ArtProps & { shirt?: string }) {
  return (
    <Svg vb="0 0 120 120" label="یوگا" {...p}>
      <Shadow cx={60} cy={108} rx={36} />
      {[[18, 30, 0], [100, 24, 0.7], [96, 70, 1.3], [22, 74, 1.8]].map(([x, y, dl], i) => (
        <path key={i} className="kf-twinkle" style={d(dl)} d={`M${x} ${y - 5}l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z`} fill={['#fcd679', '#6ee7c8', '#f2a3e2', '#a78bfa'][i]} />
      ))}
      <g className="kf-float">
        <path d="M24 98 Q60 80 96 98 Q90 106 60 104 Q30 106 24 98Z" fill="#3a3545" />
        <g className="kf-breathe" style={o(60, 96)}>
          <path d="M44 92 Q42 62 60 56 Q78 62 76 92 Z" fill={shirt} />
          <path d="M46 70 Q34 84 34 94" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />
          <path d="M74 70 Q86 84 86 94" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />
          <circle cx="34" cy="95" r="4" fill={SKIN} />
          <circle cx="86" cy="95" r="4" fill={SKIN} />
          <circle cx="60" cy="42" r="11" fill={SKIN} />
          <path d="M49 41 Q49 28 60 28 Q71 28 71 41 Q66 34 60 34 Q54 34 49 41Z" fill={HAIR} />
          <circle cx="60" cy="27" r="5" fill={HAIR} />
          <path d="M54 43 q2 1.5 4 0M62 43 q2 1.5 4 0" stroke={HAIR} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      </g>
    </Svg>
  )
}

/** مربی با دست تکان‌دهنده و حباب گفتگو */
export function Coach({ shirt = '#6ee7c8', ...p }: ArtProps & { shirt?: string }) {
  return (
    <Svg vb="0 0 120 140" label="مربی" {...p}>
      <Shadow cx={56} cy={133} rx={26} />
      <g className="kf-bubble" style={d(0.2)}>
        <rect x="76" y="10" width="38" height="26" rx="10" fill="#fff" />
        <path d="M84 36 l-4 7 9-7z" fill="#fff" />
        <path d="M86 23h18M90 18v10M100 18v10" stroke="#a78bfa" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <path d="M50 92 L48 126M62 92 L64 126" stroke="#3a3545" strokeWidth="9" strokeLinecap="round" />
      <path d="M42 127h11M59 127h11" stroke={SHOE} strokeWidth="7" strokeLinecap="round" />
      <path d="M40 58 Q56 50 72 58 L70 94 Q56 99 42 94 Z" fill={shirt} />
      <path d="M56 54 L56 72" stroke="#fff" strokeOpacity=".5" strokeWidth="2" />
      <circle cx="56" cy="74" r="3.5" fill="#fcd679" />
      <path d="M42 60 L34 80 L42 90" stroke={SKIN} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="36" y="78" width="16" height="20" rx="3" fill="#fff" transform="rotate(-10 44 88)" />
      <path d="M40 84h8M40 89h6" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" transform="rotate(-10 44 88)" />
      <g className="kf-hand" style={o(70, 60)}>
        <path d="M70 60 L82 46 L84 30" stroke={SKIN} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="84" cy="28" r="4.5" fill={SKIN} />
      </g>
      <circle cx="56" cy="42" r="11" fill={SKIN} />
      <path d="M45 40 Q46 28 57 28 Q68 29 67 40 L62 36 Q54 34 45 40Z" fill={HAIR} />
      <path d="M44 34 Q56 26 68 34 L70 31 Q57 21 43 31Z" fill="#a78bfa" />
      <circle cx="52" cy="43" r="1.2" fill={HAIR} />
      <circle cx="60" cy="43" r="1.2" fill={HAIR} />
      <path d="M53 48 q3 2.5 6 0" stroke={HAIR} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  )
}

/** پزشک با گوشی پزشکی و قلب تپنده */
export function Doctor(p: ArtProps) {
  return (
    <Svg vb="0 0 130 130" label="پزشک" {...p}>
      <Shadow cx={50} cy={124} rx={30} />
      <path d="M22 122 Q22 74 50 70 Q78 74 78 122Z" fill="#fff" />
      <path d="M50 70 L42 92 L50 122 L58 92Z" fill="#c4b5fd" />
      <path d="M38 76 Q34 98 44 104 Q52 106 54 98" stroke="#3a3545" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="54" cy="97" r="3.5" fill="#9a93a9" />
      <circle cx="50" cy="52" r="13" fill={SKIN} />
      <path d="M37 52 Q36 36 50 36 Q64 36 64 50 Q60 44 50 44 Q42 44 37 52Z" fill={HAIR} />
      <path d="M37 50 Q34 66 40 70 M63 50 Q66 66 60 70" stroke={HAIR} strokeWidth="4" strokeLinecap="round" />
      <circle cx="45" cy="53" r="1.3" fill={HAIR} />
      <circle cx="55" cy="53" r="1.3" fill={HAIR} />
      <path d="M46 59 q4 3 8 0" stroke={HAIR} strokeWidth="1.5" strokeLinecap="round" />
      <g className="kf-beat" style={o(102, 40)}>
        <path d="M102 54 C86 44 84 30 94 27 C99 26 102 30 102 32 C102 30 105 26 110 27 C120 30 118 44 102 54Z" fill="#f2a3e2" />
      </g>
      <path className="kf-dash" d="M80 78 h10 l4 -10 l6 20 l5 -14 l3 4 h20" stroke="#6ee7c8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** لیوان آب با سطح موج‌دار و حباب */
export function WaterGlass({ level = 0.5, ...p }: ArtProps & { level?: number }) {
  const y = 112 - 84 * Math.min(1, Math.max(0.05, level))
  const clip = `glass-${useId().replace(/:/g, '')}`
  return (
    <Svg vb="0 0 100 130" label="لیوان آب" {...p}>
      <defs>
        <clipPath id={clip}>
          <path d="M24 26 L32 116 Q33 122 40 122 H60 Q67 122 68 116 L76 26Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="0" width="100" height="130" fill="#ffffff" opacity=".12" />
        <g style={{ transform: `translateY(${y}px)`, transition: 'transform 1s cubic-bezier(.2,.8,.2,1)' }}>
          <g className="kf-wave">
            <path d="M0 6 Q12.5 0 25 6 T50 6 T75 6 T100 6 T125 6 T150 6 T175 6 T200 6 V140 H0Z" fill="#6ee7c8" />
          </g>
          <g className="kf-wave" style={{ animationDuration: '3.4s', opacity: 0.6 }}>
            <path d="M0 9 Q12.5 3 25 9 T50 9 T75 9 T100 9 T125 9 T150 9 T175 9 T200 9 V140 H0Z" fill="#3fd6b0" />
          </g>
        </g>
        {[[40, 0], [52, 0.8], [60, 1.5]].map(([x, dl], i) => (
          <circle key={i} className="kf-rise" style={d(dl)} cx={x} cy={112} r={2.5 - i * 0.4} fill="#fff" opacity=".8" />
        ))}
      </g>
      <path d="M24 26 L32 116 Q33 122 40 122 H60 Q67 122 68 116 L76 26" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinejoin="round" />
      <path d="M33 36 L38 100" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  )
}

/** قلب تپنده با خط نوار قلب */
export function HeartPulse(p: ArtProps) {
  return (
    <Svg vb="0 0 120 100" label="ضربان قلب" {...p}>
      <g className="kf-beat" style={o(60, 50)}>
        <path d="M60 86 C22 62 18 32 36 24 C48 19 58 27 60 34 C62 27 72 19 84 24 C102 32 98 62 60 86Z" fill="#f2a3e2" />
        <path d="M44 34 Q40 40 42 48" stroke="#fff" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" />
      </g>
      <path className="kf-dash" d="M4 54 h30 l6 -14 l8 28 l7 -22 l5 8 h56" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** جام قهرمانی با کاغذ رنگی */
export function Trophy(p: ArtProps) {
  const colors = ['#a78bfa', '#6ee7c8', '#f2a3e2', '#fcd679']
  return (
    <Svg vb="0 0 120 130" label="جام" {...p}>
      {[16, 34, 52, 70, 88, 104].map((x, i) => (
        <rect key={x} className="kf-confetti" style={d(i * 0.4)} x={x} y={8 + (i % 3) * 6} width="6" height="9" rx="1.5" fill={colors[i % 4]} />
      ))}
      <Shadow cx={60} cy={122} rx={28} />
      <g className="kf-float">
        <path d="M40 30 H80 V52 Q80 76 60 78 Q40 76 40 52Z" fill="#fcd679" />
        <path d="M40 36 H28 Q26 58 44 62 M80 36 H92 Q94 58 76 62" stroke="#fcd679" strokeWidth="5" strokeLinecap="round" />
        <path d="M54 78 h12 v14 h-12z" fill="#f8c25c" />
        <rect x="42" y="92" width="36" height="12" rx="3" fill="#3a3545" />
        <rect x="48" y="95" width="24" height="5" rx="2" fill="#fcd679" opacity=".6" />
        <path d="M48 36 Q46 50 50 60" stroke="#fff" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" />
        <path className="kf-twinkle" d="M60 42 l3.5 7 7.5 1 -5.5 5 1.5 7.5 -7 -3.5 -7 3.5 1.5 -7.5 -5.5 -5 7.5 -1z" fill="#fff" />
      </g>
    </Svg>
  )
}

/** کاسه‌ی سالاد با بخار */
export function SaladBowl(p: ArtProps) {
  return (
    <Svg vb="0 0 120 110" label="غذای سالم" {...p}>
      {[44, 60, 76].map((x, i) => (
        <path key={x} className="kf-steam" style={d(i * 0.6)} d={`M${x} 40 q-6 -8 0 -16 q6 -8 0 -16`} stroke="#fff" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" />
      ))}
      <Shadow cx={60} cy={102} rx={34} />
      <circle cx="44" cy="54" r="10" fill="#6ee7c8" />
      <circle cx="60" cy="48" r="11" fill="#3fd6b0" />
      <circle cx="78" cy="54" r="10" fill="#6ee7c8" />
      <circle cx="52" cy="56" r="6" fill="#f2a3e2" />
      <circle cx="70" cy="57" r="6" fill="#fcd679" />
      <ellipse cx="62" cy="52" rx="5" ry="3" fill="#fff" opacity=".7" />
      <path d="M22 58 H98 Q96 92 60 96 Q24 92 22 58Z" fill="#a78bfa" />
      <path d="M30 64 Q34 82 50 88" stroke="#fff" strokeOpacity=".4" strokeWidth="4" strokeLinecap="round" />
      <path d="M86 26 L96 62" stroke="#c3bdd0" strokeWidth="4" strokeLinecap="round" />
    </Svg>
  )
}

/** شیکر مکمل با حباب */
export function Shaker(p: ArtProps) {
  return (
    <Svg vb="0 0 100 130" label="مکمل" {...p}>
      <Shadow cx={50} cy={122} rx={26} />
      <g className="kf-float">
        <rect x="34" y="14" width="32" height="12" rx="4" fill="#3a3545" />
        <rect x="46" y="6" width="8" height="10" rx="3" fill="#f2a3e2" />
        <path d="M30 28 H70 L66 112 Q65 118 58 118 H42 Q35 118 34 112Z" fill="#c4b5fd" />
        <rect x="36" y="58" width="28" height="26" rx="5" fill="#fff" opacity=".9" />
        <path d="M42 66h16M42 72h10" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
        <path d="M37 34 L40 104" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
        {[[44, 0], [52, 0.7], [58, 1.3]].map(([x, dl], i) => (
          <circle key={i} className="kf-rise" style={d(dl)} cx={x} cy={104} r={2.4} fill="#fff" />
        ))}
      </g>
    </Svg>
  )
}

/** حباب‌های گفتگو و قلب (شبکه‌ی اجتماعی) */
export function ChatBubbles(p: ArtProps) {
  return (
    <Svg vb="0 0 130 110" label="گفتگو" {...p}>
      <g className="kf-bubble">
        <rect x="8" y="14" width="64" height="34" rx="14" fill="#fff" />
        <path d="M20 48 l-4 10 12-10z" fill="#fff" />
        <path d="M22 28h36M22 36h22" stroke="#c4b5fd" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="kf-bubble" style={d(0.6)}>
        <rect x="50" y="56" width="70" height="34" rx="14" fill="#6ee7c8" />
        <path d="M108 90 l4 10 -12-10z" fill="#6ee7c8" />
        <path d="M64 70h40M64 78h26" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="kf-beat" style={o(100, 26)}>
        <path d="M100 40 C88 32 86 22 93 19 C97 18 100 21 100 23 C100 21 103 18 107 19 C114 22 112 32 100 40Z" fill="#f2a3e2" />
      </g>
    </Svg>
  )
}

/** کارت و سکه‌های در حال ریزش (کیف پول) */
export function WalletCoins(p: ArtProps) {
  return (
    <Svg vb="0 0 120 110" label="کیف پول" {...p}>
      {[46, 64, 82].map((x, i) => (
        <g key={x} className="kf-coin" style={d(i * 0.5)}>
          <circle cx={x} cy={34} r="9" fill="#fcd679" />
          <circle cx={x} cy={34} r="5" stroke="#f8c25c" strokeWidth="2" />
        </g>
      ))}
      <Shadow cx={60} cy={102} rx={40} />
      <rect x="18" y="44" width="84" height="54" rx="12" fill="#a78bfa" />
      <rect x="18" y="44" width="84" height="14" rx="7" fill="#8b5cf6" />
      <rect x="70" y="64" width="32" height="20" rx="8" fill="#c4b5fd" />
      <circle cx="80" cy="74" r="4" fill="#fff" />
      <path d="M26 86h26" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  )
}

/** ترازو با عقربه‌ی متحرک */
export function Scale(p: ArtProps) {
  return (
    <Svg vb="0 0 120 110" label="ترازو" {...p}>
      <Shadow cx={60} cy={102} rx={40} />
      <rect x="16" y="30" width="88" height="66" rx="18" fill="#f2a3e2" />
      <rect x="34" y="40" width="52" height="30" rx="15" fill="#fff" />
      <path d="M40 66 A20 20 0 0 1 80 66" stroke="#c4b5fd" strokeWidth="3" />
      <g className="kf-needle" style={o(60, 66)}>
        <path d="M60 66 L60 48" stroke="#3a3545" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="60" cy="66" r="3.5" fill="#3a3545" />
      <rect x="30" y="80" width="22" height="8" rx="4" fill="#fff" opacity=".6" />
      <rect x="68" y="80" width="22" height="8" rx="4" fill="#fff" opacity=".6" />
    </Svg>
  )
}

/** شعله‌ی لرزان (استریک) */
export function Flame(p: ArtProps) {
  return (
    <Svg vb="0 0 100 120" label="شعله" {...p}>
      <g className="kf-flicker" style={o(50, 110)}>
        <path d="M50 112 C22 108 18 80 30 62 C34 74 40 76 42 72 C38 52 48 30 62 16 C60 34 82 48 82 78 C82 100 68 112 50 112Z" fill="#fcd679" />
        <path d="M50 112 C36 110 32 96 38 86 C42 92 46 92 47 88 C46 78 52 68 58 62 C58 74 68 82 66 96 C64 106 58 112 50 112Z" fill="#f2a3e2" />
      </g>
      {[[24, 40, 0], [78, 30, 0.8], [84, 62, 1.5]].map(([x, y, dl], i) => (
        <circle key={i} className="kf-twinkle" style={d(dl)} cx={x} cy={y} r="3" fill="#fcd679" />
      ))}
    </Svg>
  )
}

/** نشانگر نقشه با موج‌های اطراف */
export function MapPin(p: ArtProps) {
  return (
    <Svg vb="0 0 120 120" label="نقشه" {...p}>
      <ellipse className="kf-ripple" cx="60" cy="100" rx="30" ry="9" stroke="#fff" strokeWidth="2" />
      <ellipse className="kf-ripple" style={d(1)} cx="60" cy="100" rx="30" ry="9" stroke="#fff" strokeWidth="2" />
      <g className="kf-float">
        <path d="M60 98 C40 74 32 62 32 46 A28 28 0 0 1 88 46 C88 62 80 74 60 98Z" fill="#a78bfa" />
        <circle cx="60" cy="46" r="12" fill="#fff" />
        <path d="M54 46h12M57 42v8M63 42v8" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
      </g>
    </Svg>
  )
}

/** ربات دوستانه (دستیار هوشمند) */
export function Bot(p: ArtProps) {
  return (
    <Svg vb="0 0 120 120" label="دستیار هوشمند" {...p}>
      <Shadow cx={60} cy={112} rx={30} />
      <g className="kf-float">
        <path d="M60 18 V8" stroke="#c4b5fd" strokeWidth="3" strokeLinecap="round" />
        <circle className="kf-twinkle" cx="60" cy="7" r="4.5" fill="#6ee7c8" />
        <rect x="24" y="18" width="72" height="56" rx="22" fill="#fff" />
        <rect x="32" y="28" width="56" height="34" rx="16" fill="#27232f" />
        <g className="kf-blink">
          <circle cx="48" cy="44" r="5" fill="#6ee7c8" />
          <circle cx="72" cy="44" r="5" fill="#6ee7c8" />
        </g>
        <path d="M54 54 q6 4 12 0" stroke="#6ee7c8" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="18" y="38" width="8" height="18" rx="4" fill="#c4b5fd" />
        <rect x="94" y="38" width="8" height="18" rx="4" fill="#c4b5fd" />
        <path d="M36 78 H84 Q84 102 60 102 Q36 102 36 78Z" fill="#a78bfa" />
        <circle cx="60" cy="88" r="5" fill="#fcd679" />
      </g>
    </Svg>
  )
}

/** تصویر مناسب برای معیار چالش */
export function MetricArt({ metric, ...p }: ArtProps & { metric: ChallengeMetric }) {
  switch (metric) {
    case 'steps':
      return <Runner {...p} />
    case 'workouts':
      return <Lifter {...p} />
    case 'minutes':
      return <Flame {...p} />
    case 'km':
      return <Cyclist {...p} />
    case 'weight_loss':
      return <Scale {...p} />
    default:
      return <Trophy {...p} />
  }
}

/** تصویر مناسب برای رشته‌ی باشگاه */
export function SportArt({ sports, ...p }: ArtProps & { sports: string[] }) {
  const s = sports.join(' ')
  if (/یوگا|پیلاتس|مدیتیشن/.test(s)) return <Yoga {...p} />
  if (/اسپینینگ|دوچرخه/.test(s)) return <Cyclist {...p} />
  if (/شنا|آکوا/.test(s)) return <WaterGlass level={0.7} {...p} />
  if (/دو|رانینگ|HIIT|زومبا|ایروبیک/.test(s)) return <Runner {...p} />
  return <Lifter {...p} />
}
