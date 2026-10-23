import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Dumbbell, HeartPulse, Plus, Search, Trash2, Trophy } from 'lucide-react'
import { bluetoothSupported, connectHeartRate } from '@/core/client/health'
import { connectDevice } from '@/core/services/devices'
import { useDB } from '@/core/db'
import { dayKey, faDate, num } from '@/core/format'
import { EXERCISES, EQUIPMENT_LABEL, MUSCLE_LABEL, exerciseById, type Muscle } from '@/core/catalog'
import { deleteWorkout, logWorkout, personalRecords, volumeOf } from '@/core/services/health'
import type { WorkoutSet } from '@/core/types'
import { Button, Card, Empty, Field, Input, NumberInput, PageHeader, Sheet, Tabs } from '@/ui/kit'
import { Lifter } from '@/ui/art'
import { useMe } from '@/ui/hooks'
import { run, runOk, toast } from '@/ui/toast'

type Draft = { title: string; durationMin: number; exercises: { exerciseId: string; sets: WorkoutSet[] }[]; program?: { orderId: string; week: number; day: number } }
const empty = (): Draft => ({ title: '', durationMin: 45, exercises: [] })

export default function Workouts() {
  const me = useMe()!
  const all = useDB((s) => s.workouts)
  const planOrders = useDB((s) => s.planOrders)
  const workouts = useMemo(() => all.filter((w) => w.userId === me.id).sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt)), [all, me.id])
  const prs = useMemo(() => personalRecords(me.id, { workouts: all }), [all, me.id])
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'log' | 'records' | 'library'>('log')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [pick, setPick] = useState(false)
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all')
  // ضربان قلب زنده از سنسور بلوتوث در طول تمرین
  const [bpm, setBpm] = useState<number>()
  const hrSamples = useRef<number[]>([])
  const hrConn = useRef<{ disconnect: () => void }>(undefined)
  useEffect(() => () => hrConn.current?.disconnect(), [])
  const startHr = async () => {
    try {
      const c = await connectHeartRate((b) => { setBpm(b); hrSamples.current.push(b) }, () => { setBpm(undefined); hrConn.current = undefined })
      hrConn.current = c
      hrSamples.current = []
      connectDevice('hr_monitor', c.name).catch(() => {})
    } catch (e) {
      if ((e as Error).name !== 'NotFoundError') toast.error((e as Error).message)
    }
  }
  const hrSummary = () => {
    const xs = hrSamples.current
    return xs.length >= 5 ? { avg: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), max: Math.max(...xs) } : undefined
  }

  // شروع تمرین از روی برنامه‌ی مربی
  useEffect(() => {
    const id = params.get('program')
    if (!id) return
    const o = planOrders.find((x) => x.id === id && x.userId === me.id)
    const w = Number(params.get('w'))
    const d = Number(params.get('d'))
    const day = o?.program?.weeks[w]?.days[d]
    if (day) {
      setDraft({
        title: day.title,
        durationMin: 50,
        program: { orderId: id, week: w, day: d },
        exercises: day.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: [...Array(e.sets)].map(() => ({ reps: parseInt(e.reps) || 10, weight: 0 })) })),
      })
    }
    setParams({}, { replace: true })
  }, [params, planOrders, me.id, setParams])

  const week = workouts.filter((w) => new Date(w.day + 'T12:00').getTime() > Date.now() - 7 * 86_400_000)
  const lib = EXERCISES.filter((e) => (muscle === 'all' || e.muscle === muscle) && (!q || e.name.includes(q)))
  const up = (fn: (d: Draft) => Draft) => setDraft((d) => (d ? fn(d) : d))

  return (
    <div className="animate-fade-up">
      <PageHeader back title="تمرین‌های من" subtitle="ثبت ست‌ها، رکوردهای شخصی و کتابخانه‌ی حرکات" actions={<Button size="sm" icon={<Plus size={15} />} onClick={() => setDraft(empty())}>ثبت تمرین</Button>} />
      <div className="relative mb-4 overflow-hidden rounded-[2rem] grad-lavender p-5 text-ink-950">
        <Lifter size={120} className="pointer-events-none absolute -bottom-3 left-2" />
        <div className="relative max-w-[60%]">
          <div className="text-xs opacity-60">۷ روز اخیر</div>
          <div className="mt-1 font-display text-[2.4rem] leading-none">{num(week.length)} جلسه</div>
          <div className="mt-2 text-xs opacity-70">
            {num(week.reduce((a, w) => a + w.durationMin, 0))} دقیقه · حجم {num(week.reduce((a, w) => a + volumeOf(w), 0))} کیلوگرم
          </div>
        </div>
      </div>
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ value: 'log', label: 'سابقه' }, { value: 'records', label: 'رکوردها' }, { value: 'library', label: 'حرکات' }]} />

      {tab === 'log' &&
        (workouts.length ? (
          <div className="space-y-3">
            {workouts.map((w) => (
              <Card key={w.id}>
                <div className="flex items-center gap-2">
                  <Dumbbell size={16} className="text-ink-400" />
                  <span className="text-sm font-semibold">{w.title}</span>
                  <span className="text-[11px] text-ink-400">{faDate(w.day + 'T12:00')} · {num(w.durationMin)} دقیقه{w.hr ? ` · ❤ ${num(w.hr.avg)}/${num(w.hr.max)}` : ''}</span>
                  <button className="mr-auto text-ink-300 hover:text-coral-500" onClick={() => confirm('این تمرین حذف شود؟') && run(() => deleteWorkout(w.id))} aria-label="حذف"><Trash2 size={14} /></button>
                </div>
                <div className="mt-2 space-y-1 text-xs text-ink-500">
                  {w.exercises.map((e) => (
                    <div key={e.exerciseId} className="flex justify-between gap-2">
                      <span>{exerciseById(e.exerciseId)?.name}</span>
                      <span className="tabular-nums" dir="ltr">{e.sets.map((s) => (s.weight ? `${s.weight}×${s.reps}` : `${s.reps}`)).join('  ')}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="هنوز تمرینی ثبت نکرده‌ای" desc="هر جلسه را ثبت کن تا رکوردها و پیشرفتت را ببینی." action={<Button size="sm" onClick={() => setDraft(empty())}>اولین تمرین</Button>} />
        ))}

      {tab === 'records' &&
        (Object.keys(prs).length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(prs).map(([id, r]) => (
              <Card key={id} className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl grad-peach text-ink-950"><Trophy size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{exerciseById(id)?.name}</div>
                  <div className="text-[11px] text-ink-500">{num(r.weight)} کیلو × {num(r.reps)} · {faDate(r.day + 'T12:00')}</div>
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-ink-400">۱RM تخمینی</div>
                  <div className="font-display text-2xl leading-none">{num(r.oneRm)}</div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="رکوردی ثبت نشده" desc="با ثبت حرکات وزنه‌ای، رکورد و یک‌تکرار بیشینه‌ی تخمینی‌ات اینجا نمایش داده می‌شود." />
        ))}

      {tab === 'library' && (
        <>
          <ExerciseFilter q={q} setQ={setQ} muscle={muscle} setMuscle={setMuscle} />
          <div className="grid gap-2 sm:grid-cols-2">
            {lib.map((e) => (
              <Card key={e.id}>
                <div className="flex items-center justify-between text-sm font-medium">
                  {e.name}
                  <span className="text-[10px] font-normal text-ink-400">{MUSCLE_LABEL[e.muscle]} · {EQUIPMENT_LABEL[e.equipment]}</span>
                </div>
                <p className="mt-1 text-xs leading-6 text-ink-500">{e.cue}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      <Sheet open={!!draft} onClose={() => setDraft(null)} title="ثبت تمرین" wide>
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="عنوان"><Input value={draft.title} onChange={(e) => up((d) => ({ ...d, title: e.target.value }))} placeholder="مثلاً پا و باسن" /></Field>
              <Field label="مدت (دقیقه)"><NumberInput value={draft.durationMin} onChange={(v) => up((d) => ({ ...d, durationMin: v }))} /></Field>
            </div>
            {bluetoothSupported() && (
              <div className="flex items-center gap-2 rounded-2xl bg-coral-400/10 p-3 text-xs">
                <HeartPulse size={16} className="text-coral-500" />
                {bpm ? <span><b className="font-display text-xl tabular-nums">{num(bpm)}</b> ضربان در دقیقه — میانگین و بیشینه با تمرین ذخیره می‌شود</span> : <span className="flex-1">سنسور ضربان قلب داری؟ وصلش کن.</span>}
                {!bpm && <Button size="sm" variant="secondary" onClick={startHr}>اتصال</Button>}
              </div>
            )}
            {draft.exercises.map((ex, i) => (
              <div key={i} className="rounded-2xl bg-ink-900/[.03] p-3 dark:bg-white/[.04]">
                <div className="mb-2 flex items-center justify-between text-sm font-medium">
                  {exerciseById(ex.exerciseId)?.name}
                  <button className="text-ink-300 hover:text-coral-500" onClick={() => up((d) => ({ ...d, exercises: d.exercises.filter((_, j) => j !== i) }))} aria-label="حذف حرکت"><Trash2 size={14} /></button>
                </div>
                {ex.sets.map((st, k) => (
                  <div key={k} className="mb-1.5 grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 text-xs">
                    <span className="text-center text-ink-400">{num(k + 1)}</span>
                    <NumberInput value={st.weight} onChange={(v) => up((d) => ({ ...d, exercises: d.exercises.map((x, j) => (j === i ? { ...x, sets: x.sets.map((y, m) => (m === k ? { ...y, weight: v } : y)) } : x)) }))} placeholder="وزنه (کیلو)" />
                    <NumberInput value={st.reps} onChange={(v) => up((d) => ({ ...d, exercises: d.exercises.map((x, j) => (j === i ? { ...x, sets: x.sets.map((y, m) => (m === k ? { ...y, reps: v } : y)) } : x)) }))} placeholder="تکرار" />
                    <button className="text-ink-300 hover:text-coral-500" onClick={() => up((d) => ({ ...d, exercises: d.exercises.map((x, j) => (j === i ? { ...x, sets: x.sets.filter((_, m) => m !== k) } : x)) }))} aria-label="حذف ست"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button className="mt-1 text-xs text-brand-600 dark:text-brand-300" onClick={() => up((d) => ({ ...d, exercises: d.exercises.map((x, j) => (j === i ? { ...x, sets: [...x.sets, { ...(x.sets[x.sets.length - 1] ?? { reps: 10, weight: 0 }) }] } : x)) }))}>
                  + افزودن ست
                </button>
              </div>
            ))}
            <Button variant="secondary" className="w-full" icon={<Plus size={15} />} onClick={() => setPick(true)}>افزودن حرکت</Button>
            <Button
              className="w-full"
              size="lg"
              onClick={async () => {
                if (await runOk(() => logWorkout({ day: dayKey(), title: draft.title || 'تمرین', durationMin: draft.durationMin, exercises: draft.exercises, program: draft.program, hr: hrSummary() }), 'تمرین ثبت شد؛ +۲۵ امتیاز')) setDraft(null)
              }}
            >
              پایان و ثبت تمرین
            </Button>
          </div>
        )}
      </Sheet>
      <Sheet open={pick} onClose={() => setPick(false)} title="انتخاب حرکت">
        <ExerciseFilter q={q} setQ={setQ} muscle={muscle} setMuscle={setMuscle} />
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {lib.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                up((d) => ({ ...d, exercises: [...d.exercises, { exerciseId: e.id, sets: [{ reps: 10, weight: 0 }, { reps: 10, weight: 0 }, { reps: 10, weight: 0 }] }] }))
                setPick(false)
              }}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-right text-sm hover:bg-ink-900/[.04] dark:hover:bg-white/[.05]"
            >
              {e.name}
              <span className="text-[10px] text-ink-400">{MUSCLE_LABEL[e.muscle]}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}

function ExerciseFilter({ q, setQ, muscle, setMuscle }: { q: string; setQ: (v: string) => void; muscle: Muscle | 'all'; setMuscle: (m: Muscle | 'all') => void }) {
  return (
    <div className="mb-3 space-y-2">
      <div className="relative">
        <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی حرکت" className="pr-10" />
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar">
        {(['all', ...Object.keys(MUSCLE_LABEL)] as (Muscle | 'all')[]).map((m) => (
          <button key={m} onClick={() => setMuscle(m)} className={clsx('shrink-0 rounded-full px-3 py-1.5 text-xs', muscle === m ? 'grad-lavender text-ink-950' : 'bg-ink-900/[.05] dark:bg-white/[.06]')}>
            {m === 'all' ? 'همه' : MUSCLE_LABEL[m]}
          </button>
        ))}
      </div>
    </div>
  )
}
