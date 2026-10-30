import { useState } from 'react'
import { useDB } from '@/core/db'
import { dayKey, faDate, faTime, num } from '@/core/format'
import { bookedCount, cancelClassSlot, setClosedDay, upcomingClasses, waitlistFor } from '@/core/services/fityab'
import type { Gym } from '@/core/types'
import { Badge, Button, Card, Input, Select } from '@/ui/kit'
import { ask, askText, runOk } from '@/ui/toast'

/** تعطیلی روز و لغو نوبت کلاس؛ همه‌ی بلیت‌های درگیر با بازگشت کامل وجه لغو می‌شوند */
export function GymSchedule({ gym }: { gym: Gym }) {
  const checkins = useDB((s) => s.checkins)
  const waitlist = useDB((s) => s.waitlist) ?? []
  const next = [...Array(31)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
  const [day, setDay] = useState(dayKey())
  const [reason, setReason] = useState('')
  const closed = (gym.closedDays ?? []).filter((c) => c.day >= dayKey())
  const slots = upcomingClasses(gym, 7)

  const close = async () => {
    if (!(await ask(`${faDate(day)} تعطیل شود؟ همه‌ی بلیت‌ها و رزروهای آن روز لغو و مبلغ کامل به ورزشکاران برمی‌گردد.`))) return
    if (await runOk(() => setClosedDay(gym.id, day, reason || 'تعطیلی باشگاه'), 'تعطیلی ثبت شد')) setReason('')
  }

  return (
    <Card className="space-y-4">
      <div className="font-semibold">{gym.name}: تعطیلی و لغو نوبت</div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
        <Select value={day} onChange={(e) => setDay(e.target.value)} aria-label="روز تعطیلی">
          {next.map((d) => <option key={dayKey(d)} value={dayKey(d)}>{new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)}</option>)}
        </Select>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل (مثلاً تعطیل رسمی یا تعمیرات)" />
        <Button variant="secondary" onClick={close}>ثبت تعطیلی</Button>
      </div>
      {closed.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {closed.map((c) => (
            <span key={c.day} className="flex items-center gap-2 rounded-full bg-gold-300/15 py-1 pe-1 ps-3 text-xs">
              {faDate(c.day)} · {c.reason}
              <button className="rounded-full bg-white/70 px-2 py-0.5 dark:bg-white/10" onClick={() => runOk(() => setClosedDay(gym.id, c.day, c.reason, false), 'روز دوباره باز شد')}>باز کردن</button>
            </span>
          ))}
        </div>
      )}
      {slots.length > 0 && (
        <div>
          <div className="mb-1 text-xs text-ink-500">نوبت‌های کلاس ۷ روز آینده</div>
          {slots.map(({ cls, at }) => {
            const key = at.toISOString()
            const n = bookedCount(cls.id, key, { checkins })
            const q = waitlistFor(cls.id, key, { waitlist }).length
            return (
              <div key={cls.id + key} className="flex items-center gap-3 border-b hairline py-2.5 text-sm last:border-0">
                <span className="w-24 shrink-0 text-xs text-ink-500">{faDate(key)} · {faTime(key)}</span>
                <span className="min-w-0 flex-1 truncate">{cls.title}</span>
                <Badge>{num(n)}/{num(cls.capacity)}</Badge>
                {q > 0 && <Badge color="amber">{num(q)} صف</Badge>}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-coral-500"
                  onClick={async () => {
                    const why = await askText(`نوبت «${cls.title}» لغو شود؟ ${num(n)} رزرو با بازگشت کامل وجه لغو می‌شود. دلیل را بنویسید:`, 'مثلاً نبود مربی')
                    if (why === null) return
                    await runOk(() => cancelClassSlot(gym.id, cls.id, key, why), 'نوبت لغو شد')
                  }}
                >
                  لغو
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
