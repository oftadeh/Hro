/**
 * تصویرسازی‌های کی‌فیت — سبک یکپارچه‌ی «تخت مینیمال» (Flat Minimal):
 * پیکره‌های بدون صورت با شکل‌های توپر، بدون خط دور، پالت محدود برند،
 * یک شکل هندسی ساده در پس‌زمینه و حرکت‌های آرام و نرم.
 */
import { useId, type CSSProperties, type ReactNode } from 'react'
import type { ChallengeMetric } from '@/core/types'

type ArtProps = { size?: number; className?: string; style?: CSSProperties; mono?: boolean; bare?: boolean }

// پالت
const C = {
  skin: '#f1c3a0',
  skin2: '#d9a07c',
  skinDark: '#a8704f',
  hair: '#2a2235',
  ink: '#2e2840',
  ink2: '#453d5c',
  violet: '#8b5cf6',
  lav: '#c4b5fd',
  mint: '#5eead4',
  mint2: '#2dd4bf',
  peach: '#fcd679',
  pink: '#f0a6d8',
  white: '#ffffff',
}

const org = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` })

function Frame({ p, label, children, backdrop = C.white }: { p: ArtProps; label: string; children: ReactNode; backdrop?: string }) {
  const s = p.size ?? 120
  return (
    <svg data-art viewBox="0 0 160 160" width={s} height={s} className={p.className} style={p.style} role="img" aria-label={label}>
      {!p.bare && (
        <g>
          <circle cx="80" cy="82" r="58" fill={backdrop} opacity=".14" />
          <g className="kf-spin-slow" style={{ ...org(80, 82), animationDuration: '40s' }}>
            <circle cx="132" cy="44" r="5" fill={C.peach} opacity=".9" />
            <circle cx="30" cy="118" r="3.5" fill={C.mint} opacity=".9" />
          </g>
        </g>
      )}
      {children}
    </svg>
  )
}

/** اندام توپر با سر گرد (برای بازو و پا) */
const Limb = ({ d, c, w = 11 }: { d: string; c: string; w?: number }) => <path d={d} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
const Shoe = ({ x, y, r = 0, c = C.ink }: { x: number; y: number; r?: number; c?: string }) => <rect x={x - 8} y={y - 4} width="16" height="8" rx="4" fill={c} transform={`rotate(${r} ${x} ${y})`} />
const Floor = ({ y = 142, w = 40 }: { y?: number; w?: number }) => <ellipse cx="80" cy={y} rx={w} ry="4" fill="#000" opacity=".12" />

/* ───────────── پیکره‌ها ───────────── */

export function Runner(p: ArtProps & { shirt?: string; pants?: string; accent?: string }) {
  return (
    <Frame p={p} label="دونده">
      <Floor y={140} w={34} />
      <g className="kf-float" style={{ animationDuration: '2.6s' }}>
        {/* خطوط سرعت */}
        <g opacity=".55">
          <rect x="26" y="62" width="24" height="3.5" rx="1.75" fill={C.white} />
          <rect x="18" y="76" width="28" height="3.5" rx="1.75" fill={C.white} />
          <rect x="30" y="90" width="18" height="3.5" rx="1.75" fill={C.white} />
        </g>
        {/* بازوی عقب */}
        <Limb d="M86 58 L74 68 L66 62" c={C.skin2} w={8} />
        {/* پای عقب: ران به عقب، ساق رو به بالا */}
        <Limb d="M84 94 L72 114 L54 116" c="#7c4fe0" w={12} />
        <Shoe x={50} y={114} r={-35} c={C.white} />
        {/* تنه */}
        <path d="M82 52 Q93 47 102 52 L96 90 Q87 93 78 89 Z" fill={C.mint} />
        <path d="M78 87 L96 89 L98 99 Q88 103 77 99 Z" fill="#7c4fe0" />
        {/* پای جلو */}
        <Limb d="M90 96 L108 108 L110 128" c={C.violet} w={12} />
        <Shoe x={114} y={130} r={0} c={C.white} />
        {/* بازوی جلو */}
        <Limb d="M98 58 L108 72 L120 66" c={C.skin} w={8} />
        {/* سر */}
        <rect x="91" y="42" width="7" height="9" rx="3" fill={C.skin2} />
        <circle cx="98" cy="34" r="11" fill={C.skin} />
        <path d="M87 33 Q87 21 99 21 Q110 22 109 32 Q103 27 95 30 Q91 32 87 33Z" fill={C.hair} />
        <path d="M88 28 Q75 25 68 34 Q79 33 85 36Z" fill={C.hair} className="kf-sway" style={{ ...org(87, 30), animationDuration: '1.3s' }} />
      </g>
    </Frame>
  )
}

export function Lifter(p: ArtProps & { shirt?: string; pants?: string }) {
  return (
    <Frame p={p} label="وزنه‌بردار">
      <Floor />
      {/* پاها */}
      <Limb d="M73 94 L68 116 L66 134" c={C.ink} w={13} />
      <Limb d="M87 94 L92 116 L94 134" c={C.ink} w={13} />
      <Shoe x={62} y={137} c={C.ink2} />
      <Shoe x={98} y={137} c={C.ink2} />
      <g className="kf-press" style={{ animationDuration: '3.2s' }}>
        {/* هالتر و بازوها */}
        <rect x="22" y="27" width="116" height="5" rx="2.5" fill={C.ink2} />
        <rect x="24" y="16" width="11" height="27" rx="4" fill={C.violet} />
        <rect x="36" y="20" width="7" height="19" rx="3" fill={C.lav} />
        <rect x="125" y="16" width="11" height="27" rx="4" fill={C.violet} />
        <rect x="117" y="20" width="7" height="19" rx="3" fill={C.lav} />
        <Limb d="M69 60 L58 46 L58 31" c={C.skin} w={9} />
        <Limb d="M91 60 L102 46 L102 31" c={C.skin} w={9} />
      </g>
      {/* تنه و سر */}
      <path d="M66 55 Q80 49 94 55 L90 94 Q80 98 70 94 Z" fill={C.pink} />
      <rect x="77" y="44" width="6" height="9" rx="3" fill={C.skin2} />
      <circle cx="80" cy="38" r="11" fill={C.skin} />
      <path d="M69 37 Q69 26 80 26 Q91 26 91 37 Q86 31 80 31 Q74 31 69 37Z" fill={C.hair} />
      <circle cx="80" cy="24" r="5.5" fill={C.hair} />
    </Frame>
  )
}

export function Cyclist(p: ArtProps & { shirt?: string }) {
  return (
    <Frame p={p} label="دوچرخه‌سوار">
      <Floor y={140} w={56} />
      {[44, 116].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="112" r="22" fill="none" stroke={C.ink} strokeWidth="5" />
          <g className="kf-spin" style={{ ...org(cx, 112), animationDuration: '2.4s' }}>
            <path d={`M${cx - 18} 112H${cx + 18}M${cx} 94V130`} stroke={C.ink2} strokeWidth="2" />
          </g>
          <circle cx={cx} cy="112" r="3.5" fill={C.ink2} />
        </g>
      ))}
      <path d="M44 112 L70 112 L94 82 L62 82 L70 112 M94 82 L116 112 M62 82 L58 72 M93 82 L97 68 L108 68" stroke={C.violet} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="50" y="68" width="16" height="6" rx="3" fill={C.ink} />
      <g className="kf-float" style={{ animationDuration: '2.8s' }}>
        <Limb d="M64 72 L80 88 L72 108" c={C.ink2} w={11} />
        <path d="M60 74 Q70 52 92 50 L96 60 Q78 64 70 78 Z" fill={C.peach} />
        <Limb d="M64 72 L84 84 L82 102" c={C.ink} w={11} />
        <Shoe x={84} y={104} />
        <Limb d="M92 56 L106 68" c={C.skin} w={8} />
        <circle cx="102" cy="40" r="10.5" fill={C.skin} />
        <path d="M91 39 Q90 27 102 27 Q113 28 113 38 Z" fill={C.pink} />
        <rect x="88" y="37" width="27" height="4" rx="2" fill={C.pink} />
      </g>
    </Frame>
  )
}

export function Yoga(p: ArtProps & { shirt?: string }) {
  return (
    <Frame p={p} label="مدیتیشن">
      <Floor y={128} w={44} />
      <g className="kf-breathe" style={{ ...org(80, 124), animationDuration: '5s' }}>
        {/* پاهای ضربدری */}
        <path d="M38 116 Q46 98 80 102 Q114 98 122 116 Q112 126 80 122 Q48 126 38 116Z" fill={C.ink} />
        <circle cx="46" cy="116" r="5" fill={C.skin2} />
        <circle cx="114" cy="116" r="5" fill={C.skin2} />
        {/* تنه */}
        <path d="M64 104 Q60 72 80 64 Q100 72 96 104 Z" fill={C.lav} />
        {/* بازوها */}
        <Limb d="M66 74 Q54 88 52 104" c={C.skin} w={8} />
        <Limb d="M94 74 Q106 88 108 104" c={C.skin} w={8} />
        <circle cx="52" cy="106" r="4.5" fill={C.skin} />
        <circle cx="108" cy="106" r="4.5" fill={C.skin} />
        {/* سر */}
        <rect x="77" y="54" width="6" height="11" rx="3" fill={C.skin2} />
        <circle cx="80" cy="46" r="11.5" fill={C.skin} />
        <path d="M68.5 46 Q68 34 80 34 Q92 34 91.5 46 Q86 40 80 40 Q74 40 68.5 46Z" fill={C.hair} />
        <circle cx="80" cy="31" r="6" fill={C.hair} />
      </g>
      <g className="kf-float" style={{ animationDuration: '4s' }}>
        <path d="M128 70 Q136 64 132 56 Q142 62 134 74Z" fill={C.mint} />
        <path d="M30 70 Q22 64 26 56 Q16 62 24 74Z" fill={C.pink} />
      </g>
    </Frame>
  )
}

export function Coach(p: ArtProps & { shirt?: string }) {
  return (
    <Frame p={p} label="مربی">
      <Floor />
      <Limb d="M74 96 L70 134" c={C.ink} w={12} />
      <Limb d="M86 96 L90 134" c={C.ink} w={12} />
      <Shoe x={66} y={137} c={C.ink2} />
      <Shoe x={94} y={137} c={C.ink2} />
      <path d="M64 56 Q80 50 96 56 L92 98 Q80 102 68 98 Z" fill={C.violet} />
      <path d="M74 54 L80 70 L86 54" fill="none" stroke={C.white} strokeWidth="2" opacity=".7" />
      <circle cx="80" cy="72" r="3" fill={C.peach} />
      {/* بازوی تخته‌به‌دست */}
      <Limb d="M66 60 L58 78 L66 88" c={C.skin} w={8} />
      <rect x="50" y="74" width="20" height="26" rx="4" fill={C.white} transform="rotate(-10 60 87)" />
      <rect x="54" y="82" width="12" height="2.5" rx="1.25" fill={C.lav} transform="rotate(-10 60 87)" />
      <rect x="54" y="88" width="8" height="2.5" rx="1.25" fill={C.lav} transform="rotate(-10 60 87)" />
      {/* دست اشاره */}
      <g className="kf-sway" style={{ ...org(94, 60), animationDuration: '3.4s' }}>
        <Limb d="M94 60 L106 46 L112 30" c={C.skin} w={8} />
      </g>
      <rect x="77" y="45" width="6" height="9" rx="3" fill={C.skin2} />
      <circle cx="80" cy="38" r="11" fill={C.skin} />
      <path d="M69 36 Q70 25 81 25 Q92 26 91 36 Z" fill={C.mint2} />
      <path d="M88 33 L100 33 Q100 37 90 37Z" fill={C.mint2} />
      <g className="kf-float" style={{ animationDuration: '3.6s' }}>
        <rect x="112" y="64" width="34" height="22" rx="11" fill={C.white} />
        <path d="M118 86 L116 94 L124 86Z" fill={C.white} />
        <circle cx="122" cy="75" r="2.5" fill={C.violet} />
        <circle cx="129" cy="75" r="2.5" fill={C.mint2} />
        <circle cx="136" cy="75" r="2.5" fill={C.pink} />
      </g>
    </Frame>
  )
}

export function Doctor(p: ArtProps) {
  return (
    <Frame p={p} label="پزشک">
      <path d="M40 150 Q42 92 74 86 Q106 92 108 150Z" fill={C.white} />
      <path d="M74 86 L64 112 L74 150 L84 112Z" fill={C.lav} />
      <path d="M58 92 Q52 116 64 122 Q74 124 76 114" fill="none" stroke={C.ink2} strokeWidth="3" strokeLinecap="round" />
      <circle cx="76" cy="113" r="4" fill={C.ink2} />
      <rect x="70" y="72" width="8" height="15" rx="4" fill={C.skin2} />
      <circle cx="74" cy="60" r="15" fill={C.skin} />
      <path d="M59 62 Q56 42 74 42 Q92 42 90 62 Q88 52 80 50 Q70 50 62 56 Q60 60 59 62Z" fill={C.hair} />
      <path d="M59 58 Q56 74 62 80 L64 66Z M89 58 Q92 74 86 80 L84 66Z" fill={C.hair} />
      <g className="kf-heart" style={{ ...org(122, 56), animationDuration: '1.8s' }}>
        <path d="M122 74 C102 62 100 46 110 41 C116 38 121 43 122 46 C123 43 128 38 134 41 C144 46 142 62 122 74Z" fill={C.pink} />
        <path d="M111 47 Q109 52 111 57" stroke={C.white} strokeWidth="2.5" strokeLinecap="round" opacity=".7" fill="none" />
      </g>
    </Frame>
  )
}

/* ───────────── اشیا ───────────── */

export function WaterGlass({ level = 0.5, ...p }: ArtProps & { level?: number }) {
  const clip = `wg${useId().replace(/:/g, '')}`
  const y = 132 - 92 * Math.min(1, Math.max(0.06, level))
  return (
    <Frame p={p} label="آب">
      <defs>
        <clipPath id={clip}>
          <path d="M52 34 L60 130 Q61 138 69 138 H91 Q99 138 100 130 L108 34Z" />
        </clipPath>
      </defs>
      <Floor y={142} w={30} />
      <path d="M52 34 L60 130 Q61 138 69 138 H91 Q99 138 100 130 L108 34Z" fill={C.white} opacity=".35" />
      <g clipPath={`url(#${clip})`}>
        <g style={{ transform: `translateY(${y}px)`, transition: 'transform 1.2s cubic-bezier(.2,.8,.2,1)' }}>
          <g className="kf-wave" style={{ animationDuration: '3.2s' }}>
            <path d="M0 5Q20 -1 40 5T80 5T120 5T160 5T200 5T240 5T280 5T320 5V160H0Z" fill={C.mint} />
          </g>
        </g>
      </g>
      <rect x="64" y="46" width="6" height="60" rx="3" fill={C.white} opacity=".55" />
    </Frame>
  )
}

