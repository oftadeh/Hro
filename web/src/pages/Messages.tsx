import { Link } from 'react-router-dom'
import { useDB } from '@/core/db'
import { timeAgo } from '@/core/format'
import { Avatar, Badge, Card, Empty, PageHeader } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'

export default function Messages() {
  const me = useMe()!
  const threads = useDB((s) => s.threads)
  const users = useUserMap()
  const mine = threads.filter((t) => t.members.includes(me.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return (
    <div className="animate-fade-up">
      <PageHeader title="پیام‌ها" subtitle="گفتگو با مربیان، پزشکان و دوستان" />
      {mine.length ? (
        <Card className="divide-y divide-ink-100 p-0 dark:divide-white/5">
          {mine.map((t) => {
            const other = users[t.members.find((m) => m !== me.id)!]
            const last = t.messages[t.messages.length - 1]
            return (
              <Link key={t.id} to={`/messages/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-ink-50 dark:hover:bg-white/5">
                <Avatar name={other?.name ?? '?'} src={other?.avatar} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{other?.name}</span>
                    <Badge color={t.context === 'doctor' ? 'sky' : t.context === 'coach' ? 'violet' : 'slate'}>{t.context === 'doctor' ? 'پزشک' : t.context === 'coach' ? 'مربی' : 'دوست'}</Badge>
                  </div>
                  <div className="truncate text-xs text-ink-500">{last?.text ?? 'گفتگو را شروع کنید'}</div>
                </div>
                <span className="text-[11px] text-ink-400">{timeAgo(t.updatedAt)}</span>
              </Link>
            )
          })}
        </Card>
      ) : (
        <Empty icon="💬" title="هنوز گفتگویی نداری" desc="از فیت‌یار با یک مربی چت کن." />
      )}
    </div>
  )
}
