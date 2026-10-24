import { useState } from 'react'
import { BadgeCheck, X } from 'lucide-react'
import { useDB } from '@/core/db'
import { reviewVerification, setVerification } from '@/core/services/admin'
import { approveEvent } from '@/core/services/events'
import { careKind } from '@/core/services/doctor'
import { CARE_KINDS, EVENT_KINDS, ROLE_META } from '@/core/config'
import { faDateTime, toman } from '@/core/format'
import { Avatar, Badge, Button, Card, Empty, Input, PageHeader, SectionTitle } from '@/ui/kit'
import { VERIFY_ROLES } from '@/core/roles'
import type { User } from '@/core/types'
import { DocList } from '@/panels/shared/Verification'
import { useUserMap } from '@/ui/hooks'
import { run } from '@/ui/toast'

/** پرونده‌ی مدارک یک حساب کسب‌وکار با تأیید یا رد (رد با ذکر دلیل) */
function VerificationCard({ u }: { u: User }) {
  const [note, setNote] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const v = u.verification!
  const roles = u.roles.filter((r) => (VERIFY_ROLES as readonly string[]).includes(r)).map((r) => ROLE_META[r].label).join('، ')
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={u.name} src={u.avatar} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{u.name}</div>
          <div className="truncate text-[12px] text-ink-500">{roles} · {u.phone}{v.submittedAt ? ` · ارسال ${faDateTime(v.submittedAt)}` : ''}</div>
        </div>
        <Badge color="amber">در انتظار</Badge>
      </div>
      {v.note && <p className="rounded-2xl bg-ink-50 px-3 py-2 text-[13px] leading-6 dark:bg-ink-800">{v.note}</p>}
      <DocList docs={v.docs} />
      {rejecting ? (
        <div className="flex gap-2">
          <Input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="دلیل رد (به کاربر نمایش داده می‌شود)" className="flex-1" />
          <Button size="sm" variant="danger" disabled={!note.trim()} onClick={() => run(() => reviewVerification(u.id, false, note), 'نتیجه به کاربر اعلام شد')}>رد</Button>
          <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>انصراف</Button>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" className="text-coral-500" icon={<X size={14} />} onClick={() => setRejecting(true)}>رد مدارک</Button>
          <Button size="sm" variant="dark" icon={<BadgeCheck size={14} />} onClick={() => run(() => reviewVerification(u.id, true), 'حساب فعال شد')}>تأیید و فعال‌سازی</Button>
        </div>
      )}
    </Card>
  )
}

/** تأیید پروانه‌ی پزشکان (استعلام نظام پزشکی)، مدارک مربیان و رستوران‌ها */
export default function AdminApprovals() {
  const doctors = useDB((s) => s.doctors)
  const coaches = useDB((s) => s.coaches)
  const restaurants = useDB((s) => s.restaurants)
  const events = useDB((s) => s.events)
  const pendingEvents = events.filter((e) => !e.approved && e.status !== 'cancelled')
  const allUsers = useDB((s) => s.users)
  const pendingDocs = allUsers.filter((u) => u.verification?.status === 'pending').sort((a, b) => (a.verification!.submittedAt ?? '').localeCompare(b.verification!.submittedAt ?? ''))
  const users = useUserMap()
  const row = (key: string, name: string, info: string, ok: boolean | undefined, onOk: () => void, onNo: () => void, avatar?: string) => (
    <Card key={key} className="flex items-center gap-3">
      <Avatar name={name} src={avatar} size={40} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{name}</div>
        <div className="truncate text-[12px] text-ink-500">{info}</div>
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
      <SectionTitle title={`مدارک حساب‌های کسب‌وکار${pendingDocs.length ? ` (${pendingDocs.length.toLocaleString('fa-IR')})` : ''}`} />
      <div className="space-y-2">
        {pendingDocs.length === 0 && <Empty title="مدرکی در انتظار بررسی نیست" />}
        {pendingDocs.map((u) => <VerificationCard key={u.id} u={u} />)}
      </div>
      <SectionTitle title="رویدادهای ورزشی" />
      <div className="space-y-2">
        {pendingEvents.length === 0 && <Empty title="رویدادی در انتظار تأیید نیست" />}
        {pendingEvents.map((e) => (
          <Card key={e.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{e.title}</div>
              <div className="truncate text-[12px] text-ink-500">{EVENT_KINDS[e.kind]} · {faDateTime(e.at)} · {e.location} · ورودی {e.fee ? toman(e.fee) : 'رایگان'} · برگزارکننده: {users[e.organizerId]?.name}</div>
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
