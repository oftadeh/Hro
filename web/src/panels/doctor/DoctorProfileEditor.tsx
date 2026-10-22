import { useState } from 'react'
import { X } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime } from '@/core/format'
import { saveDoctorProfile } from '@/core/services/doctor'
import type { DoctorProfile } from '@/core/types'
import { Button, Card, Field, Input, NumberInput, PageHeader, Textarea } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { run } from '@/ui/toast'

export default function DoctorProfileEditor() {
  const me = useMe()!
  const doc = useDB((s) => s.doctors.find((d) => d.userId === me.id))
  const [f, setF] = useState<Partial<DoctorProfile>>(doc ?? {})
  const [slot, setSlot] = useState('')

  return (
    <div className="animate-fade-up">
      <PageHeader title="پروفایل و زمان‌بندی" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <Field label="تخصص"><Input value={f.specialty ?? ''} onChange={(e) => setF({ ...f, specialty: e.target.value })} /></Field>
          <Field label="کد نظام پزشکی"><Input value={f.medicalCode ?? ''} onChange={(e) => setF({ ...f, medicalCode: e.target.value })} /></Field>
          <Field label="هزینه‌ی ویزیت (تومان)"><NumberInput value={f.visitPrice ?? 0} onChange={(v) => setF({ ...f, visitPrice: v })} /></Field>
          <Field label="درباره"><Textarea value={f.bio ?? ''} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
          <Button className="w-full" onClick={() => run(() => saveDoctorProfile({ specialty: f.specialty, medicalCode: f.medicalCode, visitPrice: f.visitPrice, bio: f.bio }), 'ذخیره شد')}>ذخیره</Button>
        </Card>
        <Card className="space-y-3">
          <div className="font-semibold">نوبت‌های آزاد</div>
          <div className="flex gap-2">
            <Input type="datetime-local" value={slot} onChange={(e) => setSlot(e.target.value)} dir="ltr" />
            <Button variant="secondary" onClick={() => {
              if (!slot) return
              run(() => saveDoctorProfile({ slots: [...(doc?.slots ?? []), new Date(slot).toISOString()] }), 'نوبت اضافه شد')
              setSlot('')
            }}>افزودن</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(doc?.slots ?? []).map((s) => (
              <span key={s} className="flex items-center gap-1 rounded-xl bg-aqua-50 px-3 py-1.5 text-xs dark:bg-aqua-500/10">
                {faDateTime(s)}
                <button onClick={() => saveDoctorProfile({ slots: doc!.slots.filter((x) => x !== s) })} aria-label="حذف"><X size={12} /></button>
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
