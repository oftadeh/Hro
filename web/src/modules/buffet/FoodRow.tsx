import { Plus } from 'lucide-react'
import type { Food } from '@/core/types'
import { num, toman } from '@/core/format'
import { Badge } from '@/ui/kit'

export function FoodRow({ f, restaurant, onAdd }: { f: Food; restaurant?: string; onAdd: () => void }) {
  return (
    <div className="flex gap-3 rounded-[1.75rem] bg-white p-3 shadow-card dark:border dark:border-white/[.07] dark:bg-ink-900/70 dark:shadow-none">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-lime-50 text-5xl dark:bg-lime-500/10">
        {f.image ? <img src={f.image} alt="" className="h-full w-full object-cover" /> : f.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold">{f.name}</div>
        {restaurant && <div className="text-[11px] text-ink-400">{restaurant}</div>}
        <div className="line-clamp-1 text-xs text-ink-500">{f.description}</div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge color="amber">🔥 {num(f.calories)} کالری</Badge>
          <Badge color="sky">P {num(f.protein)}g</Badge>
          <Badge color="slate">C {num(f.carbs)}g · F {num(f.fat)}g</Badge>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <b className="text-sm">{toman(f.price)}</b>
          <button onClick={onAdd} className="flex items-center gap-1 rounded-xl bg-lime-500 px-3 py-1.5 text-xs font-bold text-white">
            <Plus size={14} /> افزودن
          </button>
        </div>
      </div>
    </div>
  )
}