export function HeartPulse(p: ArtProps) {
  return (
    <Frame p={p} label="قلب" backdrop={C.pink}>
      <g className="kf-heart" style={{ ...org(80, 84), animationDuration: '1.8s' }}>
        <path d="M80 124 C40 100 34 66 54 56 C66 50 76 58 80 66 C84 58 94 50 106 56 C126 66 120 100 80 124Z" fill={C.pink} />
        <path d="M56 68 Q52 76 56 86" stroke={C.white} strokeWidth="5" strokeLinecap="round" opacity=".6" fill="none" />
      </g>
      <path d="M46 88 H64 L70 76 L78 100 L84 84 L88 90 H114" fill="none" stroke={C.white} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  )
}

export function Trophy(p: ArtProps) {
  return (
    <Frame p={p} label="جام" backdrop={C.peach}>
      <Floor y={138} w={30} />
      <g className="kf-float" style={{ animationDuration: '3.6s' }}>
        <path d="M50 44 H36 Q34 70 56 74 M110 44 H124 Q126 70 104 74" fill="none" stroke={C.peach} strokeWidth="7" strokeLinecap="round" />
        <path d="M50 34 H110 V62 Q110 94 80 98 Q50 94 50 62Z" fill={C.peach} />
        <path d="M80 34 H110 V62 Q110 94 80 98Z" fill="#f8c25c" />
        <rect x="72" y="96" width="16" height="16" fill="#f8c25c" />
        <rect x="56" y="110" width="48" height="16" rx="5" fill={C.ink} />
        <path d="M80 50 l4 8 9 1.3 -6.5 6.3 1.5 9 -8 -4.2 -8 4.2 1.5 -9 -6.5 -6.3 9 -1.3z" fill={C.white} />
      </g>
      <g className="kf-twinkle" style={{ animationDuration: '3s' }}>
        <path d="M132 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill={C.white} />
      </g>
    </Frame>
  )
}

