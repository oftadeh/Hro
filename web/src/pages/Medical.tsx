import { Link } from 'react-router-dom'
import { FileText, Lock, ShieldCheck, Video } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime } from '@/core/format'
import { cancelAppointment } from '@/core/services/doctor'
import { careProviders, toggleHealthShare } from '@/core/services/health'
import { Avatar, Badge, Button, Card, Empty, PageHeader, SectionTitle } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { run } from '@/ui/toast'

/** پرونده‌ی پزشکی: نوبت‌ها، ویزیت تصویری، نسخه‌ها و اجازه‌ی دسترسی مربی/پزشک */
export default function Medical() {
  const me = useMe()!
  const appts = useDB((s) => s.appointments)
  const state = useDB((s) => s)
  const users = useUserMap()
  const mine = appts.filter((a) => a.userId === me.id)
  const upcoming = mine.filter((a) => a.status === 'booked')
  const past = mine.filter((a) => a.status !== 'booked')
  const providers = careProviders(me.id, state)
  const shares = me.healthShares ?? []

  return (
    <div className="animate-fade-up">
      <PageHeader back title="پرونده‌ی پزشکی" subtitle="نوبت‌ها، نسخه‌ها و دسترسی‌ها" />

      <SectionTitle title="نوبت‌های پیش‌رو" action={<Link to="/doctors" className="text-xs text-ink-500">رزرو نوبت</Link>} />
      {upcoming.length === 0 && <Empty title="نوبت فعالی ندارید" />}
      <div className="space-y-3">
        {upcoming.map((a) => {
          const soon = new Date(a.at).getTime() - Date.now() < 15 * 60_000
          return (
            <Card key={a.id}>
              <div className="flex items-center gap-3">
                <Avatar name={users[a.doctorId]?.name ?? ''} src={users[a.doctorId]?.avatar} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{users[a.doctorId]?.name}</div>
                  <div className="text-xs text-ink-500">{faDateTime(a.at)}</div>
                </div>
                <Badge color="sky">رزرو شده</Badge>
              </div>
              <div className="mt-2 text-xs text-ink-500">علت: {a.reason}</div>
              <div className="mt-3 flex gap-2">
                {a.callLink && (
                  <a href={a.callLink} target="_blank" rel="noreferrer" className="flex-1">
                    <Button className="w-full" size="sm" icon={<Video size={15} />} variant={soon ? 'primary' : 'secondary'}>
                      ورود به ویزیت تصویری
                    </Button>
                  </a>
                )}
                <Button size="sm" variant="ghost" className="text-coral-500" onClick={() => confirm('نوبت لغو و مبلغ برگشت داده شود؟') && run(() => cancelAppointment(a.id), 'نوبت لغو شد')}>
                  لغو
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <SectionTitle title="سوابق و نسخه‌ها" />
      {past.length === 0 && <Empty title="سابقه‌ای ثبت نشده" />}
      <div className="space-y-3">
        {past.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-ink-400" />
              <span className="text-sm font-medium">{users[a.doctorId]?.name}</span>
              <span className="text-[11px] text-ink-400">{faDateTime(a.at)}</span>
              <Badge color={a.status === 'done' ? 'emerald' : 'rose'} className="mr-auto">
                {a.status === 'done' ? 'انجام شد' : 'لغو شد'}
              </Badge>
            </div>
            {a.prescription && <div className="mt-3 whitespace-pre-line rounded-2xl bg-aqua-400/10 p-3 text-sm leading-7">{a.prescription}</div>}
          </Card>
        ))}
      </div>

      <SectionTitle title="دسترسی به پرونده‌ی سلامت" />
      <Card>
        <p className="flex items-start gap-1.5 text-xs leading-6 text-ink-500">
          <Lock size={13} className="mt-1 shrink-0" />
          پرونده‌ی سلامت شما (قد، وزن، آسیب‌ها، بیماری‌ها، حساسیت‌ها{me.gender === 'female' ? '، خلاصه‌ی چرخه' : ''} و تمرین‌های اخیر) فقط برای مربی یا پزشکی نمایش داده می‌شود که خودتان اجازه دهید. هر زمان می‌توانید دسترسی را بردارید.
        </p>
        {providers.length === 0 && <div className="mt-3 text-xs text-ink-400">پس از خرید برنامه از مربی یا رزرو نوبت پزشک، می‌توانید به آن‌ها دسترسی بدهید.</div>}
        <div className="mt-3 space-y-2">
          {providers.map((p) => {
            const on = shares.includes(p.id)
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-ink-900/[.03] p-3 dark:bg-white/[.04]">
                <Avatar name={p.name} src={p.avatar} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-ink-400">{p.roles.includes('doctor') ? 'پزشک' : 'مربی'}</div>
                </div>
                <Button size="sm" variant={on ? 'secondary' : 'primary'} icon={on ? <ShieldCheck size={14} /> : undefined} onClick={() => run(() => toggleHealthShare(p.id), on ? 'دسترسی برداشته شد' : 'پرونده به اشتراک گذاشته شد')}>
                  {on ? 'دسترسی دارد' : 'اجازه‌ی دسترسی'}
                </Button>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
