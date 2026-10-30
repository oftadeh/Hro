import { useState } from 'react'
import { X } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime } from '@/core/format'
import { saveDoctorProfile } from '@/core/services/doctor'
import type { CareKind, DoctorProfile } from '@/core/types'
import { CARE_KINDS } from '@/core/config'
import { Button, Card, Chips, Field, Input, NumberInput, PageHeader, Select, Textarea } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { run, toast } from '@/ui/toast'

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
          <Field label="نوع خدمت">
            <Select value={f.kind ?? 'doctor'} onChange={(e) => setF({ ...f, kind: e.target.value as CareKind })}>
              {(Object.keys(CARE_KINDS) as CareKind[]).map((k) => <option key={k} value={k}>{CARE_KINDS[k].label} — {CARE_KINDS[k].desc}</option>)}
            </Select>
          </Field>
          <Field label="تخصص"><Input value={f.specialty ?? ''} onChange={(e) => setF({ ...f, specialty: e.target.value })} /></Field>
          <div className={`rounded-2xl p-3 text-xs ${doc?.verified ? 'bg-aqua-400/10' : 'bg-gold-300/15'}`}>
            {doc?.verified ? 'مدارک شما تأیید شده و به ورزشکاران نمایش داده می‌شوید.' : `مدارک شما در انتظار استعلام است (${CARE_KINDS[f.kind ?? 'doctor'].license})؛ پس از تأیید مدیر نمایش داده می‌شوید.`}
          </div>
          <Field label={CARE_KINDS[f.kind ?? 'doctor'].license}><Input value={f.medicalCode ?? ''} onChange={(e) => setF({ ...f, medicalCode: e.target.value })} /></Field>
          {(f.kind ?? 'doctor') !== 'massage' && (
            <Field label="نحوه‌ی ارائه">
              <Chips value={f.mode ?? 'online'} onChange={(v) => setF({ ...f, mode: v })} items={[{ value: 'online', label: 'آنلاین' }, { value: 'inperson', label: 'حضوری' }, { value: 'both', label: 'هر دو' }]} />
            </Field>
          )}
          {((f.kind ?? 'doctor') === 'massage' || f.mode === 'inperson' || f.mode === 'both') && (
            <Field label="نشانی مطب / کلینیک"><Input value={f.address ?? ''} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          )}
          <Field label="هزینه‌ی هر جلسه (تومان)"><NumberInput value={f.visitPrice ?? 0} onChange={(v) => setF({ ...f, visitPrice: v })} /></Field>
          <Field label="درباره" hint="حداقل ۲۰ حرف: سوابق و حوزه‌ی کار"><Textarea value={f.bio ?? ''} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
          <Button className="w-full" onClick={() => run(() => saveDoctorProfile({ kind: f.kind ?? 'doctor', mode: f.mode ?? 'online', address: f.address ?? '', specialty: f.specialty, medicalCode: f.medicalCode, visitPrice: f.visitPrice, bio: f.bio }), 'ذخیره شد')}>ذخیره</Button>
        </Card>
        <Card className="space-y-3">
          <div className="font-semibold">نوبت‌های آزاد</div>
          <div className="flex gap-2">
            <Input type="datetime-local" value={slot} onChange={(e) => setSlot(e.target.value)} dir="ltr" />
            <Button variant="secondary" onClick={() => {
              if (!slot) return
              if (new Date(slot) <= new Date()) return void toast.error('زمان نوبت باید در آینده باشد')
              run(() => saveDoctorProfile({ slots: [...(doc?.slots ?? []), new Date(slot).toISOString()] }), 'نوبت اضافه شد')
              setSlot('')
            }}>افزودن</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(doc?.slots ?? []).map((s) => (
              <span key={s} className="flex items-center gap-1 rounded-xl bg-aqua-50 px-3 py-1.5 text-xs dark:bg-aqua-500/10">
                {faDateTime(s)}
                <button onClick={() => run(() => saveDoctorProfile({ slots: doc!.slots.filter((x) => x !== s) }))} aria-label="حذف"><X size={12} /></button>
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