export function SaladBowl(p: ArtProps) {
  return (
    <Frame p={p} label="غذای سالم" backdrop={C.mint}>
      <Floor y={136} w={42} />
      <g className="kf-float" style={{ animationDuration: '3.8s' }}>
        <circle cx="60" cy="78" r="14" fill={C.mint2} />
        <circle cx="82" cy="70" r="16" fill={C.mint} />
        <circle cx="104" cy="78" r="13" fill={C.mint2} />
        <circle cx="72" cy="82" r="8" fill={C.pink} />
        <circle cx="96" cy="84" r="7" fill={C.peach} />
        <path d="M30 84 H130 Q128 128 80 130 Q32 128 30 84Z" fill={C.violet} />
        <path d="M80 84 H130 Q128 128 80 130Z" fill="#7c4fe0" />
        <rect x="30" y="80" width="100" height="8" rx="4" fill={C.lav} />
      </g>
    </Frame>
  )
}

export function Shaker(p: ArtProps) {
  return (
    <Frame p={p} label="مکمل" backdrop={C.lav}>
      <Floor y={142} w={28} />
      <g className="kf-float" style={{ animationDuration: '3.4s' }}>
        <rect x="62" y="28" width="36" height="14" rx="5" fill={C.ink} />
        <rect x="74" y="18" width="12" height="12" rx="4" fill={C.pink} />
        <path d="M58 44 H102 L97 128 Q96 136 88 136 H72 Q64 136 63 128Z" fill={C.lav} />
        <path d="M80 44 H102 L97 128 Q96 136 88 136 H80Z" fill="#b3a1fb" />
        <rect x="66" y="70" width="28" height="30" rx="6" fill={C.white} />
        <rect x="71" y="79" width="18" height="3" rx="1.5" fill={C.violet} />
        <rect x="71" y="86" width="12" height="3" rx="1.5" fill={C.mint2} />
      </g>
    </Frame>
  )
}

