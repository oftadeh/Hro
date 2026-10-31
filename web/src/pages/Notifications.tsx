import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { timeAgo } from '@/core/format'
import { clearNotifications, deleteNotification, markNotificationsRead } from '@/core/services/engagement'
import { Button, Card, Empty, PageHeader } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { run, ask } from '@/ui/toast'
import { Bell, Trash2, X } from 'lucide-react'

export default function Notifications() {
  const me = useMe()!
  const all = useDB((s) => s.notifications)
  const mine = all.filter((n) => n.userId === me.id)
  useEffect(() => {
    const t = setTimeout(markNotificationsRead, 1500)
    return () => clearTimeout(t)
  }, [])
  const clearAll = async () => {
    if ((await ask('همه‌ی اعلان‌ها پاک شود؟'))) run(() => clearNotifications(), 'اعلان‌ها پاک شد')
  }
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="اعلان‌ها"
        actions={
          mine.length > 0 && (
            <Button size="sm" variant="ghost" className="text-coral-500" icon={<Trash2 size={15} />} onClick={clearAll}>
              پاک کردن همه
            </Button>
          )
        }
      />
      {mine.length ? (
        <Card className="divide-y divide-ink-100 p-0 dark:divide-white/5">
          {mine.slice(0, 60).map((n) => {
            const body = (
              <div className="flex min-w-0 flex-1 gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border hairline text-ink-500"><Bell size={15} strokeWidth={1.5} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="text-xs leading-6 text-ink-500">{n.body}</div>
                  <div className="text-[12px] text-ink-400">{timeAgo(n.at)}</div>
                </div>
                {!n.read && <span className="mt-2 h-2 w-2 rounded-full bg-brand-500" />}
              </div>
            )
            return (
              <div key={n.id} className={clsx('flex items-start', !n.read && 'bg-brand-50/60 dark:bg-brand-500/5')}>
                {n.link ? <Link to={n.link} className="flex min-w-0 flex-1 hover:bg-ink-50 dark:hover:bg-white/5">{body}</Link> : body}
                <button
                  onClick={() => run(() => deleteNotification(n.id))}
                  className="m-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-900/[.05] hover:text-coral-500 dark:hover:bg-white/[.06]"
                  aria-label="حذف اعلان"
                >
                  <X size={15} strokeWidth={1.5} />
                </button>
              </div>
            )
          })}
        </Card>
      ) : (
        <Empty icon="" title="اعلانی نداری" />
      )}
    </div>
  )
}
