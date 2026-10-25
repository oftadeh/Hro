import { useMemo, useState } from 'react'
import { Moon, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDate, num } from '@/core/format'
import { addBodyEntry, deleteBodyEntry, healthScore, sleepLog, weeklySummary } from '@/core/services/health'
import { weeklyReview } from '@/core/services/ai'
import type { BodyEntry } from '@/core/types'
import { Button, Card, Field, ImagePicker, NumberInput, PageHeader, SectionTitle, Sheet } from '@/ui/kit'
import { LineChart } from '@/ui/LineChart'
import { WeekBars } from '@/ui/WeekBars'
import { useMe } from '@/ui/hooks'
import { run, runOk } from '@/ui/toast'
import { HealthScoreCard } from './HealthScore'
import { dayKey } from '@/core/format'

const fmtDay = (d: string) => new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(new Date(d + 'T12:00'))

export default function Progress() {
  const me = useMe()!
  const state = useDB((s) => s)
  const entries = useMemo(() => state.bodyEntries.filter((b) => b.userId === me.id).sort((a, b) => a.day.localeCompare(b.day)), [state.bodyEntries, me.id])
  const week = weeklySummary(me.id, state)
  const [add, setAdd] = useState(false)
  const [f, setF] = useState<Partial<BodyEntry>>({})
  const [review, setReview] = useState<string>()
  const [loading, setLoading] = useState(false)
  const today = state.dailyLogs.find((l) => l.userId === me.id && l.day === dayKey())
  const weights = entries.filter((e) => e.weightKg).map((e) => ({ label: fmtDay(e.day), value: e.weightKg! }))
  const waists = entries.filter((e) => e.waistCm).map((e) => ({ label: fmtDay(e.day), value: e.waistCm! }))
  const photos = entries.filter((e) => e.photo)
  const inbody = entries.filter((e) => e.source === 'inbody' || (e.bodyFatPct && e.muscleKg))
  const scores = week.days.map((d, i) => ({ label: new Intl.DateTimeFormat('fa-IR', { weekday: 'narrow' }).format(new Date(d + 'T12:00')), value: week.scores[i], today: i === 6 }))

  return (
    <div className="animate-fade-up">
      <PageHeader back title="پیشرفت من" subtitle="نمره‌ی سلامت، وزن، اندازه‌ها و عکس‌های پیشرفت" actions={<Button size="sm" icon={<Plus size={15} />} onClick={() => { setF({}); setAdd(true) }}>ثبت اندازه</Button>} />
      <HealthScoreCard userId={me.id} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">نمره‌ی سلامت ۷ روز اخیر</span>
            <span className="text-xs text-ink-500">میانگین {num(week.avgScore)}</span>
          </div>
          <WeekBars data={scores} max={100} />
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm font-medium">
            مرور هفتگی هوشمند
            <Button size="sm" variant="secondary" icon={<Sparkles size={14} />} disabled={loading} onClick={async () => { setLoading(true); const r = await run(() => weeklyReview()); setLoading(false); if (r) setReview(r.text) }}>
              {loading ? 'در حال تحلیل…' : 'تحلیل هفته'}
            </Button>
          </div>
          {review ? (
            <div className="whitespace-pre-line text-xs leading-7 text-ink-600 dark:text-ink-300">{review.replace(/\*\*/g, '')}</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                ['جلسه تمرین', num(week.sessions)],
                ['میانگین قدم', num(week.avgSteps)],
                ['میانگین خواب', `${num(week.avgSleep)} ساعت`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-ink-900/[.04] p-3 dark:bg-white/[.05]">
                  <div className="text-[12px] text-ink-400">{l}</div>
                  <div className="mt-1 text-sm font-semibold">{v}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 flex items-center gap-3 p-4">
        <Moon size={18} className="text-brand-500" />
        <span className="flex-1 text-sm">خواب دیشب: {today?.sleepHours ? `${num(today.sleepHours)} ساعت` : 'ثبت نشده'}</span>
        {[6, 7, 8].map((h) => (
          <Button key={h} size="sm" variant={today?.sleepHours === h ? 'primary' : 'secondary'} onClick={() => run(() => sleepLog(h))}>
            {num(h)}
          </Button>
        ))}
      </Card>

      {inbody.length > 0 && (
        <>
          <SectionTitle title="آنالیز ترکیب بدن (InBody)" action={<span className="text-[12px] text-ink-400">{state.gyms.find((g) => g.id === inbody[inbody.length - 1].gymId)?.name}</span>} />
          <Card>
            <div className="grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ['bodyFatPct', 'چربی', '٪', true],
                  ['muscleKg', 'عضله', 'کیلو', false],
                  ['visceralFat', 'چربی احشایی', '', true],
                  ['bmr', 'متابولیسم پایه', 'kcal', false],
                  ['waterPct', 'آب بدن', '٪', false],
                  ['weightKg', 'وزن', 'کیلو', true],
                ] as const
              ).map(([k, label, unit, lowerBetter]) => {
                const last = inbody[inbody.length - 1][k]
                const prev = inbody.length > 1 ? inbody[inbody.length - 2][k] : undefined
                const diff = last !== undefined && prev !== undefined ? Math.round((last - prev) * 10) / 10 : undefined
                const good = diff !== undefined && diff !== 0 && (lowerBetter ? diff < 0 : diff > 0)
                return (
                  <div key={k} className="rounded-2xl bg-ink-900/[.03] p-2.5 dark:bg-white/[.04]">
                    <div className="text-[12px] text-ink-400">{label}</div>
                    <div className="mt-0.5 font-display text-xl tabular-nums">{last !== undefined ? last.toLocaleString('fa-IR') : '—'}<span className="text-[12px] text-ink-400"> {unit}</span></div>
                    {diff !== undefined && diff !== 0 && <div className={`text-[12px] ${good ? 'text-aqua-600' : 'text-coral-500'}`}>{diff > 0 ? '+' : ''}{diff.toLocaleString('fa-IR')}</div>}
                  </div>
                )
              })}
            </div>
            {inbody.length > 1 && <div className="mt-2 text-[12px] text-ink-400">مقایسه با آنالیز {faDate(inbody[inbody.length - 2].day + 'T12:00')}</div>}
          </Card>
        </>
      )}

      <SectionTitle title="روند وزن" action={week.weightChange !== undefined ? <span className="text-xs text-ink-500">{week.weightChange > 0 ? '+' : ''}{num(week.weightChange)} کیلو</span> : undefined} />
      <Card className="p-4">
        <LineChart data={weights} format={(n) => n.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} />
      </Card>
      {waists.length > 1 && (
        <>
          <SectionTitle title="دور کمر" />
          <Card className="p-4">
            <LineChart data={waists} color="#4ff3da" format={(n) => n.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} />
          </Card>
        </>
      )}

      {photos.length > 0 && (
        <>
          <SectionTitle title="عکس‌های پیشرفت" />
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                <img src={p.photo} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded-full bg-black/50 px-2 py-0.5 text-[12px] text-white">{faDate(p.day + 'T12:00')}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle title="ثبت‌ها" />
      <Card className="px-4 py-1">
        {[...entries].reverse().map((e) => (
          <div key={e.id} className="flex items-center gap-3 border-b hairline py-2.5 text-xs last:border-0">
            <span className="w-20 text-ink-500">{faDate(e.day + 'T12:00')}</span>
            <span className="flex-1">
              {[e.source === 'inbody' && 'InBody', e.weightKg && `وزن ${num(e.weightKg)}`, e.waistCm && `کمر ${num(e.waistCm)}`, e.bodyFatPct && `چربی ${num(e.bodyFatPct)}٪`, e.muscleKg && `عضله ${num(e.muscleKg)}`, e.photo && 'عکس'].filter(Boolean).join(' · ')}
            </span>
            <button className="text-ink-300 hover:text-coral-500" onClick={() => run(() => deleteBodyEntry(e.id))} aria-label="حذف"><Trash2 size={13} /></button>
          </div>
        ))}
        {entries.length === 0 && <div className="py-6 text-center text-xs text-ink-400">هنوز اندازه‌ای ثبت نشده است</div>}
      </Card>

      <Sheet open={add} onClose={() => setAdd(false)} title="ثبت اندازه‌های بدن">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['weightKg', 'وزن (کیلو)'],
                ['waistCm', 'دور کمر (سانتی‌متر)'],
                ['hipCm', 'دور باسن'],
                ['chestCm', 'دور سینه'],
                ['armCm', 'دور بازو'],
                ['bodyFatPct', 'درصد چربی'],
                ['muscleKg', 'وزن عضله (InBody)'],
                ['visceralFat', 'چربی احشایی'],
              ] as const
            ).map(([k, l]) => (
              <Field key={k} label={l}>
                <NumberInput value={(f[k] as number) ?? 0} onChange={(v) => setF({ ...f, [k]: v || undefined })} />
              </Field>
            ))}
          </div>
          <ImagePicker value={f.photo} onChange={(v) => setF({ ...f, photo: v })} label="عکس پیشرفت (خصوصی)" />
          <Button className="w-full" onClick={async () => { if (await runOk(() => addBodyEntry({ day: dayKey(), ...f }), 'ثبت شد')) setAdd(false) }}>
            ذخیره
          </Button>
        </div>
      </Sheet>
      <p className="mt-6 text-center text-[12px] text-ink-400">{healthScore(me.id, undefined, state).parts.map((p) => p.hint).slice(0, 2).join(' · ')}</p>
    </div>
  )
}
