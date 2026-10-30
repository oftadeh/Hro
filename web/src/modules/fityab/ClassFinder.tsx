import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { dec, faTime, num, toman } from '@/core/format'
import { bookedCount, classAllows, classPrice, classesBetween, gymTitle } from '@/core/services/fityab'
import type { Gym } from '@/core/types'
import { Card, Empty } from '@/ui/kit'

/** بازه‌های ساعت: کاربر می‌گوید «امروز عصر کلاس می‌خواهم»، نه «کدام باشگاه» */
const RANGES = [
  { v: 'all', label: 'همه‌ی ساعت‌ها', from: 0, to: 24 },
  { v: 'morning', label: 'صبح ۶ تا ۱۲', from: 6, to: 12 },
  { v: 'noon', label: 'ظهر ۱۲ تا ۱۷', from: 12, to: 17 },
  { v: 'evening', label: 'عصر ۱۷ تا ۲۱', from: 17, to: 21 },
  { v: 'night', label: 'شب ۲۱ به بعد', from: 21, to: 24 },
] as const
const DAYS = ['امروز', 'فردا', 'پس‌فردا']

const chip = (on: boolean) =>
  clsx('press h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px]', on ? 'bg-ink-950 font-semibold text-white dark:bg-white dark:text-ink-950' : 'bg-ink-900/[.05] text-ink-600 dark:bg-white/[.06] dark:text-ink-300')

/** کلاس‌های همه‌ی باشگاه‌های فیلترشده، بر اساس روز و ساعت */
export function ClassFinder({ list, sport, kidsOnly, gender }: { list: { g: Gym; d: number }[]; sport: string; kidsOnly: boolean; gender?: 'male' | 'female' }) {
  const checkins = useDB((s) => s.checkins)
  const [day, setDay] = useState(0)
  const [range, setRange] = useState<(typeof RANGES)[number]['v']>('all')
  const r = RANGES.find((x) => x.v === range)!
  const dist = useMemo(() => new Map(list.map((x) => [x.g.id, x.d])), [list])
  const rows = useMemo(() => {
    const base = new Date()
    base.setDate(base.getDate() + day)
    const from = new Date(base)
    from.setHours(r.from, 0, 0, 0)
    const to = new Date(base)
    to.setHours(r.to, 0, 0, 0)
    const start = day === 0 && from < new Date() ? new Date() : from
    return classesBetween(list.map((x) => x.g), start, to)
      .filter((x) => sport === 'all' || x.cls.sport === sport)
      // کودکان فقط در فیلتر کودکان؛ کلاس‌های بزرگسال طبق جنسیت سانس همان ساعت
      .filter((x) => (kidsOnly ? x.cls.audience === 'kids' : x.cls.audience !== 'kids' && classAllows(x.gym, x.cls, x.at, gender)))
      .slice(0, 80)
  }, [list, day, r, sport, kidsOnly, gender])

  return (
    <div className="mt-3 space-y-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" aria-label="روز">
        {DAYS.map((label, i) => <button key={label} onClick={() => setDay(i)} aria-pressed={day === i} className={chip(day === i)}>{label}</button>)}
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 self-center bg-ink-900/10 dark:bg-white/15" />
        {RANGES.map((x) => <button key={x.v} onClick={() => setRange(x.v)} aria-pressed={range === x.v} className={chip(range === x.v)}>{x.label}</button>)}
      </div>
      {rows.length ? (
        <Card className="px-4 py-1">
          {rows.map(({ gym, cls, at }) => {
            const key = at.toISOString()
            const left = cls.capacity - bookedCount(cls.id, key, { checkins })
            return (
              <Link key={gym.id + cls.id + key} to={`/fityab/${gym.id}`} className="flex items-center gap-3 border-b hairline py-3 last:border-0">
                <div className="w-14 shrink-0 text-center">
                  <div className="font-display text-2xl leading-none">{faTime(key)}</div>
                  <div className="text-[12px] text-ink-400">{num(cls.durationMin)} دقیقه</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{cls.title}</div>
                  <div className="truncate text-[12px] text-ink-500">{gymTitle(gym)} · {dec(dist.get(gym.id) ?? 0)} کیلومتر · {toman(classPrice(gym, cls))}</div>
                </div>
                <span className={clsx('shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold', left > 0 ? 'bg-aqua-400/15 text-aqua-700 dark:text-aqua-300' : 'bg-ink-900/[.06] text-ink-500 dark:bg-white/[.08]')}>
                  {left > 0 ? `${num(left)} جا` : 'صف انتظار'}
                </span>
              </Link>
            )
          })}
        </Card>
      ) : (
        <Empty title="کلاسی در این بازه پیدا نشد" desc="روز یا ساعت دیگری را امتحان کن، یا فیلتر رشته را بردار." />
      )}
    </div>
  )
}