export function ChatBubbles(p: ArtProps) {
  return (
    <Frame p={p} label="گفتگو">
      <g className="kf-float" style={{ animationDuration: '3.4s' }}>
        <rect x="20" y="38" width="80" height="44" rx="22" fill={C.white} />
        <path d="M34 80 L30 94 L46 82Z" fill={C.white} />
        <rect x="38" y="52" width="44" height="5" rx="2.5" fill={C.lav} />
        <rect x="38" y="63" width="28" height="5" rx="2.5" fill={C.lav} />
      </g>
      <g className="kf-float" style={{ animationDuration: '3.4s', animationDelay: '-1.7s' }}>
        <rect x="60" y="90" width="80" height="40" rx="20" fill={C.mint} />
        <path d="M126 128 L132 140 L116 128Z" fill={C.mint} />
        <circle cx="86" cy="110" r="4" fill={C.white} />
        <circle cx="100" cy="110" r="4" fill={C.white} />
        <circle cx="114" cy="110" r="4" fill={C.white} />
      </g>
      <g className="kf-heart" style={{ ...org(122, 42), animationDuration: '2s' }}>
        <path d="M122 56 C110 48 108 38 114 35 C118 33 121 36 122 38 C123 36 126 33 130 35 C136 38 134 48 122 56Z" fill={C.pink} />
      </g>
    </Frame>
  )
}

