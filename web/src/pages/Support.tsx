import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LifeBuoy, Plus } from 'lucide-react'
import { useDB } from '@/core/db'
import { timeAgo } from '@/core/format'
import { createTicket, TICKET_CATEGORY, TICKET_STATUS } from '@/core/services/support'
import type { Ticket } from '@/core/types'
import { Badge, Button, Card, Empty, Field, Input, PageHeader, Select, Sheet, Textarea } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { run } from '@/ui/toast'

const FAQ = [
  ['بلیت باشگاه را چطور لغو کنم؟', 'از «بلیت‌های من» بلیت را باز کنید و «لغو و بازگشت وجه» را بزنید. سانس آزاد تا قبل از ورود و کلاس تا ۲ ساعت قبل از شروع قابل لغو است.'],
  ['اعتبار اشتراک چطور مصرف می‌شود؟', 'هزینه‌ی هر ورود یا کلاس از اعتبار ریالی اشتراک کم می‌شود. در ساعات خلوت برخی باشگاه‌ها تخفیف دارند و اعتبار شما بیشتر کار می‌کند.'],
  ['کیف پولم را چطور به حساب بانکی برگردانم؟', 'کسب‌وکارها از پنل خود «درخواست تسویه» ثبت می‌کنند و پس از تأیید، مبلغ به شبا واریز می‌شود.'],
  ['اطلاعات سلامت و چرخه‌ی من را چه کسی می‌بیند؟', 'هیچ‌کس، مگر خودتان در «پرونده‌ی پزشکی» به مربی یا پزشک خود اجازه دهید.'],
]

export default function Support() {
  const me = useMe()!
  const nav = useNavigate()
  const all = useDB((s) => s.tickets)
  const tickets = all.filter((t) => t.userId === me.id)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ subject: '', category: 'other' as Ticket['category'], text: '' })
  return (
    <div className="animate-fade-up">
      <PageHeader back title="پشتیبانی" subtitle="پاسخ‌گویی در کمتر از ۲۴ ساعت" actions={<Button size="sm" icon={<Plus size={15} />} onClick={() => setOpen(true)}>تیکت جدید</Button>} />
      <div className="space-y-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="rounded-3xl bg-white p-4 shadow-card dark:bg-ink-850 dark:shadow-none">
            <summary className="cursor-pointer text-sm font-medium">{q}</summary>
            <p className="mt-2 text-xs leading-6 text-ink-500">{a}</p>
          </details>
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-display text-2xl">تیکت‌های من</h2>
      {tickets.length === 0 && <Empty title="تیکتی ندارید" desc="اگر سؤال یا مشکلی دارید، تیکت جدید ثبت کنید." />}
      <div className="space-y-2">
        {tickets.map((t) => (
          <Link key={t.id} to={`/support/${t.id}`}>
            <Card className="flex items-center gap-3">
              <LifeBuoy size={18} className="text-ink-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.subject}</div>
                <div className="text-[11px] text-ink-400">{TICKET_CATEGORY[t.category]} · {timeAgo(t.updatedAt)}</div>
              </div>
              <Badge color={t.status === 'answered' ? 'emerald' : t.status === 'open' ? 'amber' : 'slate'}>{TICKET_STATUS[t.status]}</Badge>
            </Card>
          </Link>
        ))}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="تیکت جدید">
        <div className="space-y-3">
          <Field label="موضوع"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
          <Field label="دسته">
            <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Ticket['category'] })}>
              {Object.entries(TICKET_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="توضیحات"><Textarea value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></Field>
          <Button className="w-full" onClick={async () => { const id = await run(() => createTicket(f.subject, f.category, f.text), 'تیکت ثبت شد'); if (id) { setOpen(false); nav(`/support/${id}`) } }}>ثبت تیکت</Button>
        </div>
      </Sheet>
    </div>
  )
}
