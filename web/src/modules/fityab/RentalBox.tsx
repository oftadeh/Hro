/** رزرو ساعتی سالن ورزشی و زمین چمن */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { VENUE_KINDS } from '@/core/config'
import { bookRental, rentalPrice, rentalSlots, rentalTier, RENTAL_CANCEL_HOURS, subCovers, tierLabel, weekdayLabel, weekdayOf } from '@/core/services/fityab'
import { activeSubscription } from '@/core/services/wallet'
import type { Gym } from '@/core/types'
import { Button, Select } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { run } from '@/ui/toast'
import { PaySheet } from './TicketView'
import { moment } from '@/ui/moments'

export function RentalBox({ gym, onBooked }: { gym: Gym; onBooked: (ticketId: string) => void }) {
  const me = useMe()!
  const checkins = useDB((s) => s.checkins)
  const allTeams = useDB((s) => s.teams)
  useDB((s) => s.subscriptions)
  const teams = allTeams.filter((t) => t.members.includes(me.id))
  const bal = useBalance(me.id)
  const sub = activeSubscription(me.id)
  const [dayIdx, setDayIdx] = useState(0)
  const [start, setStart] = useState<Date>()
  const [hours, setHours] = useState(1)
  const [teamId, setTeamId] = useState('')
  const [pay, setPay] = useState(false)
  const days = useMemo(() => [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d }), [])
  const slots = rentalSlots(gym, days[dayIdx], { checkins })
  const r = gym.rental!
  // ساعت‌های پیوسته‌ی آزاد از ساعت انتخاب‌شده
  const maxH = start ? (() => { let n = 0; const i = slots.findIndex((x) => x.start.getTime() === start.getTime()); while (n < r.maxHours && slots[i + n]?.free) n++; return n })() : 1
  const h = Math.min(hours, Math.max(1, maxH))
  const price = start ? rentalPrice(gym, start, h) : r.hourlyPrice

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-xs text-ink-500">اجاره‌ی {VENUE_KINDS[gym.kind ?? 'hall'].label}</div>
        <div><span className="font-display text-2xl">{toman(r.hourlyPrice)}</span> <span className="text-[12px] text-ink-400">/ ساعت</span></div>
      </div>
      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
        {days.map((d, i) => (
          <button key={i} onClick={() => { setDayIdx(i); setStart(undefined) }} className={clsx('flex w-12 shrink-0 flex-col items-center rounded-2xl py-1.5 text-[12px]', i === dayIdx ? 'card-violet text-ink-950' : 'bg-ink-900/[.04] text-ink-500 dark:bg-white/[.05]')}>
            {i === 0 ? 'امروز' : weekdayLabel(weekdayOf(d)).slice(0, 2)}
            <span className="font-display text-lg leading-none">{d.toLocaleDateString('fa-IR', { day: 'numeric' })}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {slots.map((x) => {
          const on = start?.getTime() === x.start.getTime()
          return (
            <button key={x.start.getTime()} disabled={!x.free} onClick={() => { setStart(x.start); setHours(1) }} className={clsx('rounded-xl py-2 text-xs tabular-nums transition', on ? 'grad-mint font-semibold text-ink-950' : x.free ? 'bg-ink-900/[.05] hover:bg-ink-900/10 dark:bg-white/[.06]' : 'bg-ink-900/[.02] text-ink-300 line-through dark:bg-white/[.02] dark:text-ink-600')}>
              {num(x.start.getHours())}:۰۰
            </button>
          )
        })}
      </div>
      {start && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Select value={h} onChange={(e) => setHours(Number(e.target.value))}>
              {[...Array(maxH)].map((_, i) => <option key={i} value={i + 1}>{num(i + 1)} ساعت</option>)}
            </Select>
            {teams.length > 0 && (
              <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">رزرو شخصی</option>
                {teams.map((t) => <option key={t.id} value={t.id}>برای تیم {t.name}</option>)}
              </Select>
            )}
          </div>
          <Button className="w-full" size="lg" onClick={() => setPay(true)}>رزرو {num(h)} ساعت — {toman(price)}</Button>
        </div>
      )}
      <p className="mt-2 text-[12px] text-ink-400">لغو تا {num(RENTAL_CANCEL_HOURS)} ساعت قبل از شروع با بازگشت کامل وجه. با انتخاب تیم، قرار به‌صورت خودکار برای هم‌تیمی‌ها ثبت می‌شود.</p>
      <PaySheet
        open={pay && !!start}
        onClose={() => setPay(false)}
        title={`اجاره‌ی ${gym.name}`}
        desc={start ? `${weekdayLabel(weekdayOf(start))} ساعت ${num(start.getHours())} به مدت ${num(h)} ساعت` : ''}
        price={price}
        credit={sub?.credit}
        balance={bal}
        uncovered={sub && !subCovers(sub.planId, rentalTier(gym)) ? `عضویت ${sub.plan.name} شامل اجاره‌های سطح ${tierLabel(rentalTier(gym))} نیست؛ از کیف پول پرداخت کن.` : undefined}
        onPay={async (prefer) => {
          const t = await run(() => bookRental(gym.id, start!.toISOString(), h, prefer, teamId || undefined))
          if (t) moment('pay', { title: 'رزرو انجام شد', sub: prefer === 'wallet' ? 'مبلغ از کیف پول کسر شد' : 'از اعتبار اشتراک کم شد' })
          if (t) {
            setPay(false)
            setStart(undefined)
            onBooked(t.id)
          }
        }}
      />
    </div>
  )
}
