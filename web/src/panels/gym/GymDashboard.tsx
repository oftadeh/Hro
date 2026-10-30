import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Building2, PenSquare, Pencil, Plus, TrendingUp, Users, Wallet } from 'lucide-react'
import { CreatePostSheet } from '@/modules/fitzone/CreatePost'
import { useDB } from '@/core/db'
import { dayKey, num, toman } from '@/core/format'
import { Badge, Button, Card, Cover, Empty, PageHeader, SectionTitle, Stars, Stat } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { MiniBars } from '../shared/MiniBars'
import { GymSchedule } from './GymSchedule'

export default function GymDashboard() {
  const me = useMe()!
  const gyms = useDB((s) => s.gyms)
  const checkins = useDB((s) => s.checkins)
  const txs = useDB((s) => s.transactions)
  const bal = useBalance(me.id)
  const [postGym, setPostGym] = useState<string>()
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
      <SectionTitle title="باشگاه‌های من" />
      {mine.length === 0 && <Empty icon="" title="هنوز باشگاهی ثبت نکرده‌اید" action={<Link to="edit"><Button>ثبت باشگاه</Button></Link>} />}
      <div className="grid gap-4 md:grid-cols-2">
        {mine.map((g) => (
          <Card key={g.id} className="overflow-hidden p-0">
            <Cover gradient={g.cover} image={g.media.find((m) => m.type === 'image')?.url} emoji="" className="h-28">
              <div className="absolute right-3 top-3">{g.approved ? <Badge color="emerald">فعال در فیت‌یاب</Badge> : <Badge color="amber">در انتظار تایید مدیر</Badge>}</div>
            </Cover>
            <div className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{g.name}{g.branch && <span className="font-normal text-ink-500"> · {g.branch}</span>}</div>
                <div className="text-xs text-ink-500">{toman(g.sessionPrice)} / سانس · {num(myCheckins.filter((c) => c.gymId === g.id).length)} ورود</div>
                <Stars value={g.rating} count={g.reviews} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Link to={`edit/${g.id}`}><Button size="sm" variant="outline" className="w-full" icon={<Pencil size={14} />}>ویرایش</Button></Link>
                <Link to={`edit?from=${g.id}`}><Button size="sm" variant="ghost" className="w-full" icon={<Plus size={14} />}>افزودن شعبه</Button></Link>
                {g.approved && <Button size="sm" variant="secondary" icon={<PenSquare size={14} />} onClick={() => setPostGym(g.id)}>پست در فیت‌زون</Button>}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {mine.some((g) => g.approved) && (
        <>
          <SectionTitle title="تعطیلی و لغو نوبت" />
          <div className="grid gap-4 lg:grid-cols-2">
            {mine.filter((g) => g.approved).map((g) => <GymSchedule key={g.id} gym={g} />)}
          </div>
        </>
      )}
      <CreatePostSheet open={!!postGym} onClose={() => setPostGym(undefined)} gymId={postGym} />
    </div>
  )
}
