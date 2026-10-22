import { Link } from 'react-router-dom'
import type { Gym } from '@/core/types'
import { dec, toman } from '@/core/format'
import { Cover, Stars } from '@/ui/kit'

export const GENDER_LABEL = { male: 'آقایان', female: 'بانوان', mixed: 'بانوان و آقایان' } as const

export function GymCard({ gym, distance, compact }: { gym: Gym; distance?: number; compact?: boolean }) {
  const img = gym.media.find((m) => m.type === 'image')?.url
  return (
    <Link to={`/fityab/${gym.id}`} className={`group block ${compact ? 'w-64 shrink-0' : ''}`}>
      <Cover gradient={gym.id} image={img} label={gym.sports[0]} className="aspect-[4/3] rounded-2xl transition duration-300 group-hover:opacity-90">
        {distance !== undefined && (
          <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] tabular-nums text-white backdrop-blur">{dec(distance)} کیلومتر</span>
        )}
      </Cover>
      <div className="px-1 pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[14px] font-medium">{gym.name}</h3>
          <Stars value={gym.rating} />
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-500">{gym.address}</p>
        <div className="mt-1.5 text-xs tabular-nums text-ink-800 dark:text-ink-200">
          {toman(gym.sessionPrice)} <span className="text-ink-400">/ هر جلسه</span>
        </div>
      </div>
    </Link>
  )
}
