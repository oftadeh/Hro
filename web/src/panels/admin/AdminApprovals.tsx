import { useDB } from '@/core/db'
import { reviewVerification, setVerification } from '@/core/services/admin'
import { approveEvent } from '@/core/services/events'
import { reviewProduct } from '@/core/services/commerce'
import { careKind } from '@/core/services/doctor'
import { CARE_KINDS, EVENT_KINDS, ROLE_META } from '@/core/config'
import { faDateTime, toman } from '@/core/format'
import { Avatar, Badge, Card, Empty, PageHeader, SectionTitle } from '@/ui/kit'
import { VERIFY_ROLES, isNationalId, requirementsOf } from '@/core/roles'
import type { User } from '@/core/types'
import { DocList } from '@/panels/shared/Verification'
import { useUserMap } from '@/ui/hooks'
import { type Decision, ReviewActions } from './ReviewActions'

/** پرونده‌ی مدارک یک حساب کسب‌وکار: اطلاعات، هر مدرک با نامش، و سه تصمیم */
function VerificationCard({ u }: { u: User }) {
  const v = u.verification!
  const roles = u.roles.filter((r) => (VERIFY_ROLES as readonly string[]).includes(r)).map((r) => ROLE_META[r].label).join('، ')
  const req = requirementsOf(u.roles)
  const labelOf = (k: string) => [...req.docs, ...req.fields].find((r) => r.key === k)?.label ?? k
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={u.name} src={u.avatar} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{u.name}</div>
          <div className="truncate text-[12px] text-ink-500">{roles} · {u.phone}{v.submittedAt ? ` · ارسال ${faDateTime(v.submittedAt)}` : ''}</div>
        </div>
        <Badge color="amber">{v.adminNote ? 'ارسال دوباره' : 'در انتظار'}</Badge>
      </div>
      {v.fields && Object.keys(v.fields).length > 0 && (
        <dl className="grid gap-1 rounded-2xl bg-ink-50 px-3 py-2 text-[13px] dark:bg-ink-800">
          {Object.entries(v.fields).map(([k, val]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-ink-500">{labelOf(k)}</dt>
              <dd dir="ltr" className="font-semibold tabular-nums">{val}{k === 'nationalId' && !isNationalId(val) ? ' ⚠' : ''}</dd>
            </div>
          ))}
        </dl>
      )}
      {v.note && <p className="rounded-2xl bg-ink-50 px-3 py-2 text-[13px] leading-6 dark:bg-ink-800">توضیح متقاضی: {v.note}</p>}
      {v.adminNote && <p className="text-[12px] text-ink-500">درخواست اصلاح قبلی: {v.adminNote}</p>}
      {v.slots ? (
        <div className="space-y-2">
          {Object.entries(v.slots).map(([k, ref]) => (
            <div key={k}>
              <div className="mb-1 text-[12px] text-ink-500">{labelOf(k)}</div>
              <DocList docs={[ref]} />
            </div>
          ))}
        </div>
      ) : (
        <DocList docs={v.docs} />
      )}
      <ReviewActions approveLabel="تأیید و فعال‌سازی" onDecide={(dec, note) => reviewVerification(u.id, dec, note)} />
    </Card>
  )
}