export function WalletCoins(p: ArtProps) {
  return (
    <Frame p={p} label="کیف پول" backdrop={C.lav}>
      <Floor y={136} w={44} />
      <g className="kf-float" style={{ animationDuration: '3.6s', animationDelay: '-1s' }}>
        <circle cx="104" cy="44" r="14" fill={C.peach} />
        <circle cx="104" cy="44" r="8" fill="none" stroke="#f8c25c" strokeWidth="3" />
      </g>
      <g className="kf-float" style={{ animationDuration: '3.6s' }}>
        <rect x="30" y="62" width="100" height="64" rx="14" fill={C.violet} />
        <rect x="30" y="62" width="100" height="18" rx="9" fill="#7c4fe0" />
        <rect x="88" y="88" width="42" height="24" rx="10" fill={C.lav} />
        <circle cx="102" cy="100" r="5" fill={C.white} />
        <rect x="40" y="110" width="30" height="5" rx="2.5" fill={C.white} opacity=".5" />
      </g>
    </Frame>
  )
}

export function Scale(p: ArtProps) {
  return (
    <Frame p={p} label="ترازو" backdrop={C.pink}>
      <Floor y={140} w={46} />
      <rect x="28" y="56" width="104" height="80" rx="24" fill={C.pink} />
      <rect x="46" y="68" width="68" height="36" rx="18" fill={C.white} />
      <path d="M56 98 A24 24 0 0 1 104 98" fill="none" stroke={C.lav} strokeWidth="4" />
      <g className="kf-needle2" style={{ ...org(80, 98), animationDuration: '5s' }}>
        <rect x="78.5" y="76" width="3" height="22" rx="1.5" fill={C.ink} />
      </g>
      <circle cx="80" cy="98" r="4" fill={C.ink} />
      <rect x="44" y="114" width="28" height="10" rx="5" fill={C.white} opacity=".6" />
      <rect x="88" y="114" width="28" height="10" rx="5" fill={C.white} opacity=".6" />
    </Frame>
  )
}

