import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { EXERCISES, exerciseById } from '@/core/catalog'
import type { Program } from '@/core/types'
import { useDB } from '@/core/db'
import { faDateTime, toman } from '@/core/format'
import { deliverPlan } from '@/core/services/fityar'
import type { PlanOrder } from '@/core/types'
import { Avatar, Badge, Button, Card, Empty, Input, NumberInput, PageHeader, Select, Sheet, Tabs, Textarea } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

const TEMPLATE = `برنامه‌ی هفتگی
روز ۱ — 
روز ۲ — 
روز ۳ — 

تغذیه
صبحانه: 
ناهار: 
شام: 

نکات:
`

export default function CoachOrders() {
  const me = useMe()!
  const orders = useDB((s) => s.planOrders)
  const users = useUserMap()
  const [tab, setTab] = useState<'pending' | 'delivered'>('pending')
  const [open, setOpen] = useState<PlanOrder>()
  const [content, setContent] = useState('')
  const [program, setProgram] = useState<Program | null>(null)
  const allUsers = useDB((s) => s.users)
  const blankDay = () => ({ title: 'جلسه', exercises: [{ exerciseId: 'squat', sets: 3, reps: '10' }] })
  const newProgram = (weeks: number): Program => ({ weeks: [...Array(weeks)].map(() => ({ days: [blankDay(), blankDay(), blankDay()] })) })
  const list = orders.filter((o) => o.coachId === me.id && o.status === tab)

  return (
    <div className="animate-fade-up">
      <PageHeader title="سفارش برنامه‌ها" />
      <Tabs className="mb-4 max-w-sm" value={tab} onChange={setTab} items={[{ value: 'pending', label: 'در انتظار' }, { value: 'delivered', label: 'تحویل‌شده' }]} />
      {list.length === 0 && <Empty icon="" title="سفارشی در این بخش نیست" />}
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((o) => (
          <Card key={o.id}>
            <div className="flex items-center gap-3">
              <Avatar name={users[o.userId]?.name ?? ''} size={42} />
              <div className="flex-1">
                <div className="font-semibold">{users[o.userId]?.name}</div>
                <div className="text-xs text-ink-500">{o.title} · {toman(o.price)}</div>
              </div>
              <Badge color={o.status === 'pending' ? 'amber' : 'emerald'}>{o.status === 'pending' ? 'در انتظار' : 'تحویل شد'}</Badge>
            </div>
            <div className="mt-3 rounded-2xl bg-ink-50 p-3 text-xs leading-6 dark:bg-white/5">{o.answers}</div>
            {allUsers.find((u) => u.id === o.userId)?.healthShares?.includes(me.id) && (
              <Link to={`/client/${o.userId}`} className="mt-2 flex items-center gap-1 text-xs text-aqua-700 dark:text-aqua-300">
                <ShieldCheck size={13} /> پرونده‌ی سلامت شاگرد (اشتراک‌گذاری‌شده)
              </Link>
            )}
            {o.program && <div className="mt-2 text-[11px] text-ink-500">پایبندی: {(o.done?.length ?? 0).toLocaleString('fa-IR')} از {o.program.weeks.reduce((a, w) => a + w.days.length, 0).toLocaleString('fa-IR')} جلسه</div>}
            <div className="mt-2 text-[11px] text-ink-400">{faDateTime(o.createdAt)}</div>
            {o.status === 'pending' ? (
              <Button className="mt-3 w-full" onClick={() => { setOpen(o); setContent(TEMPLATE); setProgram(newProgram(Math.min(4, Math.max(1, 4)))) }}>نوشتن و تحویل برنامه</Button>
            ) : (
              <details className="mt-3 text-sm"><summary className="cursor-pointer text-xs font-semibold text-brand-600">مشاهده‌ی برنامه</summary><div className="mt-2 whitespace-pre-line leading-7">{o.content}</div></details>
            )}
          </Card>
        ))}
      </div>
      <Sheet open={!!open} onClose={() => setOpen(undefined)} title={`برنامه برای ${open ? users[open.userId]?.name : ''}`} wide>
        <div className="mb-3 flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={!!program} onChange={(e) => setProgram(e.target.checked ? newProgram(4) : null)} /> برنامه‌ی ساختاریافته (ورزشکار جلسات را تیک می‌زند و شما پایبندی را می‌بینید)
          </label>
        </div>
        {program && (
          <div className="mb-4 space-y-3">
            {program.weeks.map((wk, wi) => (
              <details key={wi} open={wi === 0} className="rounded-2xl bg-ink-900/[.03] p-3 dark:bg-white/[.04]">
                <summary className="cursor-pointer text-sm font-medium">هفته {(wi + 1).toLocaleString('fa-IR')}</summary>
                {wk.days.map((d, di) => {
                  const setDay = (patch: Partial<typeof d>) => setProgram({ ...program, weeks: program.weeks.map((x, a) => (a === wi ? { days: x.days.map((y, b) => (b === di ? { ...y, ...patch } : y)) } : x)) })
                  return (
                    <div key={di} className="mt-3 rounded-xl bg-white p-3 dark:bg-ink-850">
                      <div className="flex gap-2">
                        <Input value={d.title} onChange={(e) => setDay({ title: e.target.value })} placeholder="عنوان جلسه" />
                        <button className="text-coral-500" onClick={() => setProgram({ ...program, weeks: program.weeks.map((x, a) => (a === wi ? { days: x.days.filter((_, b) => b !== di) } : x)) })} aria-label="حذف جلسه"><Trash2 size={15} /></button>
                      </div>
                      {d.exercises.map((e, ei) => (
                        <div key={ei} className="mt-2 grid grid-cols-[1fr_4rem_4rem_2rem] gap-1.5">
                          <Select value={e.exerciseId} onChange={(ev) => setDay({ exercises: d.exercises.map((x, k) => (k === ei ? { ...x, exerciseId: ev.target.value } : x)) })}>
                            {EXERCISES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                          </Select>
                          <NumberInput value={e.sets} onChange={(v) => setDay({ exercises: d.exercises.map((x, k) => (k === ei ? { ...x, sets: v } : x)) })} placeholder="ست" />
                          <Input value={e.reps} onChange={(ev) => setDay({ exercises: d.exercises.map((x, k) => (k === ei ? { ...x, reps: ev.target.value } : x)) })} placeholder="تکرار" dir="ltr" />
                          <button className="text-ink-300" onClick={() => setDay({ exercises: d.exercises.filter((_, k) => k !== ei) })} aria-label="حذف"><Trash2 size={13} /></button>
                        </div>
                      ))}
                      <button className="mt-2 text-xs text-brand-600 dark:text-brand-300" onClick={() => setDay({ exercises: [...d.exercises, { exerciseId: 'pushup', sets: 3, reps: '12' }] })}>+ حرکت</button>
                      <Textarea rows={2} className="mt-2" value={d.meals ?? ''} onChange={(e) => setDay({ meals: e.target.value })} placeholder="تغذیه‌ی این روز (اختیاری)" />
                    </div>
                  )
                })}
                <div className="mt-2 flex gap-3 text-xs">
                  <button className="text-brand-600 dark:text-brand-300" onClick={() => setProgram({ ...program, weeks: program.weeks.map((x, a) => (a === wi ? { days: [...x.days, blankDay()] } : x)) })}>+ جلسه</button>
                  {wi > 0 && <button className="text-ink-500" onClick={() => setProgram({ ...program, weeks: program.weeks.map((x, a) => (a === wi ? { days: program.weeks[wi - 1].days.map((y) => ({ ...y })) } : x)) })}>کپی هفته‌ی قبل</button>}
                </div>
              </details>
            ))}
            <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => setProgram({ ...program, weeks: [...program.weeks, { days: program.weeks[program.weeks.length - 1].days.map((d) => ({ ...d })) }] })}>افزودن هفته</Button>
            <div className="text-[11px] text-ink-400">{program.weeks.length.toLocaleString('fa-IR')} هفته · حرکات: {[...new Set(program.weeks.flatMap((w) => w.days.flatMap((d) => d.exercises.map((e) => exerciseById(e.exerciseId)?.name))))].slice(0, 6).join('، ')}</div>
          </div>
        )}
        <Textarea rows={program ? 5 : 14} value={content} onChange={(e) => setContent(e.target.value)} placeholder="توضیحات و نکات برنامه" />
        <Button className="mt-3 w-full" onClick={async () => {
          const ok = await runOk(() => deliverPlan(open!.id, content, program ?? undefined), 'برنامه تحویل شد')
          if (ok) setOpen(undefined)
        }}>تحویل به ورزشکار</Button>
      </Sheet>
    </div>
  )
}
