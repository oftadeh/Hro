import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { setGymApproval } from '@/core/services/admin'
import { gymMissing, gymTitle } from '@/core/services/fityab'
import type { Gym } from '@/core/types'
import { Badge, Button, Card, Cover, Empty, PageHeader, Tabs } from '@/ui/kit'
import { useUserMap } from '@/ui/hooks'
import { askText, run } from '@/ui/toast'
import { DocList } from '@/panels/shared/Verification'
import { ReviewActions } from './ReviewActions'

type Tab = 'pending' | 'changes' | 'rejected' | 'approved'
const tabOf = (g: Gym): Tab => (g.approved ? 'approved' : g.review?.status === 'changes' ? 'changes' : g.review?.status === 'rejected' ? 'rejected' : 'pending')

/** بررسی باشگاه‌ها: پرونده‌ی کامل (مجوز، عکس‌ها، نشانی) با تأیید، نیاز به اصلاح یا رد */
export default function AdminGyms() {
  const gyms = useDB((s) => s.gyms)
  const checkins = useDB((s) => s.checkins)
  const users = useUserMap()
  const [tab, setTab] = useState<Tab>('pending')
  const count = (t: Tab) => gyms.filter((g) => tabOf(g) === t).length
  const list = gyms.filter((g) => tabOf(g) === tab)
  return (
    <div className="animate-fade-up">
      <PageHeader title="باشگاه‌های فیت‌یاب" subtitle="باشگاه فقط با مجوز، عکس‌های واقعی و موقعیت دقیق منتشر می‌شود" />
      <div className="-mx-4 mb-4 overflow-x-auto px-4 no-scrollbar">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'pending', label: `در انتظار (${num(count('pending'))})` },
            { value: 'changes', label: `نیاز به اصلاح (${num(count('changes'))})` },
            { value: 'rejected', label: 'ردشده' },
            { value: 'approved', label: 'منتشرشده' },
          ]}
        />
      </div>
      {list.length === 0 && <Empty title="موردی نیست" />}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((g) => {
          const missing = gymMissing(g)
          const photos = g.media.filter((m) => m.type === 'image')
          return (
            <Card key={g.id} className="space-y-3">
              <div className="flex gap-3">
                <Cover gradient={g.cover} image={photos[0]?.url} emoji="" className="h-24 w-24 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-0.5 text-xs text-ink-500">
                  <Link to={`/fityab/${g.id}`} className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{gymTitle(g)}</Link>
                  <div>مالک: {users[g.ownerId]?.name} · <span dir="ltr">{g.phone || '—'}</span></div>
                  <div className="truncate">{g.city} · {g.address || 'نشانی ثبت نشده'}</div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <Badge color="slate">{g.rental ? `${toman(g.rental.hourlyPrice)}/ساعت` : toman(g.sessionPrice)}</Badge>
                    <Badge color={photos.length >= 3 ? 'slate' : 'rose'}>{num(photos.length)} عکس</Badge>
                    {g.approved && <Badge color="slate">{num(checkins.filter((c) => c.gymId === g.id).length)} ورود</Badge>}
                  </div>
                </div>
              </div>
              {photos.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {photos.slice(1, 7).map((m) => <img key={m.url} src={m.url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />)}
                </div>
              )}
              <div className="rounded-2xl bg-ink-50 px-3 py-2 text-[13px] dark:bg-ink-800">
                <div className="mb-1">مجوز: <b dir="ltr">{g.license?.number || 'ثبت نشده'}</b></div>
                {g.license?.doc ? <DocList docs={[g.license.doc]} /> : <div className="text-[12px] text-coral-500">فایل مجوز بارگذاری نشده</div>}
              </div>
              {missing.length > 0 && <p className="text-[12px] leading-6 text-coral-500">ناقص: {missing.map((m) => m.label).join('، ')}</p>}
              {g.review?.note && !g.approved && <p className="text-[12px] text-ink-500">یادداشت قبلی مدیر: {g.review.note}</p>}
              {g.approved ? (
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" className="text-coral-500" onClick={async () => {
                      const note = await askText(`چرا «${gymTitle(g)}» از فیت‌یاب برداشته می‌شود؟ (به مالک نمایش داده می‌شود)`)
                      if (note?.trim()) run(() => setGymApproval(g.id, 'changes', note), 'باشگاه برداشته شد')
                    }}>
                    برداشتن از فیت‌یاب
                  </Button>
                </div>
              ) : tab === 'rejected' ? (
                <ReviewActions approveLabel="بازبینی و انتشار" onDecide={(dec, note) => setGymApproval(g.id, dec, note)} />
              ) : (
                <ReviewActions onDecide={(dec, note) => setGymApproval(g.id, dec, note)} />
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
