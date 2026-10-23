import { Link, useSearchParams } from 'react-router-dom'
import { useDB } from '@/core/db'
import { CARE_KINDS } from '@/core/config'
import { careKind, careModes } from '@/core/services/doctor'
import type { CareKind } from '@/core/types'
import { faDateTime, num, toman } from '@/core/format'
import { Avatar, Badge, Card, Chips, Orbs, PageHeader, SectionTitle, Stars } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { Doctor } from '@/ui/art'

export default function Doctors() {
  const me = useMe()!
  const doctors = useDB((s) => s.doctors)
  const appts = useDB((s) => s.appointments)
  const users = useUserMap()
  const mine = appts.filter((a) => a.userId === me.id)
  const [params, setParams] = useSearchParams()
  const kind = (params.get('kind') as CareKind) in CARE_KINDS ? (params.get('kind') as CareKind) : 'doctor'
  const HERO: Record<CareKind, [string, string]> = {
    doctor: ['مشاوره با پزشک، بدون صف', 'آسیب‌های ورزشی، چکاپ پیش از شروع ورزش، مکمل و تغذیه‌ی درمانی'],
    physio: ['برگشت سریع‌تر به تمرین', 'توانبخشی آسیب زانو، شانه و کمر؛ جلسه‌ی آنلاین یا حضوری'],
    massage: ['ریکاوری عضلات', 'ماساژ ورزشی حضوری پس از تمرین سنگین یا مسابقه'],
    psych: ['ذهن قوی، عملکرد بهتر', 'انگیزه، تمرکز، اضطراب مسابقه و بازگشت ذهنی پس از آسیب'],
  }
  const list = doctors.filter((d) => d.verified && careKind(d) === kind)
  return (
    <div className="animate-fade-up">
      <PageHeader title="سلامت و درمان" subtitle="پزشک، فیزیوتراپی، ماساژ ورزشی و روان‌شناسی ورزشی" />
      <div className="mb-4">
        <Chips value={kind} onChange={(k) => setParams(k === 'doctor' ? {} : { kind: k }, { replace: true })} items={(Object.keys(CARE_KINDS) as CareKind[]).map((k) => ({ value: k, label: CARE_KINDS[k].plural }))} />
      </div>
      <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-ink-850 p-6 text-white min-h-[10rem]">
        <Orbs seed="doctor" intensity={0.8} />
        <Doctor size={130} className="pointer-events-none absolute -bottom-3 left-2" />
        <div className="relative max-w-[62%]">
          <div className="text-[11px] text-white/70">{CARE_KINDS[kind].plural}</div>
          <div className="mt-2 font-display text-[2rem] leading-[1.1]">{HERO[kind][0]}</div>
          <div className="mt-1 text-[13px] text-white/75">{HERO[kind][1]}</div>
        </div>
      </div>
      {mine.length > 0 && (
        <>
          <SectionTitle title="نوبت‌های من" action={<Link to="/medical" className="text-xs text-ink-500">پرونده‌ی پزشکی</Link>} />
          <div className="space-y-2">
            {mine.map((a) => (
              <Card key={a.id}>
                <div className="flex items-center gap-3">
                  <Avatar name={users[a.doctorId]?.name ?? ''} size={42} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{users[a.doctorId]?.name}</div>
                    <div className="text-xs text-ink-500">{faDateTime(a.at)} · {a.mode === 'inperson' ? 'حضوری' : 'آنلاین'}</div>
                  </div>
                  <Badge color={a.status === 'done' ? 'emerald' : a.status === 'cancelled' ? 'rose' : 'sky'}>{a.status === 'done' ? 'انجام شد' : a.status === 'cancelled' ? 'لغو' : 'رزرو شده'}</Badge>
                </div>
                {a.prescription && <div className="mt-3 whitespace-pre-line rounded-2xl bg-aqua-50 p-3 text-sm leading-7 dark:bg-aqua-500/10">{a.prescription}</div>}
              </Card>
            ))}
          </div>
        </>
      )}
      <SectionTitle title={CARE_KINDS[kind].plural} />
      {list.length === 0 && <div className="rounded-2xl bg-ink-900/[.04] p-4 text-sm text-ink-500 dark:bg-white/5">به‌زودی {CARE_KINDS[kind].plural} به کی‌فیت اضافه می‌شوند.</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((d) => {
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
                    هر جلسه: <b className="text-aqua-600">{toman(d.visitPrice)}</b> · {num(d.slots.length)} نوبت آزاد
                  </div>
                  <div className="mt-1 flex gap-1">{careModes(d).map((m) => <Badge key={m} color={m === 'online' ? 'sky' : 'violet'}>{m === 'online' ? 'آنلاین' : 'حضوری'}</Badge>)}</div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
