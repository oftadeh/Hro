import { Link } from 'react-router-dom'
import { ClipboardList, MessageCircle, Star, Wallet } from 'lucide-react'
import { useDB } from '@/core/db'
import { num, timeAgo, toman } from '@/core/format'
import { saveCoachProfile } from '@/core/services/fityar'
import { Avatar, Button, Card, Empty, PageHeader, SectionTitle, Stat } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'

export default function CoachDashboard() {
  const me = useMe()!
  const coach = useDB((s) => s.coaches.find((c) => c.userId === me.id))
  const orders = useDB((s) => s.planOrders)
  const threads = useDB((s) => s.threads)
  const txs = useDB((s) => s.transactions)
  const users = useUserMap()
  const mine = orders.filter((o) => o.coachId === me.id)
  const pending = mine.filter((o) => o.status === 'pending')
  const net = txs.filter((t) => t.to === me.id && t.module === 'fityar').reduce((a, t) => a + t.amount - t.commission, 0)
  const chats = threads.filter((t) => t.members.includes(me.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="پنل مربی"
        subtitle="مدیریت شاگردان، برنامه‌ها و گفتگوها در فیت‌یار"
        actions={
          coach && (
            <Button size="sm" variant={coach.online ? 'primary' : 'outline'} onClick={() => saveCoachProfile({ online: !coach.online })}>
              {coach.online ? 'آنلاین' : 'آفلاین'}
            </Button>
          )
        }
      />
      {!coach?.plans.length && (
        <Card className="mb-4 border-brand-200 bg-brand-50 text-sm dark:border-brand-500/20 dark:bg-brand-500/10">
          هنوز پکیجی تعریف نکرده‌اید. <Link to="profile" className="font-semibold text-brand-700 underline dark:text-brand-300">پروفایل و پکیج‌ها را تکمیل کنید</Link> تا در فیت‌یار دیده شوید.
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="سفارش در انتظار" value={num(pending.length)} icon={<ClipboardList size={18} />} tone="violet" />
        <Stat tone="sky" label="شاگردان" value={num(coach?.students ?? 0)} icon={<Star size={18} />} />
        <Stat label="گفتگوها" value={num(chats.length)} icon={<MessageCircle size={18} />} tone="emerald" />
        <Stat label="درآمد خالص" value={toman(net)} icon={<Wallet size={18} />} tone="amber" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <SectionTitle title="سفارش‌های در انتظار" action={<Link to="orders" className="text-xs font-semibold text-brand-600">همه</Link>} />
          {pending.length === 0 && <Empty icon="" title="همه‌ی برنامه‌ها تحویل شده" />}
          <div className="space-y-2">
            {pending.slice(0, 5).map((o) => (
              <Link to="orders" key={o.id}>
                <Card className="flex items-center gap-3 py-3">
                  <Avatar name={users[o.userId]?.name ?? ''} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{users[o.userId]?.name}</div>
                    <div className="truncate text-xs text-ink-500">{o.title}</div>
                  </div>
                  <span className="text-[12px] text-ink-400">{timeAgo(o.createdAt)}</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle title="آخرین گفتگوها" />
          {chats.length === 0 && <Empty icon="" title="گفتگویی نیست" />}
          <div className="space-y-2">
            {chats.slice(0, 5).map((t) => {
              const other = users[t.members.find((m) => m !== me.id)!]
              return (
                <Link to={`/messages/${t.id}`} key={t.id}>
                  <Card className="flex items-center gap-3 py-3">
                    <Avatar name={other?.name ?? ''} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{other?.name}</div>
                      <div className="truncate text-xs text-ink-500">{t.messages[t.messages.length - 1]?.text}</div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
