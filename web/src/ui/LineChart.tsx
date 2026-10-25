/** نمودار خطی سبک برای روند وزن و نمره‌ی سلامت */
import { num } from '@/core/format'

export function LineChart({ data, height = 140, color = '#8a6bff', format = num }: { data: { label: string; value: number }[]; height?: number; color?: string; format?: (n: number) => string }) {
  if (data.length < 2) return <div className="flex h-28 items-center justify-center text-xs text-ink-400">برای نمایش روند حداقل دو ثبت لازم است</div>
  const W = 320
  const H = height
  const pad = 18
  const vals = data.map((d) => d.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const x = (i: number) => pad + (i * (W - pad * 2)) / (data.length - 1)
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2)
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`)
  const area = `M${x(0)},${H - pad} L${pts.join(' L')} L${x(data.length - 1)},${H - pad} Z`
  const id = `lg-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full" role="img" aria-label="نمودار روند">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
          {(i === 0 || i === data.length - 1 || data.length <= 7) && (
            <>
              <text x={x(i)} y={y(d.value) - 9} textAnchor="middle" fontSize="9" className="fill-ink-500">{format(d.value)}</text>
              <text x={x(i)} y={H + 10} textAnchor="middle" fontSize="8.5" className="fill-ink-400">{d.label}</text>
            </>
          )}
        </g>
      ))}
    </svg>
  )
}
