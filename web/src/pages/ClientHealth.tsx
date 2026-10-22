import { useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDate, num } from '@/core/format'
import { ACTIVITY, GOALS, bodyOf } from '@/core/profile'
import { exerciseById } from '@/core/catalog'
import { cycleStatusIn, PHASES } from '@/core/services/cycle'
import { Avatar, Card, Empty, PageHeader, SectionTitle } from '@/ui/kit'
import { useMe } from '@/ui/hooks'

/** نمای پرونده‌ی سلامت شاگرد/بیمار برای مربی یا پزشکی که کاربر به او اجازه داده است */
export default function ClientHealth() {
  const { id } = useParams()
  const me = useMe()!
  const s = useDB((x) => x)
  const u = s.users.find((x) => x.id === id)
  if (!u) return <Empty title="کاربر یافت نشد" />
  if (!u.healthShares?.includes(me.id))
    return (
      <div className="animate-fade-up">
        <PageHeader back title={u.name} />
        <Empty title="دسترسی ندارید" desc="این کاربر پرونده‌ی سلامت خود را با شما به اشتراک نگذاشته است." />
      </div>
    )
  const body = bodyOf(u)
  const cyc = cycleStatusIn(s, u.id)
  const workouts = s.workouts.filter((w) => w.userId === u.id).slice(0, 6)
  const weights = s.bodyEntries.filter((b) => b.userId === u.id && b.weightKg).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 6)
  return (
    <div className="animate-fade-up">
      <PageHeader back title={`پرونده‌ی ${u.name}`} subtitle="اشتراک‌گذاری‌شده توسط کاربر" />
      <Card className="flex items-center gap-3">
        <Avatar name={u.name} src={u.avatar} size={52} />
        <div className="flex-1 text-xs leading-6 text-ink-500">
          <div className="text-sm font-semibold text-ink-900 dark:text-white">{u.name}</div>
          {u.gender && (u.gender === 'female' ? 'خانم' : 'آقا')} {body.age && `· ${num(body.age)} سال`} {u.goal && `· هدف: ${GOALS[u.goal]}`} {u.activityLevel && `· ${ACTIVITY[u.activityLevel]}`}
        </div>
      </Card>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          ['قد', u.heightCm ? `${num(u.heightCm)} cm` : '—'],
          ['وزن', u.weightKg ? `${num(u.weightKg)} kg` : '—'],
          ['BMI', body.bmi ? body.bmi.toFixed(1) : '—'],
        ].map(([l, v]) => (
          <Card key={l} className="text-center">
            <div className="text-[11px] text-ink-400">{l}</div>
            <div className="mt-1 text-sm font-semibold tabular-nums" dir="ltr">{v}</div>
          </Card>
        ))}
      </div>
      <SectionTitle title="سلامت" />
      <Card className="space-y-2 text-xs leading-6">
        <div><span className="text-ink-400">آسیب‌دیدگی: </span>{u.health?.injuries || 'ثبت نشده'}</div>
        <div><span className="text-ink-400">بیماری/شرایط خاص: </span>{u.health?.conditions || 'ثبت نشده'}</div>
        <div><span className="text-ink-400">حساسیت غذایی: </span>{u.health?.allergies || 'ثبت نشده'}</div>
        {cyc && (
          <div className="flex items-center gap-2 rounded-xl bg-ink-900/[.04] p-2 dark:bg-white/[.05]">
            <span className="h-2 w-2 rounded-full" style={{ background: cyc.info.color }} />
            فاز {PHASES[cyc.phase].label} · شدت تمرین پیشنهادی: {cyc.info.intensity}
          </div>
        )}
      </Card>
      <SectionTitle title="تمرین‌های اخیر" />
      {workouts.length === 0 && <p className="text-xs text-ink-400">تمرینی ثبت نشده است.</p>}
      <div className="space-y-2">
        {workouts.map((w) => (
          <Card key={w.id} className="text-xs">
            <div className="flex justify-between font-medium">
              <span>{w.title}</span>
              <span className="text-ink-400">{faDate(w.day + 'T12:00')} · {num(w.durationMin)} دقیقه</span>
            </div>
            <div className="mt-1 text-ink-500">{w.exercises.map((e) => `${exerciseById(e.exerciseId)?.name} (${num(e.sets.length)} ست)`).join('، ')}</div>
          </Card>
        ))}
      </div>
      {weights.length > 0 && (
        <>
          <SectionTitle title="روند وزن" />
          <Card className="flex flex-wrap gap-3 text-xs">
            {weights.map((b) => (
              <span key={b.id}>
                {faDate(b.day + 'T12:00')}: <b>{num(b.weightKg!)}</b>
              </span>
            ))}
          </Card>
        </>
      )}
      <p className="mt-6 flex items-center gap-1.5 text-[11px] text-ink-400">
        <Lock size={11} /> این اطلاعات محرمانه است و کاربر هر زمان می‌تواند دسترسی را بردارد.
      </p>
    </div>
  )
}
