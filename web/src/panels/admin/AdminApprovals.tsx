import { BadgeCheck, X } from 'lucide-react'
import { useDB } from '@/core/db'
import { setVerification } from '@/core/services/admin'
import { Avatar, Badge, Button, Card, Empty, PageHeader, SectionTitle } from '@/ui/kit'
import { useUserMap } from '@/ui/hooks'
import { run } from '@/ui/toast'

/** تأیید پروانه‌ی پزشکان (استعلام نظام پزشکی)، مدارک مربیان و رستوران‌ها */
export default function AdminApprovals() {
  const doctors = useDB((s) => s.doctors)
  const coaches = useDB((s) => s.coaches)
  const restaurants = useDB((s) => s.restaurants)
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
      <SectionTitle title="پزشکان" />
      <div className="space-y-2">
        {doctors.length === 0 && <Empty title="موردی نیست" />}
        {doctors.map((d) =>
          row(d.userId, users[d.userId]?.name ?? '', `${d.specialty} · کد نظام پزشکی: ${d.medicalCode || 'وارد نشده'}`, d.verified, () => run(() => setVerification('doctor', d.userId, true), 'پزشک تأیید شد'), () => run(() => setVerification('doctor', d.userId, false)), users[d.userId]?.avatar),
        )}
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
