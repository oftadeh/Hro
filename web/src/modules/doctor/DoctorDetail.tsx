import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { faTime, num, toman } from '@/core/format'
import { bookAppointment } from '@/core/services/doctor'
import { freeDoctorLeft } from '@/core/services/perks'
import { PerkPrice } from '@/ui/PerkPrice'
import { Avatar, Badge, Button, Card, Empty, Field, PageHeader, SectionTitle, Stars, Textarea } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

export default function DoctorDetail() {
  const { id } = useParams()
  const me = useMe()!
  const nav = useNavigate()
  const doc = useDB((s) => s.doctors.find((d) => d.userId === id))
  const user = useDB((s) => s.users.find((u) => u.id === id))
  const bal = useBalance(me.id)
  useDB((s) => s.subscriptions)
  const freeLeft = freeDoctorLeft(me.id)
  const [slot, setSlot] = useState<string>()
  const [reason, setReason] = useState('')

  const days = useMemo(() => {
    const map = new Map<string, string[]>()
    doc?.slots.filter((s) => new Date(s) > new Date()).forEach((s) => {
      const k = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(s))
      map.set(k, [...(map.get(k) ?? []), s])
    })
    return [...map.entries()]
  }, [doc?.slots])

  if (!doc || !user) return <Empty icon="" title="پزشک یافت نشد" />

  return (
    <div className="animate-fade-up">
      <PageHeader back="/doctors" title={user.name} subtitle={doc.specialty} />
      <Card className="flex items-center gap-4">
        <Avatar name={user.name} src={user.avatar} size={80} />
        <div className="flex-1">
          <div className="text-lg font-semibold">{user.name}</div>
          <div className="text-sm text-ink-500">{doc.specialty}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <Stars value={doc.rating} /> <span>{num(doc.visits)} ویزیت موفق</span>
            {doc.medicalCode && <Badge color="sky">{doc.medicalCode}</Badge>}
            {doc.online && <Badge color="emerald">ویزیت آنلاین</Badge>}
          </div>
        </div>
      </Card>
      <p className="mt-3 text-sm leading-7 text-ink-600 dark:text-ink-300">{doc.bio}</p>

      <SectionTitle title="انتخاب نوبت" />
      {days.length === 0 && <Empty icon="" title="نوبت آزادی موجود نیست" />}
      <div className="space-y-3">
        {days.map(([day, slots]) => (
          <div key={day}>
            <div className="mb-2 text-xs font-semibold text-ink-500">{day}</div>
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  className={clsx('rounded-xl border px-4 py-2 text-sm font-medium transition', slot === s ? 'border-aqua-500 bg-aqua-500 text-white' : 'border-ink-200 bg-white hover:border-aqua-400 dark:border-white/10 dark:bg-ink-900')}
                >
                  {faTime(s)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {slot && (
        <Card className="mt-4 animate-fade-up space-y-3">
          <Field label="علت مراجعه و شرح حال">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: درد زانو بعد از دویدن از دو هفته پیش…" />
          </Field>
          <div className="flex items-center justify-between text-sm">
            <span>هزینه‌ی ویزیت</span>
            <PerkPrice userId={me.id} module="doctor" amount={doc.visitPrice} free={freeLeft > 0} />
          </div>
          <div className="text-xs text-ink-400">موجودی کیف پول: {toman(bal)}</div>
          <Button
            className="w-full"
            size="lg"
            onClick={async () => {
              const ok = await runOk(() => bookAppointment(doc.userId, slot, reason), 'نوبت رزرو شد')
              if (ok) nav('/doctors')
            }}
          >
            رزرو و پرداخت
          </Button>
        </Card>
      )}
    </div>
  )
}