export function Flame(p: ArtProps) {
  return (
    <Frame p={p} label="شعله" backdrop={C.peach}>
      <Floor y={140} w={28} />
      <g className="kf-sway" style={{ ...org(80, 136), animationDuration: '2.4s' }}>
        <path d="M80 136 C50 132 42 104 56 84 C60 96 66 98 68 94 C64 70 76 46 94 30 C92 54 114 68 114 100 C114 122 100 136 80 136Z" fill={C.peach} />
        <path d="M80 136 C64 134 58 118 64 106 C68 112 72 112 73 108 C72 96 80 86 88 80 C88 94 100 102 98 118 C96 130 90 136 80 136Z" fill={C.pink} />
      </g>
    </Frame>
  )
}

export function MapPin(p: ArtProps) {
  return (
    <Frame p={p} label="نقشه" backdrop={C.lav}>
      <ellipse cx="80" cy="134" rx="30" ry="8" fill="#000" opacity=".12" />
      <ellipse className="kf-ripple" cx="80" cy="134" rx="30" ry="8" fill="none" stroke={C.white} strokeWidth="2" style={{ animationDuration: '3s' }} />
      <g className="kf-float" style={{ animationDuration: '3s' }}>
        <path d="M80 128 C54 96 44 82 44 60 A36 36 0 0 1 116 60 C116 82 106 96 80 128Z" fill={C.violet} />
        <path d="M80 128 C106 96 116 82 116 60 A36 36 0 0 0 80 24Z" fill="#7c4fe0" />
        <circle cx="80" cy="60" r="14" fill={C.white} />
      </g>
    </Frame>
  )
}

export function Bot(p: ArtProps) {
  return (
    <Frame p={p} label="دستیار هوشمند" backdrop={C.mint}>
      <Floor y={142} w={30} />
      <g className="kf-float" style={{ animationDuration: '3.4s' }}>
        <rect x="77" y="18" width="6" height="14" rx="3" fill={C.lav} />
        <circle cx="80" cy="18" r="6" fill={C.mint} />
        <rect x="34" y="32" width="92" height="70" rx="28" fill={C.white} />
        <rect x="46" y="46" width="68" height="40" rx="20" fill={C.ink} />
        <g className="kf-blink">
          <rect x="62" y="58" width="10" height="16" rx="5" fill={C.mint} />
          <rect x="88" y="58" width="10" height="16" rx="5" fill={C.mint} />
        </g>
        <rect x="26" y="56" width="10" height="24" rx="5" fill={C.lav} />
        <rect x="124" y="56" width="10" height="24" rx="5" fill={C.lav} />
        <path d="M50 108 H110 Q110 134 80 134 Q50 134 50 108Z" fill={C.violet} />
      </g>
    </Frame>
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
  if (/شنا|آکوا/.test(s)) return <WaterGlass level={0.65} {...p} />
  if (/دو|رانینگ|HIIT|زومبا|ایروبیک/.test(s)) return <Runner {...p} />
  return <Lifter {...p} />
}
