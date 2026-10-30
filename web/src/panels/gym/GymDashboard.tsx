import { Link } from 'react-router-dom'
import { Building2, CalendarDays, ClipboardList, Megaphone, Plus, TrendingUp, Users, Wallet } from 'lucide-react'
import { useDB } from '@/core/db'
import { dayKey, num, toman } from '@/core/format'
import { Button, Card, Empty, PageHeader, SectionTitle, Stat } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { MiniBars } from '../shared/MiniBars'

export default function GymDashboard() {
  const me = useMe()!
  const gyms = useDB((s) => s.gyms)
  const checkins = useDB((s) => s.checkins)
  const txs = useDB((s) => s.transactions)
  const bal = useBalance(me.id)
  const mine = gyms.filter((g) => g.ownerId === me.id)
  const ids = mine.map((g) => g.id)
  const myCheckins = checkins.filter((c) => ids.includes(c.gymId))
  const used = myCheckins.filter((c) => c.status === 'used' && c.usedAt)
  const today = used.filter((c) => dayKey(new Date(c.usedAt!)) === dayKey())
  const income = txs.filter((t) => t.to === me.id && t.type === 'checkin')
  const refunds = txs.filter((t) => t.type === 'refund' && t.from === me.id && t.module === 'fityab').reduce((a, t) => a + t.amount, 0)
  const net = income.reduce((a, t) => a + t.amount - t.commission, 0) - refunds
  const cancelled = myCheckins.filter((c) => c.status === 'cancelled').length
  const noShow = myCheckins.filter((c) => c.status === 'expired').length
  // ساعات اوج بر اساس زمان ورود
  const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => ({ label: String(h).replace(/\d/g, (x) => '۰۱۲۳۴۵۶۷۸۹'[+x]), value: used.filter((c) => { const x = new Date(c.usedAt!).getHours(); return x >= h && x < h + 2 }).length }))
  const revenueDays = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const k = dayKey(d)
    return { label: new Intl.DateTimeFormat('fa-IR', { weekday: 'narrow' }).format(d), value: Math.round(income.filter((t) => dayKey(new Date(t.createdAt)) === k).reduce((a, t) => a + t.amount - t.commission, 0) / 1000) }
  })

  const days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const k = dayKey(d)
    return { label: new Intl.DateTimeFormat('fa-IR', { weekday: 'narrow' }).format(d), value: used.filter((c) => dayKey(new Date(c.usedAt!)) === k).length }
  })

  return (
    <div className="animate-fade-up">
      <PageHeader title={`سلام ${me.name.split(' ')[0]}`} subtitle="خلاصه‌ی عملکرد باشگاه‌های شما در فیت‌یاب" actions={<Link to="edit"><Button size="sm" icon={<Plus size={16} />}>باشگاه جدید</Button></Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="violet" label="ورود امروز" value={num(today.length)} icon={<Users size={18} />} />
        <Stat label="کل ورودها" value={num(myCheckins.length)} icon={<TrendingUp size={18} />} tone="sky" />
        <Stat label="درآمد خالص" value={toman(net)} icon={<Wallet size={18} />} tone="emerald" />
        <Stat label="موجودی کیف پول" value={toman(bal)} icon={<Building2 size={18} />} tone="amber" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="mb-2 font-semibold">ورود ورزشکاران در ۷ روز اخیر</div>
          <MiniBars data={days} />
        </Card>
        <Card>
          <div className="mb-2 font-semibold">درآمد خالص روزانه (هزار تومان)</div>
          <MiniBars data={revenueDays} />
        </Card>
        <Card>
          <div className="mb-2 font-semibold">ساعات اوج ورود</div>
          <MiniBars data={hours} />
          <div className="mt-2 text-[12px] text-ink-500">لغو: {num(cancelled)} · عدم حضور: {num(noShow)} — برای پر کردن ساعات کم‌تردد، «تخفیف ساعات خلوت» را در ویرایش باشگاه فعال کنید.</div>
        </Card>
      </div>
      <SectionTitle title="دسترسی سریع" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { to: 'checkins', title: 'پذیرش ورود', desc: `${num(today.length)} ورود امروز`, icon: ClipboardList },
          { to: 'gyms', title: 'باشگاه‌ها و شعبه‌ها', desc: `${num(mine.length)} مجموعه`, icon: Building2 },
          { to: 'schedule', title: 'برنامه و تعطیلی', desc: 'لغو نوبت، روز تعطیل', icon: CalendarDays },
          { to: 'members', title: 'اعضا و کمپین', desc: 'پیشنهاد به ورزشکاران', icon: Megaphone },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="press flex items-center gap-3 rounded-[22px] bg-white p-4 shadow-card dark:bg-ink-850 dark:shadow-none">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-400/15 text-brand-600 dark:text-brand-300"><q.icon size={18} /></span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{q.title}</span>
              <span className="block truncate text-xs text-ink-500">{q.desc}</span>
            </span>
          </Link>
        ))}
      </div>
      {mine.length === 0 && <Empty title="هنوز باشگاهی ثبت نکرده‌اید" action={<Link to="edit"><Button>ثبت باشگاه</Button></Link>} />}
    </div>
  )
}
