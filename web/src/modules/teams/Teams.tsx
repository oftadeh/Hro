import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, Plus, Users } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, num } from '@/core/format'
import { createTeam, joinTeam, TEAM_MAX } from '@/core/services/teams'
import { Avatar, Button, Card, Empty, Field, Input, PageHeader, Sheet } from '@/ui/kit'
import { Runner } from '@/ui/art'
import { useMe, useUserMap } from '@/ui/hooks'
import { run } from '@/ui/toast'

/** فهرست تیم‌های هم‌تمرینی من، ساخت تیم و پیوستن با کد */
export default function Teams() {
  const me = useMe()!
  const nav = useNavigate()
  const [params] = useSearchParams()
  const all = useDB((s) => s.teams)
  const users = useUserMap()
  const teams = all.filter((t) => t.members.includes(me.id))
  const [create, setCreate] = useState(false)
  const [f, setF] = useState({ name: '', goal: '' })
  const [code, setCode] = useState(params.get('join') ?? '')

  return (
    <div className="animate-fade-up">
      <PageHeader title="هم‌تیمی‌ها" subtitle="با دوستانت برنامه بریز، گفتگو کن و با هم تمرین کن" actions={<Button size="sm" icon={<Plus size={15} />} onClick={() => setCreate(true)}>تیم جدید</Button>} />
      <div className="relative mb-4 overflow-hidden rounded-[2rem] grad-mint p-5 text-ink-950">
        <Runner size={110} className="pointer-events-none absolute -bottom-3 left-2" />
        <div className="relative max-w-[62%] text-xs leading-6">
          <div className="font-display text-2xl leading-none">با هم قوی‌تریم</div>
          <p className="mt-2 opacity-70">قرار تمرین بگذارید، زمین یا سالن را برای تیم رزرو کنید و چالش داخلی برگزار کنید. اگر هم‌تیمی‌ها در یک روز به یک باشگاه بروند، هر دو امتیاز ویژه می‌گیرند.</p>
        </div>
      </div>
      <Card className="mb-4 flex gap-2 p-4">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="کد دعوت تیم" dir="ltr" className="text-left" />
        <Button onClick={async () => { const id = await run(() => joinTeam(code), 'به تیم پیوستی!'); if (id) nav(`/teams/${id}`) }}>پیوستن</Button>
      </Card>
      {teams.length === 0 && <Empty title="هنوز تیمی نداری" desc="یک تیم بساز و کد دعوتش را برای دوستانت بفرست." />}
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map((t) => {
          const next = t.sessions.find((s) => new Date(s.at) > new Date())
          return (
            <Link key={t.id} to={`/teams/${t.id}`}>
              <Card className="lift-hover p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl card-violet text-ink-950"><Users size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{t.name}</div>
                    <div className="text-[12px] text-ink-500">{num(t.members.length)} از {num(TEAM_MAX)} عضو{t.goal ? ` · ${t.goal}` : ''}</div>
                  </div>
                </div>
                <div className="mt-3 flex -space-x-2 space-x-reverse">
                  {t.members.slice(0, 6).map((m) => <Avatar key={m} name={users[m]?.name ?? ''} src={users[m]?.avatar} size={30} className="ring-2 ring-white dark:ring-ink-850" />)}
                </div>
                {next && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-ink-900/[.04] px-3 py-2 text-[12px] dark:bg-white/[.05]">
                    <CalendarClock size={13} /> {next.title} · {faDateTime(next.at)}
                  </div>
                )}
              </Card>
            </Link>
          )
        })}
      </div>
      <Sheet open={create} onClose={() => setCreate(false)} title="ساخت تیم هم‌تمرینی">
        <div className="space-y-3">
          <Field label="نام تیم"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="مثلاً صبح‌خیزها" /></Field>
          <Field label="هدف مشترک (اختیاری)"><Input value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} placeholder="هفته‌ای ۳ جلسه با هم" /></Field>
          <Button className="w-full" onClick={async () => { const id = await run(() => createTeam(f.name, f.goal), 'تیم ساخته شد'); if (id) nav(`/teams/${id}`) }}>ساخت تیم</Button>
        </div>
      </Sheet>
    </div>
  )
}
