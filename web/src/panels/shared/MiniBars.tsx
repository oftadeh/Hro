import { num } from '@/core/format'
import { WeekBars } from '@/ui/WeekBars'

/** نمودار ستونی باریک (هم‌سبک با نمودار هفتگی خانه) */
export function MiniBars({ data, format = num }: { data: { label: string; value: number }[]; color?: string; format?: (n: number) => string }) {
  return <WeekBars data={data.map((d, i) => ({ ...d, today: i === data.length - 1 }))} format={format} />
}
