import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Baby, Pencil, Plus, Trash2 } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, num } from '@/core/format'
import { FAMILY_MAX, RELATION_LABEL, ageOf, removeFamilyMember, saveFamilyMember } from '@/core/services/family'
import type { FamilyMember } from '@/core/types'
import { Avatar, Badge, Button, Card, Chips, Empty, Field, Input, NumberInput, PageHeader, SectionTitle, Select, Sheet, Textarea } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { run, runOk, ask } from '@/ui/toast'

type Draft = Omit<FamilyMember, 'id'> & { id?: string }
const blank: Draft = { name: '', relation: 'child', birthYear: 1398, gender: 'female', notes: '' }

/** اعضای خانواده و کلاس‌های کودکان */
export default function Family() {
  const me = useMe()!
  const checkins = useDB((s) => s.checkins)
  const gyms = useDB((s) => s.gyms)
  const family = me.family ?? []
  const [f, setF] = useState<Draft | null>(null)
  const kidsTickets = checkins.filter((c) => c.userId === me.id && c.memberId && c.status === 'active').sort((a, b) => (a.slotAt ?? '').localeCompare(b.slotAt ?? ''))
  const kidsGyms = gyms.filter((g) => g.approved && g.classes?.some((c) => c.audience === 'kids')).length

  return (
    <div className="animate-fade-up">
      <PageHeader back title="خانواده" subtitle="رزرو کلاس شنا، رزمی و ژیمناستیک برای فرزندان با حساب خودتان" actions={family.length < FAMILY_MAX && <Button size="sm" icon={<Plus size={15} />} onClick={() => setF({ ...blank })}>افزودن</Button>} />
      {family.length === 0 ? (
        <Empty title="هنوز عضوی اضافه نکرده‌اید" desc="فرزندتان را اضافه کنید تا کلاس‌های کودکان متناسب با سنش را ببینید." action={<Button icon={<Plus size={15} />} onClick={() => setF({ ...blank })}>افزودن عضو خانواده</Button>} />
      ) : (
        <div className="space-y-2">
          {family.map((m) => (
            <Card key={m.id} className="flex items-center gap-3">
              <Avatar name={m.name} size={44} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="text-xs text-ink-500">{RELATION_LABEL[m.relation]} · {num(ageOf(m.birthYear))} ساله · {m.gender === 'female' ? 'دختر/خانم' : 'پسر/آقا'}</div>
                {m.notes && <div className="mt-0.5 truncate text-[12px] text-ink-400">{m.notes}</div>}
              </div>
              <button onClick={() => setF({ ...m })} className="p-2 text-ink-400" aria-label="ویرایش"><Pencil size={15} /></button>
              <button onClick={async () => (await ask(`${m.name} حذف شود؟`)) && run(() => removeFamilyMember(m.id))} className="p-2 text-ink-400" aria-label="حذف"><Trash2 size={15} /></button>
            </Card>
          ))}
        </div>
      )}

      <Link to="/fityab?kids=1">
        <Card className="mt-4 flex items-center gap-3 grad-peach text-ink-950">
          <Baby size={28} />
          <div className="flex-1">
            <div className="font-semibold">کلاس‌های کودکان</div>
            <div className="text-xs opacity-70">{num(kidsGyms)} مجموعه با کلاس ویژه‌ی کودکان (شنا، رزمی و…)</div>
          </div>
        </Card>
      </Link>

      {kidsTickets.length > 0 && (
        <>
          <SectionTitle title="رزروهای خانواده" />
          <div className="space-y-2">
            {kidsTickets.map((t) => {
              const g = gyms.find((x) => x.id === t.gymId)
              return (
                <Link key={t.id} to={`/tickets?t=${t.id}`}>
                  <Card className="flex items-center gap-3">
                    <Badge color="violet">{t.memberName}</Badge>
                    <div className="flex-1 text-sm">{g?.classes?.find((c) => c.id === t.classId)?.title} · {g?.name}</div>
                    <span className="text-[12px] text-ink-400">{t.slotAt && faDateTime(t.slotAt)}</span>
                  </Card>
                </Link>
              )
            })}
          </div>
        </>
      )}

      <Sheet open={!!f} onClose={() => setF(null)} title={f?.id ? 'ویرایش عضو' : 'عضو جدید'}>
        {f && (
          <div className="space-y-3">
            <Field label="نام"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="نسبت">
                <Select value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value as FamilyMember['relation'] })}>
                  {(Object.keys(RELATION_LABEL) as FamilyMember['relation'][]).map((k) => <option key={k} value={k}>{RELATION_LABEL[k]}</option>)}
                </Select>
              </Field>
              <Field label="سال تولد (شمسی)"><NumberInput value={f.birthYear} onChange={(v) => setF({ ...f, birthYear: v })} /></Field>
            </div>
            <Chips value={f.gender} onChange={(g) => setF({ ...f, gender: g })} items={[{ value: 'female', label: 'دختر / خانم' }, { value: 'male', label: 'پسر / آقا' }]} />
            <Field label="نکته برای مربی" hint="حساسیت غذایی، بیماری، ترس از آب و…"><Textarea rows={2} value={f.notes ?? ''} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
            <Button className="w-full" onClick={async () => { if (await runOk(() => saveFamilyMember(f), 'ذخیره شد')) setF(null) }}>ذخیره</Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
