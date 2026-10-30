/** کارهای زمان‌بندی‌شده: انقضای بلیت‌ها، یادآورها، پشتیبان روزانه */
import { AsyncLocalStorage } from 'node:async_hooks'
import { getState, kv, dailyBackup, sql } from './storage'
import { mutate } from '../src/core/store'
import { expireTickets } from '../src/core/services/fityab'
import { autoReleaseDeals } from '../src/core/services/market'
import { cycleStatusIn } from '../src/core/services/cycle'
import { notify } from '../src/core/services/ledger'
import { dayKey } from '../src/core/format'
import { dailyCleanup, refreshDemoStories } from './maintenance'

export function startCron(ctx: AsyncLocalStorage<{ userId: string | null }>) {
  const tick = () => {
    ctx.run({ userId: null }, () => {
      try {
        expireTickets()
        autoReleaseDeals()
        reminders()
        dailyBackup()
        dailyCleanup(dayKey())
        refreshDemoStories()
        sql.prepare("DELETE FROM kv WHERE key LIKE 'rem:%' AND key NOT LIKE ?").run(`%${dayKey()}%`)
      } catch (e) {
        console.error('cron', e)
      }
    })
  }
  setInterval(tick, 60_000)
  setTimeout(tick, 5_000)
}

/** هر یادآور در هر روز فقط یک بار ارسال می‌شود */
function once(key: string) {
  if (kv.get(key)) return false
  kv.set(key, '1')
  return true
}

function reminders() {
  const now = new Date()
  const h = now.getHours()
  const hm = `${String(h).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const today = dayKey()
  const s = getState()
  const due: { userId: string; title: string; body: string; link: string }[] = []
  for (const u of s.users) {
    if (u.blocked) continue
    const r = u.reminders ?? { water: true, workout: true, period: true, workoutTime: '18:00' }
    const log = s.dailyLogs.find((l) => l.userId === u.id && l.day === today)
    if (r.water && [11, 15, 19].includes(h) && (log?.water ?? 0) < Math.round((h - 7) / 2) && once(`rem:${u.id}:water:${today}:${h}`))
      due.push({ userId: u.id, title: 'وقت یک لیوان آب است', body: `امروز ${log?.water ?? 0} لیوان نوشیده‌ای؛ هدف ۸ لیوان.`, link: '/' })
    if (r.workout && hm >= r.workoutTime && (log?.workoutMinutes ?? 0) < 10 && once(`rem:${u.id}:workout:${today}`))
      due.push({ userId: u.id, title: 'تمرین امروز منتظر توست', body: 'یک سانس در باشگاه‌های اطراف رزرو کن یا تمرین خانگی‌ات را ثبت کن.', link: '/fityab' })
    if (r.period && u.gender === 'female' && h === 10) {
      const st = cycleStatusIn(s, u.id)
      if (st && st.daysToNext === 2 && once(`rem:${u.id}:period:${today}`)) due.push({ userId: u.id, title: 'یادآور چرخه', body: 'حدود ۲ روز تا شروع پریود بعدی؛ برنامه‌ی تمرینت را سبک‌تر بچین.', link: '/profile?tab=health' })
    }
  }
  // تمدید: ۳ روز و ۱ روز مانده به پایان اشتراک (ساعت ۱۱)
  for (const sub of s.subscriptions) {
    const left = Math.ceil((new Date(sub.expiresAt).getTime() - now.getTime()) / 86_400_000)
    if ((left === 3 || left === 1) && h === 11 && once(`rem:${sub.userId}:renew:${today}`))
      due.push({
        userId: sub.userId,
        title: sub.trial ? 'دوره‌ی آزمایشی رو به پایان است' : 'اشتراکت رو به پایان است',
        body: sub.trial ? `${left} روز مانده؛ با خرید عضویت ادامه بده.` : `${left} روز مانده؛ با تمدید تا ۷ روز پس از پایان، اعتبار باقی‌مانده تا سقف پلن جدید منتقل می‌شود.`,
        link: '/wallet',
      })
  }
  // کلاس آنلاین: ۱۵ دقیقه قبل؛ رویداد: یک روز قبل
  for (const c of s.liveClasses ?? []) {
    const left = new Date(c.at).getTime() - now.getTime()
    if (c.status === 'scheduled' && left > 0 && left <= 15 * 60_000 && once(`rem:live:${c.id}:${today}`))
      for (const u of [c.hostId, ...c.attendees]) due.push({ userId: u, title: 'کلاس آنلاین تا چند دقیقه‌ی دیگر', body: `«${c.title}» — دکمه‌ی ورود فعال شد.`, link: `/live/${c.id}` })
  }
  for (const e of s.events ?? []) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (e.approved && (e.status === 'open' || e.status === 'closed') && dayKey(new Date(e.at)) === dayKey(tomorrow) && h >= 18 && once(`rem:event:${e.id}:${today}`))
      for (const r of e.registrations) due.push({ userId: r.userId, title: `فردا: ${e.title}`, body: `شماره‌ی شما ${r.bib} — ${e.location}`, link: `/events/${e.id}` })
  }
  if (due.length) mutate((d) => due.forEach((x) => notify(d, x.userId, x.title, x.body, '', x.link)))
}
