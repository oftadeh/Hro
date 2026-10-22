/**
 * تصویرسازی‌های کی‌فیت — سبک یکپارچه‌ی «تخت مینیمال»:
 * پیکره‌های بدون صورت با تناسبات طبیعی که از اندام‌های مخروطی (ران پهن‌تر از ساق)
 * روی یک اسکلت ساخته می‌شوند، لباس با تفکیک رنگ، کتانی با زیره‌ی سفید،
 * تجهیزات واقعی ورزشی و فقط یک سایه‌ی نرم زیر پا. حرکت‌ها آرام و طبیعی‌اند.
 */
import { useId, type CSSProperties, type ReactNode } from 'react'
import type { ChallengeMetric } from '@/core/types'

type ArtProps = { size?: number; className?: string; style?: CSSProperties; mono?: boolean; bare?: boolean }
type Pt = [number, number]

// پالت
const C = {
  skin: '#f5cba7',
  skin2: '#e3ad86',
  tan: '#d39a72',
  tan2: '#bb8259',
  brown: '#9c6644',
  brown2: '#84553a',
  hair: '#2a2235',
  hairBrown: '#6b4226',
  hairBlonde: '#e9b95c',
  ink: '#2e2840',
  ink2: '#453d5c',
  navy: '#2f2a5e',
  navy2: '#3d3775',
  violet: '#8b5cf6',
  violet2: '#7c4fe0',
  lav: '#c4b5fd',
  mint: '#5eead4',
  mint2: '#2dd4bf',
  teal: '#22b8a5',
  peach: '#fcd679',
  coral: '#fb7a8c',
  coral2: '#ef5f74',
  pink: '#f0a6d8',
  white: '#ffffff',
  sole: '#eef0f6',
}

