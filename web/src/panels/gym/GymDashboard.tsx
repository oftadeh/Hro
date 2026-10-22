import { Link } from 'react-router-dom'
import { Building2, Pencil, Plus, TrendingUp, Users, Wallet } from 'lucide-react'
import { useDB } from '@/core/db'
import { dayKey, num, toman } from '@/core/format'
import { Badge, Button, Card, Cover, Empty, PageHeader, SectionTitle, Stars, Stat } from '@/ui/kit'
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
  const today = myCheckins.filter((c) => dayKey(new Date(c.createdAt)) === dayKey())
  const income = txs.filter((t) => t.to === me.id && t.type === 'checkin')
  const net = income.reduce((a, t) => a + t.amount - t.commission, 0)

  const days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const k = dayKey(d)
    return { label: new Intl.DateTimeFormat('fa-IR', { weekday: 'narrow' }).format(d), value: myCheckins.filter((c) => dayKey(new Date(c.createdAt)) === k).length }
  })

  return (
    <div className="animate-fade-up">
      <PageHeader title={`سلام ${me.name.split(' ')[0]} 👋`} subtitle="خلاصه‌ی عملکرد باشگاه‌های شما در فیت‌یاب" actions={<Link to="edit"><Button size="sm" icon={<Plus size={16} />}>باشگاه جدید</Button></Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ورود امروز" value={num(today.length)} icon={<Users size={18} />} />
        <Stat label="کل ورودها" value={num(myCheckins.length)} icon={<TrendingUp size={18} />} tone="sky" />
        <Stat label="درآمد خالص" value={toman(net)} icon={<Wallet size={18} />} tone="violet" />
        <Stat label="موجودی کیف پول" value={toman(bal)} icon={<Building2 size={18} />} tone="amber" />
      </div>
      <Card className="mt-4">
        <div className="mb-2 font-extrabold">ورود ورزشکاران در ۷ روز اخیر</div>
        <MiniBars data={days} />
      </Card>
      <SectionTitle title="باشگاه‌های من" />
      {mine.length === 0 && <Empty icon="🏋️" title="هنوز باشگاهی ثبت نکرده‌اید" action={<Link to="edit"><Button>ثبت باشگاه</Button></Link>} />}
      <div className="grid gap-4 md:grid-cols-2">
        {mine.map((g) => (
          <Card key={g.id} className="overflow-hidden p-0">
            <Cover gradient={g.cover} image={g.media.find((m) => m.type === 'image')?.url} emoji="🏋️" className="h-28">
              <div className="absolute right-3 top-3">{g.approved ? <Badge color="emerald">فعال در فیت‌یاب</Badge> : <Badge color="amber">در انتظار تایید مدیر</Badge>}</div>
            </Cover>
            <div className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{g.name}</div>
                <div className="text-xs text-ink-500">{toman(g.sessionPrice)} / سانس · {num(myCheckins.filter((c) => c.gymId === g.id).length)} ورود</div>
                <Stars value={g.rating} count={g.reviews} />
              </div>
              <Link to={`edit/${g.id}`}><Button size="sm" variant="outline" icon={<Pencil size={14} />}>ویرایش</Button></Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
