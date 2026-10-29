import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Camera, Plus, Search, Trash2 } from 'lucide-react'
import { useDB } from '@/core/db'
import { dayKey, num } from '@/core/format'
import { FOOD_DB, MEAL_LABEL } from '@/core/catalog'
import { addMeal, dayNutrition, nutritionTarget, removeMeal } from '@/core/services/health'
import type { MealLog } from '@/core/types'
import { Button, Card, Donut, Field, Input, NumberInput, PageHeader, Progress, Sheet, Tabs } from '@/ui/kit'
import { SaladBowl } from '@/ui/art'
import { useMe } from '@/ui/hooks'
import { run, runOk, toast } from '@/ui/toast'
import { REMOTE, api } from '@/core/client/remote'
import { resizeImage } from '@/ui/kit'

type Meal = MealLog['meal']

export default function Nutrition() {
  const me = useMe()!
  const meals = useDB((s) => s.meals)
  const [offset, setOffset] = useState(0)
  const day = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - offset)
    return dayKey(d)
  }, [offset])
  const n = dayNutrition(me.id, day, { meals })
  const t = nutritionTarget(me)
  const [add, setAdd] = useState<Meal | null>(null)
  const left = t.kcal - n.kcal
  const label = offset === 0 ? 'امروز' : offset === 1 ? 'دیروز' : new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(day + 'T12:00'))

  return (
    <div className="animate-fade-up">
      <PageHeader back title="کالری‌شمار" subtitle="غذاهای ایرانی، سفارش‌های بوفه و ثبت دستی" />
      <div className="mb-4 flex items-center justify-between">
        <Button size="sm" variant="secondary" onClick={() => setOffset(offset + 1)}>روز قبل</Button>
        <span className="text-sm font-medium">{label}</span>
        <Button size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 1))}>روز بعد</Button>
      </div>
      <Card className="relative overflow-hidden p-5">
        <SaladBowl size={90} className="pointer-events-none absolute -bottom-2 left-2 opacity-80" />
        <div className="flex items-center gap-5">
          <Donut
            size={128}
            stroke={10}
            segments={[{ value: Math.min(1, n.kcal / t.kcal), color: n.kcal > t.kcal * 1.1 ? '#ff2f7d' : '#8a6bff' }, { value: Math.max(0, 1 - n.kcal / t.kcal), color: 'transparent' }]}
            center={
              <div className="text-center">
                <div className="font-display text-3xl leading-none">{num(Math.abs(left))}</div>
                <div className="text-[12px] text-ink-400">{left >= 0 ? 'کالری باقی‌مانده' : 'کالری اضافه'}</div>
              </div>
            }
          />
          <div className="min-w-0 flex-1 space-y-2.5 text-xs">
            {(
              [
                ['پروتئین', n.protein, t.protein, 'emerald'],
                ['کربوهیدرات', n.carbs, t.carbs, 'amber'],
                ['چربی', n.fat, t.fat, 'rose'],
              ] as const
            ).map(([l, v, g, tone]) => (
              <div key={l}>
                <div className="flex justify-between">
                  <span>{l}</span>
                  <span className="tabular-nums text-ink-500">{num(v)} / {num(g)} گرم</span>
                </div>
                <Progress value={v / g} className="mt-1" tone={tone} />
              </div>
            ))}
            <div className="text-[12px] text-ink-400">هدف روزانه: {num(t.kcal)} کالری{!t.estimated && ' (قد، وزن و جنسیت را در پروفایل وارد کنید)'}</div>
          </div>
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        {(Object.keys(MEAL_LABEL) as Meal[]).map((m) => {
          const items = n.meals.filter((x) => x.meal === m)
          return (
            <Card key={m}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{MEAL_LABEL[m]}</span>
                <span className="text-xs tabular-nums text-ink-500">{num(items.reduce((a, x) => a + x.kcal, 0))} کالری</span>
                <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => setAdd(m)}>افزودن</Button>
              </div>
              {items.map((x) => (
                <div key={x.id} className="mt-2 flex items-center gap-2 text-xs">
                  <span className="flex-1">{x.name} {x.qty !== 1 && `× ${num(x.qty)}`} {x.source === 'buffet' && <span className="text-aqua-600 dark:text-aqua-300">(بوفه)</span>}</span>
                  <span className="tabular-nums text-ink-500">{num(x.kcal)}</span>
                  <button className="text-ink-300 hover:text-coral-500" onClick={() => run(() => removeMeal(x.id))} aria-label="حذف"><Trash2 size={13} /></button>
                </div>
              ))}
            </Card>
          )
        })}
      </div>
      <p className="mt-4 text-center text-[12px] text-ink-400">
        سفارش‌های <Link to="/buffet" className="underline">بوفه</Link> پس از تحویل خودکار در کالری‌شمار ثبت می‌شوند.
      </p>
      <AddMealSheet meal={add} day={day} onClose={() => setAdd(null)} />
    </div>
  )
}