const org = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` })

function Frame({ p, label, children }: { p: ArtProps; label: string; children: ReactNode; backdrop?: string }) {
  const s = p.size ?? 120
  return (
    <svg data-art viewBox="0 0 160 160" width={s} height={s} className={p.className} style={p.style} role="img" aria-label={label}>
      {children}
    </svg>
  )
}

const Floor = ({ y = 150, w = 34, x = 80 }: { y?: number; w?: number; x?: number }) => <ellipse cx={x} cy={y} rx={w} ry="3.6" fill="#1b1530" opacity=".18" />

/* ───────── هندسه‌ی پیکره ───────── */

/** قطعه‌ی مخروطی با سرهای گرد بین دو مفصل */
function Seg({ a, b, r1, r2, c }: { a: Pt; b: Pt; r1: number; r2: number; c: string }) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy) || 1
  const nx = -dy / L
  const ny = dx / L
  const pts = [
    [a[0] + nx * r1, a[1] + ny * r1],
    [b[0] + nx * r2, b[1] + ny * r2],
    [b[0] - nx * r2, b[1] - ny * r2],
    [a[0] - nx * r1, a[1] - ny * r1],
  ]
  return (
    <g fill={c}>
      <polygon points={pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ')} />
      <circle cx={a[0]} cy={a[1]} r={r1} />
      <circle cx={b[0]} cy={b[1]} r={r2} />
    </g>
  )
}

/** بازو: شانه ← آرنج ← مچ، با آستین اختیاری و دست */
function Arm({ s, e, w, skin, sleeve, sleeveTo = 0.55 }: { s: Pt; e: Pt; w: Pt; skin: string; sleeve?: string; sleeveTo?: number }) {
  const mid: Pt = [s[0] + (e[0] - s[0]) * sleeveTo, s[1] + (e[1] - s[1]) * sleeveTo]
  return (
    <g>
      <Seg a={s} b={e} r1={4.3} r2={3.3} c={skin} />
      <Seg a={e} b={w} r1={3.3} r2={2.5} c={skin} />
      <circle cx={w[0]} cy={w[1]} r={3.3} fill={skin} />
      {sleeve && <Seg a={s} b={mid} r1={5.4} r2={4.6} c={sleeve} />}
    </g>
  )
}

/** پا: لگن ← زانو ← مچ، با شلوارک یا ساپورت */
function Leg({ h, k, a, skin, pants, full }: { h: Pt; k: Pt; a: Pt; skin: string; pants: string; full?: boolean }) {
  const mid: Pt = [h[0] + (k[0] - h[0]) * 0.62, h[1] + (k[1] - h[1]) * 0.62]
  return (
    <g>
      <Seg a={h} b={k} r1={6.6} r2={4.5} c={full ? pants : skin} />
      <Seg a={k} b={a} r1={4.5} r2={3.1} c={full ? pants : skin} />
      {!full && <Seg a={h} b={mid} r1={7.4} r2={6} c={pants} />}
    </g>
  )
}

/** کتانی با زیره‌ی سفید؛ dir جهت پنجه (۱ راست، -۱ چپ) و rot زاویه */
function Shoe({ at, dir = 1, rot = 0, c = C.white, accent = C.violet }: { at: Pt; dir?: 1 | -1; rot?: number; c?: string; accent?: string }) {
  const [x, y] = at
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <path d={dir > 0 ? `M${x - 4} ${y - 3}Q${x + 2} ${y - 5} ${x + 9} ${y}Q${x + 12} ${y + 3} ${x + 9} ${y + 4}H${x - 4}Q${x - 6} ${y + 1} ${x - 4} ${y - 3}Z` : `M${x + 4} ${y - 3}Q${x - 2} ${y - 5} ${x - 9} ${y}Q${x - 12} ${y + 3} ${x - 9} ${y + 4}H${x + 4}Q${x + 6} ${y + 1} ${x + 4} ${y - 3}Z`} fill={c} />
      <rect x={dir > 0 ? x - 5 : x - 10} y={y + 3} width="15" height="2.2" rx="1.1" fill={C.sole} />
      <path d={dir > 0 ? `M${x - 1} ${y - 2}L${x + 4} ${y + 1}` : `M${x + 1} ${y - 2}L${x - 4} ${y + 1}`} stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

/** تنه: شانه‌ها ← لگن */
const Torso = ({ sl, sr, hr, hl, c }: { sl: Pt; sr: Pt; hr: Pt; hl: Pt; c: string }) => (
  <path
    d={`M${sl[0]} ${sl[1]}Q${(sl[0] + sr[0]) / 2} ${Math.min(sl[1], sr[1]) - 3} ${sr[0]} ${sr[1]}Q${sr[0] + 1} ${(sr[1] + hr[1]) / 2} ${hr[0]} ${hr[1]}L${hl[0]} ${hl[1]}Q${sl[0] - 1} ${(sl[1] + hl[1]) / 2} ${sl[0]} ${sl[1]}Z`}
    fill={c}
  />
)

const Head = ({ at, skin, r = 8.2 }: { at: Pt; skin: string; r?: number }) => <circle cx={at[0]} cy={at[1]} r={r} fill={skin} />
const Neck = ({ a, b, skin }: { a: Pt; b: Pt; skin: string }) => <Seg a={a} b={b} r1={2.8} r2={3} c={skin} />

/* ───────────── پیکره‌ها ───────────── */

/** دونده (نیم‌رخ، رو به راست) */
export function Runner(p: ArtProps & { shirt?: string; pants?: string; accent?: string }) {
  const sk = C.skin
  return (
    <Frame p={p} label="دونده">
      <Floor y={150} w={30} />
      <g className="kf-float" style={{ animationDuration: '2.2s' }}>
        {/* اندام‌های عقب */}
        <Arm s={[86, 44]} e={[76, 56]} w={[70, 68]} skin={C.skin2} />
        <Leg h={[78, 84]} k={[70, 110]} a={[52, 118]} skin={C.skin2} pants={C.violet2} full />
        <Shoe at={[50, 121]} rot={-28} />
        {/* تنه */}
        <Torso sl={[83, 42]} sr={[95, 44]} hr={[87, 86]} hl={[74, 84]} c={C.violet} />
        <Torso sl={[83, 42]} sr={[95, 44]} hr={[89, 70]} hl={[77, 68]} c={C.coral} />
        {/* پای جلو */}
        <Leg h={[83, 86]} k={[102, 102]} a={[97, 128]} skin={sk} pants={C.violet} full />
        <Shoe at={[98, 131]} rot={4} />
        {/* سر */}
        <Neck a={[91, 36]} b={[89, 42]} skin={C.skin2} />
        <Head at={[94, 27]} skin={sk} />
        <path d="M86 26Q85 16 95 16Q103 17 103 25Q97 21 91 24Q88 25 86 26Z" fill={C.hairBrown} />
        <path className="kf-sway" style={{ ...org(87, 22), animationDuration: '1.1s' }} d="M88 21Q78 18 72 27Q80 25 87 27Z" fill={C.hairBrown} />
        {/* بازوی جلو */}
        <Arm s={[92, 45]} e={[100, 60]} w={[111, 54]} skin={sk} />
      </g>
    </Frame>
  )
}

/** وزنه‌بردار (روبه‌رو، پرس بالای سر) */
export function Lifter(p: ArtProps & { shirt?: string; pants?: string }) {
  const sk = C.tan
  return (
    <Frame p={p} label="وزنه‌بردار">
      <Floor y={150} w={34} />
      <Leg h={[73, 92]} k={[66, 118]} a={[63, 144]} skin={sk} pants={C.navy} />
      <Leg h={[87, 92]} k={[94, 118]} a={[97, 144]} skin={sk} pants={C.navy} />
      <Shoe at={[61, 146]} dir={-1} />
      <Shoe at={[99, 146]} />
      <Torso sl={[67, 48]} sr={[93, 48]} hr={[89, 94]} hl={[71, 94]} c={C.navy2} />
      <Torso sl={[67, 48]} sr={[93, 48]} hr={[90, 74]} hl={[70, 74]} c={C.mint2} />
      <rect x="69" y="72" width="22" height="5" rx="2" fill={C.ink} />
      <Neck a={[80, 38]} b={[80, 46]} skin={C.tan2} />
      <Head at={[80, 30]} skin={sk} />
      <path d="M71.5 29Q71 19 80 19Q89 19 88.5 29Q84 24 80 24Q75 24 71.5 29Z" fill={C.hair} />
      <path d="M86 23Q96 24 96 34Q90 30 87 28Z" fill={C.hair} />
      <g className="kf-press" style={{ animationDuration: '3s' }}>
        <Arm s={[69, 50]} e={[59, 36]} w={[60, 20]} skin={sk} sleeve={C.mint2} sleeveTo={0.3} />
        <Arm s={[91, 50]} e={[101, 36]} w={[100, 20]} skin={sk} sleeve={C.mint2} sleeveTo={0.3} />
        <rect x="20" y="17" width="120" height="4.5" rx="2.25" fill={C.ink2} />
        <rect x="22" y="5" width="9" height="28" rx="3.5" fill={C.navy} />
        <rect x="32" y="9" width="6" height="20" rx="2.5" fill={C.violet} />
        <rect x="129" y="5" width="9" height="28" rx="3.5" fill={C.navy} />
        <rect x="122" y="9" width="6" height="20" rx="2.5" fill={C.violet} />
      </g>
    </Frame>
  )
}

/** دوچرخه‌ی ثابت */
export function Cyclist(p: ArtProps & { shirt?: string }) {
  const sk = C.brown
  return (
    <Frame p={p} label="دوچرخه‌سوار">
      <Floor y={150} w={46} />
      {/* بدنه‌ی دوچرخه */}
      <rect x="36" y="146" width="88" height="5" rx="2.5" fill={C.ink2} />
      <circle cx="58" cy="128" r="16" fill={C.lav} />
      <g className="kf-spin" style={{ ...org(58, 128), animationDuration: '1.8s' }}>
        <circle cx="58" cy="128" r="11" fill="none" stroke={C.white} strokeWidth="2" strokeDasharray="5 4" />
      </g>
      <circle cx="58" cy="128" r="4" fill={C.ink2} />
      <path d="M58 146L66 104M98 146L108 92" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
      <path d="M66 104L104 108" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
      <rect x="56" y="96" width="20" height="6" rx="3" fill={C.ink} />
      <path d="M104 90H118" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
      <g className="kf-float" style={{ animationDuration: '1.6s' }}>
        {/* پای عقب */}
        <Leg h={[68, 92]} k={[86, 112]} a={[74, 132]} skin={C.brown2} pants={C.navy} />
        <Shoe at={[74, 135]} rot={10} />
        {/* تنه و سر */}
        <Torso sl={[86, 52]} sr={[98, 58]} hr={[76, 96]} hl={[62, 90]} c={C.coral} />
        <Neck a={[98, 46]} b={[95, 52]} skin={C.brown2} />
        <Head at={[103, 39]} skin={sk} />
        <path d="M94.5 38Q94 29 103 29Q111 29 111.5 37Q106 33 100 34Q97 35 94.5 38Z" fill={C.hair} />
        {/* پای جلو */}
        <Leg h={[72, 94]} k={[94, 98]} a={[90, 124]} skin={sk} pants={C.navy2} />
        <Shoe at={[92, 127]} rot={6} />
        {/* بازو */}
        <Arm s={[95, 57]} e={[104, 74]} w={[115, 88]} skin={sk} sleeve={C.coral} sleeveTo={0.35} />
      </g>
    </Frame>
  )
}

/** حرکت درخت یوگا (روبه‌رو، دست‌ها بالای سر) */
export function Yoga(p: ArtProps & { shirt?: string }) {
  const sk = C.skin
  return (
    <Frame p={p} label="یوگا">
      <Floor y={150} w={26} />
      <g className="kf-breathe" style={{ ...org(80, 148), animationDuration: '5s' }}>
        <Leg h={[76, 92]} k={[76, 120]} a={[77, 146]} skin={sk} pants={C.violet} full />
        <Shoe at={[79, 148]} c={C.skin2} accent={C.skin2} />
        <Leg h={[84, 92]} k={[104, 108]} a={[82, 116]} skin={sk} pants={C.violet2} full />
        <Torso sl={[69, 46]} sr={[91, 46]} hr={[88, 94]} hl={[72, 94]} c={C.violet} />
        <Torso sl={[69, 46]} sr={[91, 46]} hr={[88, 72]} hl={[72, 72]} c={C.pink} />
        <Neck a={[80, 36]} b={[80, 44]} skin={C.skin2} />
        <Head at={[80, 28]} skin={sk} />
        <path d="M71.5 28Q71 18 80 18Q89 18 88.5 28Q84 23 80 23Q75 23 71.5 28Z" fill={C.hair} />
        <path d="M72 26Q66 40 70 52Q74 42 74 30Z" fill={C.hair} />
        <Arm s={[70, 48]} e={[60, 28]} w={[76, 8]} skin={sk} />
        <Arm s={[90, 48]} e={[100, 28]} w={[84, 8]} skin={sk} />
      </g>
    </Frame>
  )
}

/** مربی با بلندگو */
export function Coach(p: ArtProps & { shirt?: string }) {
  const sk = C.skin
  return (
    <Frame p={p} label="مربی">
      <Floor y={150} w={32} />
      <Leg h={[66, 92]} k={[63, 120]} a={[60, 146]} skin={sk} pants={C.navy} full />
      <Leg h={[76, 92]} k={[80, 120]} a={[84, 146]} skin={sk} pants={C.navy2} full />
      <Shoe at={[58, 148]} dir={-1} />
      <Shoe at={[86, 148]} />
      <Arm s={[60, 48]} e={[56, 70]} w={[68, 78]} skin={C.skin2} sleeve={C.mint2} sleeveTo={0.35} />
      <Torso sl={[58, 44]} sr={[82, 44]} hr={[79, 94]} hl={[62, 94]} c={C.teal} />
      <Neck a={[71, 34]} b={[70, 42]} skin={C.skin2} />
      <Head at={[72, 26]} skin={sk} />
      <path d="M63.5 25Q63 15 72 15Q81 15 80.5 23Q75 20 69 21Q66 22 63.5 25Z" fill={C.hairBrown} />
      {/* بلندگو */}
      <g className="kf-sway" style={{ ...org(84, 34), animationDuration: '2.6s' }}>
        <Arm s={[80, 47]} e={[90, 58]} w={[86, 38]} skin={sk} sleeve={C.mint2} sleeveTo={0.35} />
        <path d="M82 30L100 22V44L82 36Z" fill={C.white} />
        <path d="M100 22V44" stroke={C.lav} strokeWidth="3" strokeLinecap="round" />
        <rect x="78" y="29" width="6" height="8" rx="2" fill={C.ink2} />
      </g>
      {[0, 0.5, 1].map((t, i) => (
        <path key={i} className="kf-pulse" style={{ animationDelay: `${t}s`, animationDuration: '1.6s' }} d={`M${108 + i * 7} ${24 - i * 2}Q${112 + i * 8} 33 ${108 + i * 7} ${42 + i * 2}`} fill="none" stroke={C.coral} strokeWidth="2.2" strokeLinecap="round" />
      ))}
    </Frame>
  )
}

/** پزشک با روپوش و گوشی */
export function Doctor(p: ArtProps) {
  const sk = C.tan
  return (
    <Frame p={p} label="پزشک">
      <Floor y={150} w={30} />
      <Leg h={[74, 104]} k={[73, 126]} a={[72, 146]} skin={sk} pants={C.navy} full />
      <Leg h={[86, 104]} k={[87, 126]} a={[88, 146]} skin={sk} pants={C.navy2} full />
      <Shoe at={[70, 148]} dir={-1} />
      <Shoe at={[90, 148]} />
      <Torso sl={[68, 48]} sr={[92, 48]} hr={[90, 76]} hl={[70, 76]} c={C.lav} />
      {/* روپوش */}
      <path d="M64 47Q70 44 76 46L78 76L74 112H60Q58 80 64 47Z" fill={C.white} />
      <path d="M96 47Q90 44 84 46L82 76L86 112H100Q102 80 96 47Z" fill={C.white} />
      <path d="M76 46L80 56L84 46" fill="none" stroke={C.lav} strokeWidth="2" />
      <path d="M74 48Q72 66 80 70Q88 66 86 48" fill="none" stroke={C.ink2} strokeWidth="2" strokeLinecap="round" />
      <circle cx="80" cy="71" r="3" fill={C.ink2} />
      <Neck a={[80, 38]} b={[80, 46]} skin={C.tan2} />
      <Head at={[80, 30]} skin={sk} />
      <path d="M71 31Q70 19 80 19Q90 19 89 31Q86 25 80 25Q74 25 71 31Z" fill={C.hair} />
      <path d="M71 29Q68 40 72 44L74 32Z M89 29Q92 40 88 44L86 32Z" fill={C.hair} />
      <Arm s={[68, 50]} e={[64, 72]} w={[72, 84]} skin={sk} sleeve={C.white} sleeveTo={0.9} />
      <rect x="68" y="76" width="18" height="24" rx="3" fill={C.peach} transform="rotate(-6 77 88)" />
      <rect x="71" y="82" width="12" height="2.4" rx="1.2" fill={C.white} transform="rotate(-6 77 88)" />
      <rect x="71" y="88" width="8" height="2.4" rx="1.2" fill={C.white} transform="rotate(-6 77 88)" />
      <Arm s={[92, 50]} e={[96, 72]} w={[86, 84]} skin={sk} sleeve={C.white} sleeveTo={0.9} />
      <g className="kf-heart" style={{ ...org(122, 40), animationDuration: '1.8s' }}>
        <path d="M122 54C108 45 107 34 114 31C118 29 121 32 122 34C123 32 126 29 130 31C137 34 136 45 122 54Z" fill={C.coral} />
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