/** تأیید پروانه‌ی پزشکان (استعلام نظام پزشکی)، مدارک مربیان و رستوران‌ها */
export default function AdminApprovals() {
  const doctors = useDB((s) => s.doctors)
  const coaches = useDB((s) => s.coaches)
  const restaurants = useDB((s) => s.restaurants)
  const events = useDB((s) => s.events)
  const pendingEvents = events.filter((e) => !e.approved && e.status !== 'cancelled' && e.review?.status !== 'rejected')
  const allUsers = useDB((s) => s.users)
  const products = useDB((s) => s.products)
  const pendingProducts = products.filter((p) => p.review && p.review.status !== 'rejected').sort((a, b) => (a.review!.status === 'pending' ? -1 : 1) - (b.review!.status === 'pending' ? -1 : 1))
  const pendingDocs = allUsers.filter((u) => u.verification?.status === 'pending').sort((a, b) => (a.verification!.submittedAt ?? '').localeCompare(b.verification!.submittedAt ?? ''))
  const users = useUserMap()
  const row = (key: string, name: string, info: string, ok: boolean | undefined, decide: (dec: Decision, note?: string) => unknown, avatar?: string, note?: string) => (
    <Card key={key} className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={name} src={avatar} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{name}</div>
          <div className="truncate text-[12px] text-ink-500">{info}</div>
          {note && !ok && <div className="text-[12px] text-ink-500">یادداشت قبلی: {note}</div>}
        </div>
        <Badge color={ok ? 'emerald' : 'amber'}>{ok ? 'تأییدشده' : 'تأییدنشده'}</Badge>
      </div>
      {ok ? <ReviewActions hideApprove onDecide={decide} /> : <ReviewActions approveLabel="تأیید" onDecide={decide} />}
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
      <SectionTitle title={`محصولات فروشگاه${pendingProducts.length ? ` (${pendingProducts.length.toLocaleString('fa-IR')})` : ''}`} />
      <div className="space-y-2">
        {pendingProducts.length === 0 && <Empty title="محصولی در انتظار بررسی نیست" />}
        {pendingProducts.map((p) => (
          <Card key={p.id} className="space-y-3">
            <div className="flex gap-3">
              {p.image ? <img src={p.image} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-2xl object-cover" /> : <div className="h-20 w-20 shrink-0 rounded-2xl bg-ink-100 dark:bg-ink-800" />}
              <div className="min-w-0 flex-1 text-[12px] text-ink-500">
                <div className="text-sm font-semibold text-ink-900 dark:text-white">{p.name} {p.review?.status === 'changes' && <Badge color="rose">منتظر اصلاح فروشنده</Badge>}</div>
                <div>{p.brand || 'بدون برند'} · {toman(p.price)} · فروشنده: {users[p.sellerId]?.name}</div>
                {p.licenseCode && <div>کد مجوز: <span dir="ltr">{p.licenseCode}</span></div>}
                <p className="mt-1 line-clamp-3 leading-5">{p.description}</p>
              </div>
            </div>
            {p.review?.note && <p className="text-[12px] text-ink-500">یادداشت قبلی: {p.review.note}</p>}
            <ReviewActions onDecide={(dec, note) => reviewProduct(p.id, dec, note)} />
          </Card>
        ))}
      </div>
      <SectionTitle title="رویدادهای ورزشی" />
      <div className="space-y-2">
        {pendingEvents.length === 0 && <Empty title="رویدادی در انتظار تأیید نیست" />}
        {pendingEvents.map((e) => (
          <Card key={e.id} className="space-y-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{e.title} {e.review?.status === 'changes' && <Badge color="rose">منتظر اصلاح برگزارکننده</Badge>}{e.review?.status === 'pending' && e.review.note && <Badge color="amber">اصلاح‌شده</Badge>}</div>
              <div className="truncate text-[12px] text-ink-500">{EVENT_KINDS[e.kind]} · {faDateTime(e.at)} · {e.location} · ورودی {e.fee ? toman(e.fee) : 'رایگان'} · برگزارکننده: {users[e.organizerId]?.name}</div>
            </div>
            <ReviewActions onDecide={(dec, note) => approveEvent(e.id, dec, note)} />
          </Card>
        ))}
      </div>
      <SectionTitle title="پزشکان و درمانگران" />
      <div className="space-y-2">
        {doctors.length === 0 && <Empty title="موردی نیست" />}
        {doctors.map((d) => {
          const meta = CARE_KINDS[careKind(d)]
          return row(d.userId, users[d.userId]?.name ?? '', `${meta.label} · ${d.specialty} · ${meta.license}: ${d.medicalCode || 'وارد نشده'}`, d.verified, (dec, note) => setVerification('doctor', d.userId, dec, note), users[d.userId]?.avatar)
        })}
      </div>
      <SectionTitle title="مربیان" />
      <div className="space-y-2">
        {coaches.map((c) =>
          row(c.userId, users[c.userId]?.name ?? '', `${c.title} · مدارک: ${c.certificates.join('، ') || 'ثبت نشده'}`, c.verified, (dec, note) => setVerification('coach', c.userId, dec, note), users[c.userId]?.avatar),
        )}
      </div>
      <SectionTitle title="رستوران‌ها" />
      <div className="space-y-2">
        {restaurants.map((r) =>
          row(r.id, r.name, `${r.address} · مالک: ${users[r.ownerId]?.name ?? ''}`, r.approved, (dec, note) => setVerification('restaurant', r.id, dec, note), undefined, r.review?.note),
        )}
      </div>
    </div>
  )
}
