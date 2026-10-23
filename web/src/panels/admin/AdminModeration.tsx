import { useState } from 'react'
import { useDB } from '@/core/db'
import { faDateTime } from '@/core/format'
import { resolveReport } from '@/core/services/admin'
import type { Report } from '@/core/types'
import { Badge, Button, Card, Empty, PageHeader, Tabs } from '@/ui/kit'
import { useUserMap } from '@/ui/hooks'
import { run } from '@/ui/toast'

const KIND: Record<Report['kind'], string> = { post: 'پست', comment: 'نظر', user: 'کاربر', story: 'استوری', listing: 'آگهی بازار' }

export default function AdminModeration() {
  const reports = useDB((s) => s.reports)
  const posts = useDB((s) => s.posts)
  const listings = useDB((s) => s.listings)
  const users = useUserMap()
  const [tab, setTab] = useState<'open' | 'done'>('open')
  // گزارش‌های تکراری یک مورد با هم نمایش داده می‌شوند
  const list = reports.filter((r) => (tab === 'open' ? r.status === 'open' : r.status !== 'open'))
  const groups = [...new Map(list.map((r) => [r.refId, r])).values()]
  const content = (r: Report) => {
    if (r.kind === 'post') return posts.find((p) => p.id === r.refId)?.text ?? '(حذف شده)'
    if (r.kind === 'comment') return posts.find((p) => p.id === r.parentId)?.comments.find((c) => c.id === r.refId)?.text ?? '(حذف شده)'
    if (r.kind === 'user') return users[r.refId]?.name ?? ''
    if (r.kind === 'listing') { const l = listings.find((x) => x.id === r.refId); return l ? `${l.title} — ${l.description}` : '(حذف شده)' }
    return ''
  }
  const author = (r: Report) => {
    if (r.kind === 'post') return users[posts.find((p) => p.id === r.refId)?.authorId ?? '']?.name
    if (r.kind === 'comment') return users[posts.find((p) => p.id === r.parentId)?.comments.find((c) => c.id === r.refId)?.authorId ?? '']?.name
    if (r.kind === 'listing') return users[listings.find((x) => x.id === r.refId)?.sellerId ?? '']?.name
    return users[r.refId]?.name
  }
  return (
    <div className="animate-fade-up">
      <PageHeader title="گزارش تخلف" subtitle="پست‌هایی که ۳ گزارش باز داشته باشند خودکار تا بررسی پنهان می‌شوند" />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ value: 'open', label: 'باز' }, { value: 'done', label: 'رسیدگی‌شده' }]} />
      {groups.length === 0 && <Empty title="گزارشی نیست" />}
      <div className="space-y-3">
        {groups.map((r) => {
          const count = list.filter((x) => x.refId === r.refId).length
          return (
            <Card key={r.id}>
              <div className="flex items-center gap-2 text-xs">
                <Badge color="rose">{KIND[r.kind]}</Badge>
                <span className="text-ink-500">نویسنده: {author(r)}</span>
                <span className="mr-auto text-ink-400">{faDateTime(r.createdAt)}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-7">{content(r)}</p>
              <div className="mt-2 text-[11px] text-ink-500">
                {count} گزارش · دلیل: {r.reason}
              </div>
              {r.status === 'open' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="danger" onClick={() => run(() => resolveReport(r.id, 'remove'), 'محتوا حذف شد')}>حذف محتوا</Button>
                  <Button size="sm" variant="secondary" onClick={() => run(() => resolveReport(r.id, 'ban'), 'کاربر مسدود شد')}>حذف و مسدودی کاربر</Button>
                  <Button size="sm" variant="ghost" onClick={() => run(() => resolveReport(r.id, 'dismiss'), 'گزارش رد شد')}>رد گزارش</Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
