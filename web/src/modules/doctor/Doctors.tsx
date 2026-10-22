import { Link } from 'react-router-dom'
import { useDB } from '@/core/db'
import { faDateTime, num, toman } from '@/core/format'
import { Avatar, Badge, Card, PageHeader, SectionTitle, Stars } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'

export default function Doctors() {
  const me = useMe()!
  const doctors = useDB((s) => s.doctors)
  const appts = useDB((s) => s.appointments)
  const users = useUserMap()
  const mine = appts.filter((a) => a.userId === me.id)
  return (
    <div className="animate-fade-up">
      <PageHeader title="پزشک" subtitle="ویزیت آنلاین با پزشکان ورزشی و متخصصان" />
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-ink-950 p-6 text-white ring-1 ring-white/[.06]">
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-aqua-400/[.18] blur-3xl" />
        <div className="relative">
          <div className="text-[11px] tracking-wide text-aqua-300">ویزیت آنلاین</div>
          <div className="mt-2 text-xl font-light">مشاوره با پزشک، بدون صف</div>
          <div className="mt-1 text-[13px] text-white/55">آسیب‌های ورزشی، چکاپ پیش از شروع ورزش، مکمل و تغذیه‌ی درمانی</div>
        </div>
      </div>
      {mine.length > 0 && (
        <>
          <SectionTitle title="نوبت‌های من" />
          <div className="space-y-2">
            {mine.map((a) => (
              <Card key={a.id}>
                <div className="flex items-center gap-3">
                  <Avatar name={users[a.doctorId]?.name ?? ''} size={42} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{users[a.doctorId]?.name}</div>
                    <div className="text-xs text-ink-500">{faDateTime(a.at)}</div>
                  </div>
                  <Badge color={a.status === 'done' ? 'emerald' : a.status === 'cancelled' ? 'rose' : 'sky'}>{a.status === 'done' ? 'انجام شد' : a.status === 'cancelled' ? 'لغو' : 'رزرو شده'}</Badge>
                </div>
                {a.prescription && <div className="mt-3 whitespace-pre-line rounded-2xl bg-aqua-50 p-3 text-sm leading-7 dark:bg-aqua-500/10">{a.prescription}</div>}
              </Card>
            ))}
          </div>
        </>
      )}
      <SectionTitle title="پزشکان" />
      <div className="grid gap-3 sm:grid-cols-2">
        {doctors.map((d) => {
          const u = users[d.userId]
          if (!u) return null
          return (
            <Link key={d.userId} to={`/doctors/${d.userId}`}>
              <Card className="flex items-center gap-3 transition hover:-translate-y-0.5">
                <Avatar name={u.name} src={u.avatar} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-xs text-ink-500">{d.specialty}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-400">
                    <Stars value={d.rating} /> {num(d.visits)} ویزیت
                  </div>
                  <div className="mt-1 text-xs">
                    ویزیت: <b className="text-aqua-600">{toman(d.visitPrice)}</b> · {num(d.slots.length)} نوبت آزاد
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
