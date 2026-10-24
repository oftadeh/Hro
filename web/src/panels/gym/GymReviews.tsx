import { useState } from 'react'
import { MessageSquareReply } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDate } from '@/core/format'
import { replyReview } from '@/core/services/commerce'
import { Avatar, Button, Card, Empty, PageHeader, Stars, Textarea } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

/** نظرات ورزشکاران درباره‌ی باشگاه‌های من و پاسخ به آن‌ها */
export default function GymReviews() {
  const me = useMe()!
  const gyms = useDB((s) => s.gyms)
  const reviews = useDB((s) => s.reviews)
  const users = useUserMap()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const mine = gyms.filter((g) => g.ownerId === me.id)
  const list = reviews.filter((r) => r.kind === 'gym' && mine.some((g) => g.id === r.refId))
  return (
    <div className="animate-fade-up">
      <PageHeader title="نظرات ورزشکاران" subtitle="پاسخ محترمانه به نظرات، اعتماد کاربران جدید را بیشتر می‌کند" />
      {list.length === 0 && <Empty title="هنوز نظری ثبت نشده است" />}
      <div className="space-y-3">
        {list.map((r) => {
          const u = users[r.userId]
          return (
            <Card key={r.id} className="p-5">
              <div className="flex items-center gap-2">
                <Avatar name={u?.name ?? ''} src={u?.avatar} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{u?.name}</div>
                  <div className="text-[12px] text-ink-400">
                    {mine.find((g) => g.id === r.refId)?.name} · {faDate(r.createdAt)}
                  </div>
                </div>
                <Stars value={r.stars} />
              </div>
              {r.text && <p className="mt-3 text-sm leading-7 text-ink-600 dark:text-ink-300">{r.text}</p>}
              {r.reply ? (
                <p className="mt-3 rounded-2xl bg-ink-900/[.04] p-3 text-xs leading-6 dark:bg-white/[.05]">پاسخ شما: {r.reply}</p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Textarea rows={1} value={draft[r.id] ?? ''} onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })} placeholder="پاسخ به این نظر…" />
                  <Button variant="secondary" icon={<MessageSquareReply size={16} />} onClick={() => runOk(() => replyReview(r.id, draft[r.id] ?? ''), 'پاسخ ثبت شد')} />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
