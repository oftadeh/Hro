import { useState } from 'react'
import { useDB } from '@/core/db'
import { faDateTime, toman } from '@/core/format'
import { deliverPlan } from '@/core/services/fityar'
import type { PlanOrder } from '@/core/types'
import { Avatar, Badge, Button, Card, Empty, PageHeader, Sheet, Tabs, Textarea } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

const TEMPLATE = `📅 برنامه‌ی هفتگی
روز ۱ — 
روز ۲ — 
روز ۳ — 

🍽️ تغذیه
صبحانه: 
ناهار: 
شام: 

📌 نکات:
`

export default function CoachOrders() {
  const me = useMe()!
  const orders = useDB((s) => s.planOrders)
  const users = useUserMap()
  const [tab, setTab] = useState<'pending' | 'delivered'>('pending')
  const [open, setOpen] = useState<PlanOrder>()
  const [content, setContent] = useState('')
  const list = orders.filter((o) => o.coachId === me.id && o.status === tab)

  return (
    <div className="animate-fade-up">
      <PageHeader title="سفارش برنامه‌ها" />
      <Tabs className="mb-4 max-w-sm" value={tab} onChange={setTab} items={[{ value: 'pending', label: 'در انتظار' }, { value: 'delivered', label: 'تحویل‌شده' }]} />
      {list.length === 0 && <Empty icon="📋" title="سفارشی در این بخش نیست" />}
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((o) => (
          <Card key={o.id}>
            <div className="flex items-center gap-3">
              <Avatar name={users[o.userId]?.name ?? ''} size={42} />
              <div className="flex-1">
                <div className="font-bold">{users[o.userId]?.name}</div>
                <div className="text-xs text-ink-500">{o.title} · {toman(o.price)}</div>
              </div>
              <Badge color={o.status === 'pending' ? 'amber' : 'emerald'}>{o.status === 'pending' ? 'در انتظار' : 'تحویل شد'}</Badge>
            </div>
            <div className="mt-3 rounded-2xl bg-ink-50 p-3 text-xs leading-6 dark:bg-white/5">📝 {o.answers}</div>
            <div className="mt-2 text-[11px] text-ink-400">{faDateTime(o.createdAt)}</div>
            {o.status === 'pending' ? (
              <Button className="mt-3 w-full" onClick={() => { setOpen(o); setContent(TEMPLATE) }}>نوشتن و تحویل برنامه</Button>
            ) : (
              <details className="mt-3 text-sm"><summary className="cursor-pointer text-xs font-bold text-emerald-600">مشاهده‌ی برنامه</summary><div className="mt-2 whitespace-pre-line leading-7">{o.content}</div></details>
            )}
          </Card>
        ))}
      </div>
      <Sheet open={!!open} onClose={() => setOpen(undefined)} title={`برنامه برای ${open ? users[open.userId]?.name : ''}`} wide>
        <Textarea rows={14} value={content} onChange={(e) => setContent(e.target.value)} />
        <Button className="mt-3 w-full" onClick={async () => {
          const ok = await runOk(() => deliverPlan(open!.id, content), 'برنامه تحویل شد 🎯')
          if (ok) setOpen(undefined)
        }}>تحویل به ورزشکار</Button>
      </Sheet>
    </div>
  )
}
