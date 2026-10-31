import { useState } from 'react'
import { useDB } from '@/core/db'
import { faDateTime } from '@/core/format'
import { closeTicket, replyTicket, TICKET_CATEGORY, TICKET_STATUS } from '@/core/services/support'
import { Badge, Button, Card, Empty, PageHeader, Tabs, Textarea } from '@/ui/kit'
import { useUserMap } from '@/ui/hooks'
import { runOk, run } from '@/ui/toast'

export default function AdminSupport() {
  const tickets = useDB((s) => s.tickets)
  const users = useUserMap()
  const [tab, setTab] = useState<'open' | 'answered' | 'closed'>('open')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const list = tickets.filter((t) => t.status === tab)
  return (
    <div className="animate-fade-up">
      <PageHeader title="پشتیبانی" subtitle="تیکت‌های کاربران و کسب‌وکارها" />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ value: 'open', label: `در انتظار (${tickets.filter((t) => t.status === 'open').length})` }, { value: 'answered', label: 'پاسخ داده شده' }, { value: 'closed', label: 'بسته' }]} />
      {list.length === 0 && <Empty title="تیکتی نیست" />}
      <div className="space-y-3">
        {list.map((t) => (
          <Card key={t.id}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{t.subject}</span>
              <Badge>{TICKET_CATEGORY[t.category]}</Badge>
              <Badge color={t.status === 'open' ? 'amber' : t.status === 'answered' ? 'emerald' : 'slate'}>{TICKET_STATUS[t.status]}</Badge>
              <span className="mr-auto text-[12px] text-ink-400">{users[t.userId]?.name} · {users[t.userId]?.phone}</span>
            </div>
            <div className="mt-3 space-y-2">
              {t.messages.map((m, i) => (
                <div key={i} className={`rounded-2xl p-3 text-xs leading-6 ${m.staff ? 'bg-brand-400/10' : 'bg-ink-900/[.04] dark:bg-white/[.05]'}`}>
                  <div className="mb-1 text-[12px] text-ink-400">{m.staff ? 'پشتیبانی' : users[m.from]?.name} · {faDateTime(m.at)}</div>
                  {m.text}
                </div>
              ))}
            </div>
            {t.status !== 'closed' && (
              <div className="mt-3 flex gap-2">
                <Textarea rows={2} value={draft[t.id] ?? ''} onChange={(e) => setDraft({ ...draft, [t.id]: e.target.value })} placeholder="پاسخ پشتیبانی…" />
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={async () => { if (await runOk(() => replyTicket(t.id, draft[t.id] ?? ''), 'پاسخ ارسال شد')) setDraft({ ...draft, [t.id]: '' }) }}>ارسال</Button>
                  <Button size="sm" variant="ghost" onClick={() => run(() => closeTicket(t.id))}>بستن</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
