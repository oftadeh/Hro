import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDB } from '@/core/db'
import { faDateTime } from '@/core/format'
import { closeTicket, replyTicket, TICKET_STATUS } from '@/core/services/support'
import { Badge, Button, Empty, PageHeader, Textarea } from '@/ui/kit'
import { run, runOk } from '@/ui/toast'

export default function SupportThread() {
  const { id } = useParams()
  const t = useDB((s) => s.tickets.find((x) => x.id === id))
  const [text, setText] = useState('')
  if (!t) return <Empty title="تیکت یافت نشد" />
  return (
    <div className="animate-fade-up">
      <PageHeader back="/support" title={t.subject} actions={<Badge color={t.status === 'answered' ? 'emerald' : t.status === 'open' ? 'amber' : 'slate'}>{TICKET_STATUS[t.status]}</Badge>} />
      <div className="space-y-3">
        {t.messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-3xl p-4 text-sm leading-7 ${m.staff ? 'mr-auto bg-brand-400/15' : 'bg-white shadow-card dark:bg-ink-850 dark:shadow-none'}`}>
            <div className="mb-1 text-[10px] text-ink-400">{m.staff ? 'پشتیبانی کی‌فیت' : 'شما'} · {faDateTime(m.at)}</div>
            <div className="whitespace-pre-line">{m.text}</div>
          </div>
        ))}
      </div>
      {t.status !== 'closed' && (
        <div className="mt-6 space-y-2">
          <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="پیام شما…" />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={async () => { if (await runOk(() => replyTicket(t.id, text))) setText('') }}>ارسال</Button>
            <Button variant="ghost" onClick={() => run(() => closeTicket(t.id), 'تیکت بسته شد')}>مشکل حل شد</Button>
          </div>
        </div>
      )}
    </div>
  )
}
