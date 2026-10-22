import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { Gym } from '@/core/types'
import { dec, toman } from '@/core/format'
import { Badge, Cover, Stars } from '@/ui/kit'

export const GENDER_LABEL = { male: 'آقایان', female: 'بانوان', mixed: 'سانس بانوان و آقایان' } as const

export function GymCard({ gym, distance, compact }: { gym: Gym; distance?: number; compact?: boolean }) {
  const img = gym.media.find((m) => m.type === 'image')?.url
  return (
    <Link
      to={`/fityab/${gym.id}`}
      className={`group block overflow-hidden rounded-[1.75rem] bg-white shadow-card transition hover:-translate-y-0.5 dark:border dark:border-white/[.07] dark:bg-ink-900/70 dark:shadow-none ${compact ? 'w-64 shrink-0' : ''}`}
    >
      <Cover gradient={gym.cover} image={img} emoji="🏋️" className="m-2 h-32 rounded-[1.4rem]">
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-3">
          <Badge color="slate" className="!bg-white/90 !text-ink-800">{toman(gym.sessionPrice)} / سانس</Badge>
          {distance !== undefined && <Badge color="slate" className="!bg-black/50 !text-white">{dec(distance)} کیلومتر</Badge>}
        </div>
      </Cover>
      <div className="px-4 pb-4 pt-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-bold">{gym.name}</h3>
          <Stars value={gym.rating} />
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-500">{gym.tagline}</p>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-ink-400">
          <MapPin size={12} /> <span className="truncate">{gym.address}</span>
        </div>
      </div>
    </Link>
  )
}
