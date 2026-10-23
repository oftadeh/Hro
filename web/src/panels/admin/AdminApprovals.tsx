import { BadgeCheck, X } from 'lucide-react'
import { useDB } from '@/core/db'
import { setVerification } from '@/core/services/admin'
import { approveEvent } from '@/core/services/events'
import { careKind } from '@/core/services/doctor'
import { CARE_KINDS, EVENT_KINDS } from '@/core/config'
import { faDateTime, toman } from '@/core/format'
import { Avatar, Badge, Button, Card, Empty, PageHeader, SectionTitle } from '@/ui/kit'
import { useUserMap } from '@/ui/hooks'
import { run } from '@/ui/toast'

/** تأیید پروانه‌ی پزشکان (استعلام نظام پزشکی)، مدارک مربیان و رستوران‌ها */
export default function AdminApprovals() {
  const doctors = useDB((s) => s.doctors)
  const coaches = useDB((s) => s.coaches)
  const restaurants = useDB((s) => s.restaurants)
  const events = useDB((s) => s.events)
  const pendingEvents = events.filter((e) => !e.approved && e.status !== 'cancelled')
  const users = useUserMap()
  const row = (key: string, name: string, info: string, ok: boolean | undefined, onOk: () => void, onNo: () => void, avatar?: string) => (
    <Card key={key} className="flex items-center gap-3">
      <Avatar name={name} src={avatar} size={40} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{name}</div>
        <div className="truncate text-[11px] text-ink-500">{info}</div>
      </div>
      <Badge color={ok ? 'emerald' : 'amber'}>{ok ? 'تأییدشده' : 'در انتظار'}</Badge>
      {ok ? (
        <Button size="sm" variant="ghost" className="text-coral-500" icon={<X size={14} />} onClick={onNo}>لغو</Button>
      ) : (
        <Button size="sm" icon={<BadgeCheck size={14} />} onClick={onOk}>تأیید</Button>
      )}
    </Card>
  )
  return (
    <div className="animate-fade-up">
      <PageHeader title="تأیید مدارک" subtitle="پزشک فقط پس از استعلام کد نظام پزشکی در سامانه‌ی نظام پزشکی به بیماران نمایش داده می‌شود" />
      <SectionTitle title="رویدادهای ورزشی" />
      <div className="space-y-2">
        {pendingEvents.length === 0 && <Empty title="رویدادی در انتظار تأیید نیست" />}
        {pendingEvents.map((e) => (
          <Card key={e.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{e.title}</div>
              <div className="truncate text-[11px] text-ink-500">{EVENT_KINDS[e.kind]} · {faDateTime(e.at)} · {e.location} · ورودی {e.fee ? toman(e.fee) : 'رایگان'} · برگزارکننده: {users[e.organizerId]?.name}</div>
            </div>
            <Button size="sm" variant="ghost" className="text-coral-500" icon={<X size={14} />} onClick={() => run(() => approveEvent(e.id, false))}>رد</Button>
            <Button size="sm" icon={<BadgeCheck size={14} />} onClick={() => run(() => approveEvent(e.id, true), 'رویداد منتشر شد')}>انتشار</Button>
          </Card>
        ))}
      </div>
      <SectionTitle title="پزشکان و درمانگران" />
      <div className="space-y-2">
        {doctors.length === 0 && <Empty title="موردی نیست" />}
        {doctors.map((d) => {
          const meta = CARE_KINDS[careKind(d)]
          return row(d.userId, users[d.userId]?.name ?? '', `${meta.label} · ${d.specialty} · ${meta.license}: ${d.medicalCode || 'وارد نشده'}`, d.verified, () => run(() => setVerification('doctor', d.userId, true), `${meta.label} تأیید شد`), () => run(() => setVerification('doctor', d.userId, false)), users[d.userId]?.avatar)
        })}
      </div>
      <SectionTitle title="مربیان" />
      <div className="space-y-2">
        {coaches.map((c) =>
          row(c.userId, users[c.userId]?.name ?? '', `${c.title} · مدارک: ${c.certificates.join('، ') || 'ثبت نشده'}`, c.verified, () => run(() => setVerification('coach', c.userId, true), 'مربی تأیید شد'), () => run(() => setVerification('coach', c.userId, false)), users[c.userId]?.avatar),
        )}
      </div>
      <SectionTitle title="رستوران‌ها" />
      <div className="space-y-2">
        {restaurants.map((r) =>
          row(r.id, r.name, `${r.address} · مالک: ${users[r.ownerId]?.name ?? ''}`, r.approved, () => run(() => setVerification('restaurant', r.id, true), 'رستوران تأیید شد'), () => run(() => setVerification('restaurant', r.id, false))),
        )}
      </div>
    </div>
  )
}