function AddMealSheet({ meal, day, onClose }: { meal: Meal | null; day: string; onClose: () => void }) {
  const [tab, setTab] = useState<'db' | 'custom' | 'photo'>('db')
  const [q, setQ] = useState('')
  const [qty, setQty] = useState<Record<string, number>>({})
  const [c, setC] = useState({ name: '', kcal: 0, protein: 0, carbs: 0, fat: 0 })
  const [busy, setBusy] = useState(false)
  const list = FOOD_DB.filter((f) => !q || f.name.includes(q))
  const done = () => {
    setQ('')
    onClose()
  }
  const photo = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const img = await resizeImage(file, 768)
      const r = await api<{ name: string; kcal: number; protein: number; carbs: number; fat: number }>('/ai/food-photo', { image: img })
      setC(r)
      setTab('custom')
      toast.info('تخمین از روی عکس آماده شد؛ در صورت نیاز اصلاح و ثبت کنید')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open={!!meal} onClose={done} title={meal ? `افزودن به ${MEAL_LABEL[meal]}` : ''}>
      <Tabs
        className="mb-3"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'db', label: 'غذاهای ایرانی' },
          { value: 'custom', label: 'ثبت دستی' },
          ...(REMOTE ? [{ value: 'photo' as const, label: 'از روی عکس' }] : []),
        ]}
      />
      {tab === 'db' && (
        <>
          <div className="relative mb-2">
            <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو: قورمه‌سبزی، نان سنگک…" className="pr-10" />
          </div>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto">
            {list.map((f) => {
              const k = qty[f.id] ?? 1
              return (
                <div key={f.id} className="flex items-center gap-2 rounded-2xl px-2 py-2 hover:bg-ink-900/[.03] dark:hover:bg-white/[.04]">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{f.name}</div>
                    <div className="text-[12px] text-ink-400">{f.unit} · {num(f.kcal)} کالری · {num(f.protein)}g پروتئین</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <button className={clsx('h-7 w-7 rounded-full bg-ink-900/[.05] dark:bg-white/[.06]')} onClick={() => setQty({ ...qty, [f.id]: Math.max(0.5, k - 0.5) })}>−</button>
                    <span className="w-6 text-center tabular-nums">{num(k)}</span>
                    <button className="h-7 w-7 rounded-full bg-ink-900/[.05] dark:bg-white/[.06]" onClick={() => setQty({ ...qty, [f.id]: k + 0.5 })}>+</button>
                  </div>
                  <Button size="sm" onClick={async () => { if (meal && (await runOk(() => addMeal({ day, meal, foodId: f.id, qty: k }), `${f.name} ثبت شد`))) done() }}>ثبت</Button>
                </div>
              )
            })}
          </div>
        </>
      )}
      {tab === 'custom' && (
        <div className="space-y-3">
          <Field label="نام غذا"><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="کالری"><NumberInput value={c.kcal} onChange={(v) => setC({ ...c, kcal: v })} /></Field>
            <Field label="پروتئین (گرم)"><NumberInput value={c.protein} onChange={(v) => setC({ ...c, protein: v })} /></Field>
            <Field label="کربوهیدرات (گرم)"><NumberInput value={c.carbs} onChange={(v) => setC({ ...c, carbs: v })} /></Field>
            <Field label="چربی (گرم)"><NumberInput value={c.fat} onChange={(v) => setC({ ...c, fat: v })} /></Field>
          </div>
          <Button className="w-full" onClick={async () => { if (meal && (await runOk(() => addMeal({ day, meal, ...c, source: 'custom' }), 'ثبت شد'))) done() }}>ثبت</Button>
        </div>
      )}
      {tab === 'photo' && (
        <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink-200 text-sm text-ink-500 dark:border-white/15">
          <Camera size={28} />
          {busy ? 'در حال تحلیل عکس…' : 'از بشقاب غذایت عکس بگیر'}
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => photo(e.target.files?.[0])} />
        </label>
      )}
    </Sheet>
  )
}
