import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { timeAgo } from '@/core/format'
import { markNotificationsRead } from '@/core/services/engagement'
import { Card, Empty, PageHeader } from '@/ui/kit'
import { useMe } from '@/ui/hooks'

export default function Notifications() {
  const me = useMe()!
  const all = useDB((s) => s.notifications)
  const mine = all.filter((n) => n.userId === me.id)
  useEffect(() => {
    const t = setTimeout(markNotificationsRead, 1500)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="animate-fade-up">
      <PageHeader title="اعلان‌ها" />
      {mine.length ? (
        <Card className="divide-y divide-ink-100 p-0 dark:divide-white/5">
          {mine.slice(0, 60).map((n) => {
            const body = (
              <div className={clsx('flex gap-3 p-4', !n.read && 'bg-emerald-50/60 dark:bg-emerald-500/5')}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-lg dark:bg-white/5">{n.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{n.title}</div>
                  <div className="text-xs leading-6 text-ink-500">{n.body}</div>
                  <div className="text-[11px] text-ink-400">{timeAgo(n.at)}</div>
                </div>
                {!n.read && <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />}
              </div>
            )
            return n.link ? <Link key={n.id} to={n.link} className="block hover:bg-ink-50 dark:hover:bg-white/5">{body}</Link> : <div key={n.id}>{body}</div>
          })}
        </Card>
      ) : (
        <Empty icon="🔔" title="اعلانی نداری" />
      )}
    </div>
  )
}
