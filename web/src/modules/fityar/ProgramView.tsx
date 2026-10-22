import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { Check, Play, Star } from 'lucide-react'
import { useDB } from '@/core/db'
import { num } from '@/core/format'
import { exerciseById } from '@/core/catalog'
import { reviewCoach, toggleProgramDay } from '@/core/services/fityar'
import { Button, Card, Empty, PageHeader, Progress, Sheet, Tabs, Textarea } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { run, runOk } from '@/ui/toast'

/** برنامه‌ی هفتگی مربی برای ورزشکار: انجام جلسه‌ها و شروع تمرین از روی برنامه */
export default function ProgramView() {
  const { id } = useParams()
  const me = useMe()!
  const nav = useNavigate()
  const o = useDB((s) => s.planOrders.find((x) => x.id === id))
  const users = useUserMap()
  const [week, setWeek] = useState('0')
  const [rv, setRv] = useState({ open: false, stars: 5, text: '' })
  if (!o || o.userId !== me.id) return <Empty title="برنامه یافت نشد" />
  if (!o.program)
    return (
      <div className="animate-fade-up">
        <PageHeader back="/fityar?tab=plans" title={o.title} />
        <Card className="whitespace-pre-line text-sm leading-7">{o.content || 'مربی هنوز برنامه را تحویل نداده است.'}</Card>
      </div>
    )
  const total = o.program.weeks.reduce((a, w) => a + w.days.length, 0)
  const done = o.done ?? []
  const w = Number(week)
  return (
    <div className="animate-fade-up">
      <PageHeader back="/fityar?tab=plans" title={o.title} subtitle={`مربی: ${users[o.coachId]?.name ?? ''}`} actions={<Button size="sm" variant="secondary" icon={<Star size={14} />} onClick={() => setRv({ ...rv, open: true })}>امتیاز به مربی</Button>} />
      <Card className="p-5">
        <div className="flex items-center justify-between text-sm">
          <span>پیشرفت برنامه</span>
          <span className="tabular-nums text-ink-500">{num(done.length)} از {num(total)} جلسه</span>
        </div>
        <Progress value={done.length / total} className="mt-2 h-2" tone="emerald" />
        {o.program.notes && <p className="mt-3 whitespace-pre-line text-xs leading-6 text-ink-500">{o.program.notes}</p>}
      </Card>
      <Tabs className="my-4" value={week} onChange={setWeek} items={o.program.weeks.map((_, i) => ({ value: String(i), label: `هفته ${num(i + 1)}` }))} />
      <div className="space-y-3">
        {o.program.weeks[w]?.days.map((d, i) => {
          const key = `${w}-${i}`
          const isDone = done.includes(key)
          return (
            <Card key={key} className={clsx(isDone && 'opacity-70')}>
              <div className="flex items-center gap-2">
                <button onClick={() => run(() => toggleProgramDay(o.id, w, i))} className={clsx('flex h-7 w-7 items-center justify-center rounded-full border-2', isDone ? 'border-aqua-400 bg-aqua-400 text-ink-950' : 'border-ink-200 dark:border-white/20')} aria-label="انجام شد">
                  {isDone && <Check size={14} />}
                </button>
                <span className="text-sm font-semibold">جلسه {num(i + 1)} — {d.title}</span>
                {!isDone && (
                  <Button size="sm" className="mr-auto" icon={<Play size={13} />} onClick={() => nav(`/workouts?program=${o.id}&w=${w}&d=${i}`)}>
                    شروع
                  </Button>
                )}
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                {d.exercises.map((e, k) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span>{exerciseById(e.exerciseId)?.name}</span>
                    <span className="tabular-nums text-ink-500">{num(e.sets)} × {e.reps}{e.note ? ` · ${e.note}` : ''}</span>
                  </div>
                ))}
              </div>
              {d.meals && <div className="mt-3 whitespace-pre-line rounded-2xl bg-ink-900/[.04] p-3 text-xs leading-6 dark:bg-white/[.05]">{d.meals}</div>}
            </Card>
          )
        })}
      </div>
      {o.content && (
        <details className="mt-4 rounded-3xl bg-white p-4 text-sm shadow-card dark:bg-ink-850 dark:shadow-none">
          <summary className="cursor-pointer text-xs font-medium">توضیحات مربی</summary>
          <div className="mt-2 whitespace-pre-line leading-7">{o.content}</div>
        </details>
      )}
      <p className="mt-4 text-center text-xs text-ink-500">
        سؤالی داری؟ <Link to="/messages" className="underline">با مربی گفتگو کن</Link>
      </p>
      <Sheet open={rv.open} onClose={() => setRv({ ...rv, open: false })} title="امتیاز به مربی">
        <div className="space-y-3">
          <div className="flex justify-center gap-2" dir="ltr">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRv({ ...rv, stars: s })}>
                <Star size={28} className={s <= rv.stars ? 'fill-gold-300 text-gold-300' : 'text-ink-300'} />
              </button>
            ))}
          </div>
          <Textarea rows={3} value={rv.text} onChange={(e) => setRv({ ...rv, text: e.target.value })} placeholder="تجربه‌ات از برنامه و پشتیبانی مربی" />
          <Button className="w-full" onClick={async () => { if (await runOk(() => reviewCoach(o.id, rv.stars, rv.text), 'ممنون!')) setRv({ open: false, stars: 5, text: '' }) }}>ثبت</Button>
        </div>
      </Sheet>
    </div>
  )
}
