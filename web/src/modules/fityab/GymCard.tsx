import { Link } from 'react-router-dom'
import type { Gym } from '@/core/types'
import { dec, toman } from '@/core/format'
import { Cover, Stars } from '@/ui/kit'
import { SportArt } from '@/ui/art'

export const GENDER_LABEL = { male: 'آقایان', female: 'بانوان', mixed: 'بانوان و آقایان' } as const

/** کارت باشگاه به سبک «Inner Peace»: نام با قلم سریف روی تصویر */
export function GymCard({ gym, distance, compact }: { gym: Gym; distance?: number; compact?: boolean }) {
  const img = gym.media.find((m) => m.type === 'image')?.url
  return (
    <Link to={`/fityab/${gym.id}`} className={`lift-hover group block overflow-hidden rounded-[2rem] bg-white shadow-card dark:bg-ink-850 dark:shadow-none ${compact ? 'w-64 shrink-0' : ''}`}>
      <Cover gradient={gym.id} image={img} className="aspect-[4/3]">
        {!img && <SportArt sports={gym.sports} size={130} className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2" />}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent p-4 pt-12 text-white">
          <h3 className="font-display text-[1.8rem] leading-[1.1]">{gym.name.replace('باشگاه ', '')}</h3>
          <div className="mt-1 text-[11px] text-white/75">{gym.sports.slice(0, 2).join(' · ')}</div>
        </div>
        {gym.gender !== 'mixed' && (
          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-950 ${gym.gender === 'female' ? 'grad-pink' : 'grad-mint'}`}>ویژه‌ی {GENDER_LABEL[gym.gender]}</span>
        )}
        {distance !== undefined && (
          <span className="absolute left-3 top-3 rounded-full bg-white/25 px-2.5 py-1 text-[11px] tabular-nums text-white backdrop-blur">{dec(distance)} کیلومتر</span>
        )}
      </Cover>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="text-xs tabular-nums">
          {toman(gym.sessionPrice)} <span className="text-ink-400">/ جلسه</span>
        </div>
        <Stars value={gym.rating} />
      </div>
    </Link>
  )
}
