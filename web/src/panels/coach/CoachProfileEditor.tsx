import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useDB } from '@/core/db'
import { uid } from '@/core/id'
import { toman } from '@/core/format'
import { saveCoachProfile } from '@/core/services/fityar'
import type { CoachPlan, CoachProfile } from '@/core/types'
import { Button, Card, Field, Input, NumberInput, PageHeader, SectionTitle, Select, Textarea } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { run } from '@/ui/toast'

const split = (s: string) => s.split(/[،,]/).map((x) => x.trim()).filter(Boolean)

export default function CoachProfileEditor() {
  const me = useMe()!
  const coach = useDB((s) => s.coaches.find((c) => c.userId === me.id))
  const [f, setF] = useState<Partial<CoachProfile>>(coach ?? {})
  const [specs, setSpecs] = useState((coach?.specialties ?? []).join('، '))
  const [certs, setCerts] = useState((coach?.certificates ?? []).join('، '))
  const [plan, setPlan] = useState<CoachPlan>({ id: '', title: '', kind: 'workout', price: 300_000, durationWeeks: 4, description: '' })
  const plans = f.plans ?? []

  return (
    <div className="animate-fade-up">
      <PageHeader title="پروفایل و پکیج‌ها" subtitle="این اطلاعات در ماژول فیت‌یار به کاربران نمایش داده می‌شود" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <Field label="عنوان تخصصی"><Input value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="مربی بدنسازی و فیتنس" /></Field>
          <Field label="درباره‌ی من"><Textarea value={f.bio ?? ''} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="سابقه (سال)"><NumberInput value={f.experienceYears ?? 0} onChange={(v) => setF({ ...f, experienceYears: v })} /></Field>
            <Field label="هزینه‌ی تماس ۳۰ دقیقه (تومان)"><NumberInput value={f.callPrice ?? 0} onChange={(v) => setF({ ...f, callPrice: v })} /></Field>
          </div>
          <Field label="تخصص‌ها" hint="با ویرگول جدا کنید"><Input value={specs} onChange={(e) => setSpecs(e.target.value)} /></Field>
          <Field label="مدارک" hint="با ویرگول جدا کنید"><Input value={certs} onChange={(e) => setCerts(e.target.value)} /></Field>
          <Button className="w-full" onClick={() => run(() => saveCoachProfile({ ...f, specialties: split(specs), certificates: split(certs) }), 'پروفایل ذخیره شد')}>ذخیره‌ی پروفایل</Button>
        </Card>
        <div className="space-y-4">
          <Card>
            <SectionTitle title="پکیج‌های فعال" />
            {plans.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-ink-100 py-2 last:border-0 dark:border-white/5">
                <div className="flex-1">
                  <div className="text-sm font-bold">{p.title}</div>
                  <div className="text-xs text-ink-500">{toman(p.price)} · {p.durationWeeks} هفته</div>
                </div>
                <button onClick={() => { const next = plans.filter((x) => x.id !== p.id); setF({ ...f, plans: next }); saveCoachProfile({ plans: next }) }} className="text-ink-400 hover:text-rose-500" aria-label="حذف"><Trash2 size={16} /></button>
              </div>
            ))}
          </Card>
          <Card className="space-y-3">
            <div className="font-extrabold">پکیج جدید</div>
            <Field label="عنوان"><Input value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="نوع">
                <Select value={plan.kind} onChange={(e) => setPlan({ ...plan, kind: e.target.value as CoachPlan['kind'] })}>
                  <option value="workout">تمرینی</option><option value="diet">تغذیه</option><option value="both">هر دو</option>
                </Select>
              </Field>
              <Field label="قیمت"><NumberInput value={plan.price} onChange={(v) => setPlan({ ...plan, price: v })} /></Field>
              <Field label="هفته"><NumberInput value={plan.durationWeeks} onChange={(v) => setPlan({ ...plan, durationWeeks: v })} /></Field>
            </div>
            <Field label="توضیحات"><Textarea rows={2} value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} /></Field>
            <Button variant="secondary" className="w-full" icon={<Plus size={16} />} onClick={() => {
              if (!plan.title.trim() || !plan.price) return
              const next = [...plans, { ...plan, id: uid('cp-') }]
              setF({ ...f, plans: next })
              run(() => saveCoachProfile({ plans: next }), 'پکیج اضافه شد')
              setPlan({ ...plan, title: '', description: '' })
            }}>افزودن پکیج</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
