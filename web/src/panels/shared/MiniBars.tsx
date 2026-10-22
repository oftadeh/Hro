import { num } from '@/core/format'

/** نمودار ستونی سبک بدون وابستگی */
export function MiniBars({ data, color = 'from-emerald-400 to-teal-500', format = num }: { data: { label: string; value: number }[]; color?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="text-[10px] font-bold text-ink-500">{d.value ? format(d.value) : ''}</div>
          <div className="flex h-28 w-full items-end">
            <div className={`w-full rounded-t-xl bg-gradient-to-t ${color} transition-all duration-700`} style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} />
          </div>
          <div className="text-[10px] text-ink-400">{d.label}</div>
        </div>
      ))}
    </div>
  )
}
