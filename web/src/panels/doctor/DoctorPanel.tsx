import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarClock, MessageCircle, Wallet } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, num, toman } from '@/core/format'
import { cancelAppointment, completeAppointment } from '@/core/services/doctor'
import { run } from '@/ui/toast'
import { findThread } from '@/core/services/fityar'
import type { Appointment } from '@/core/types'
import { Avatar, Badge, Button, Card, Empty, PageHeader, Sheet, Stat, Tabs, Textarea } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

export default function DoctorPanel() {
  const me = useMe()!
  const appts = useDB((s) => s.appointments)
  const doc = useDB((s) => s.doctors.find((d) => d.userId === me.id))
  const txs = useDB((s) => s.transactions)
  const users = useUserMap()
  const [tab, setTab] = useState<'booked' | 'done'>('booked')
  const [open, setOpen] = useState<Appointment>()
  const [rx, setRx] = useState('')
  const mine = appts.filter((a) => a.doctorId === me.id)
  const list = mine.filter((a) => a.status === tab).sort((a, b) => a.at.localeCompare(b.at))
  const net = txs.filter((t) => t.to === me.id && t.module === 'doctor').reduce((a, t) => a + t.amount - t.commission, 0)

  return (
    <div className="animate-fade-up">
      <PageHeader title="نوبت‌های ویزیت" subtitle="ارتباط با بیماران از طریق پیام‌ها و تماس" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="نوبت‌های پیش‌رو" value={num(mine.filter((a) => a.status === 'booked').length)} icon={<CalendarClock size={18} />} tone="sky" />
        <Stat label="ویزیت‌های انجام‌شده" value={num(doc?.visits ?? 0)} icon={<CalendarCheck size={18} />} />
        <Stat label="نوبت آزاد" value={num(doc?.slots.length ?? 0)} icon={<CalendarClock size={18} />} tone="amber" />
        <Stat label="درآمد خالص" value={toman(net)} icon={<Wallet size={18} />} tone="violet" />
      </div>
      <Tabs className="my-4 max-w-sm" value={tab} onChange={setTab} items={[{ value: 'booked', label: 'پیش‌رو' }, { value: 'done', label: 'انجام‌شده' }]} />
      {list.length === 0 && <Empty icon="" title="نوبتی در این بخش نیست" desc={tab === 'booked' ? 'از بخش پروفایل نوبت‌های آزاد اضافه کنید.' : undefined} />}
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((a) => {
          const t = findThread(me.id, a.userId)
          return (
            <Card key={a.id}>
              <div className="flex items-center gap-3">
                <Avatar name={users[a.userId]?.name ?? ''} size={44} />
                <div className="flex-1">
                  <div className="font-semibold">{users[a.userId]?.name}</div>
                  <div className="text-xs text-ink-500">{faDateTime(a.at)}</div>
                </div>
                <Badge color={a.status === 'done' ? 'emerald' : 'sky'}>{a.status === 'done' ? 'انجام شد' : 'رزرو'}</Badge>
              </div>
              <div className="mt-3 rounded-2xl bg-ink-50 p-3 text-xs leading-6 dark:bg-white/5">{a.reason}</div>
              {users[a.userId]?.healthShares?.includes(me.id) && <Link to={`/client/${a.userId}`} className="mt-2 block text-xs text-aqua-700 dark:text-aqua-300">پرونده‌ی سلامت بیمار (اشتراک‌گذاری‌شده)</Link>}
              {a.prescription && <div className="mt-2 whitespace-pre-line rounded-2xl bg-aqua-50 p-3 text-xs leading-6 dark:bg-aqua-500/10">{a.prescription}</div>}
              <div className="mt-3 flex gap-2">
                {t && <Link to={`/messages/${t.id}`} className="flex-1"><Button variant="secondary" size="sm" className="w-full" icon={<MessageCircle size={14} />}>گفتگو</Button></Link>}
                {a.status === 'booked' && a.callLink && <a href={a.callLink} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary">ویزیت تصویری</Button></a>}
                {a.status === 'booked' && <Button size="sm" className="flex-1" onClick={() => { setOpen(a); setRx('') }}>ثبت نتیجه‌ی ویزیت</Button>}
                {a.status === 'booked' && <Button size="sm" variant="ghost" className="text-coral-500" onClick={() => confirm('نوبت لغو و وجه به بیمار برگردد؟') && run(() => cancelAppointment(a.id), 'نوبت لغو شد')}>لغو</Button>}
              </div>
            </Card>
          )
        })}
      </div>
      <Sheet open={!!open} onClose={() => setOpen(undefined)} title="نتیجه‌ی ویزیت و توصیه‌ها">
        <Textarea rows={6} value={rx} onChange={(e) => setRx(e.target.value)} placeholder="تشخیص، توصیه‌ها، داروها یا آزمایش‌های لازم…" />
        <Button className="mt-3 w-full" onClick={async () => {
          const ok = await runOk(() => completeAppointment(open!.id, rx), 'ویزیت ثبت شد')
          if (ok) setOpen(undefined)
        }}>ثبت و ارسال برای بیمار</Button>
      </Sheet>
    </div>
  )
}
