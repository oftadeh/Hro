import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarClock, MapPin, Ticket } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, toman } from '@/core/format'
import { answerEntryRequest, priceAt, ticketStatus } from '@/core/services/fityab'
import { activeSubscription } from '@/core/services/wallet'
import { Badge, Button, Card, Empty, PageHeader, Tabs } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { runOk } from '@/ui/toast'
import { PaySheet, TICKET_STATUS, TicketSheet } from '@/modules/fityab/TicketView'

export default function Tickets() {
  const me = useMe()!
  const [params, setParams] = useSearchParams()
  const checkins = useDB((s) => s.checkins)
  const gyms = useDB((s) => s.gyms)
  const requests = useDB((s) => s.entryRequests)
  useDB((s) => s.subscriptions)
  const sub = activeSubscription(me.id)
  const bal = useBalance(me.id)
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [open, setOpen] = useState<string>()
  const mine = checkins.filter((c) => c.userId === me.id)
  const list = mine.filter((c) => (tab === 'active' ? ticketStatus(c) === 'active' : ticketStatus(c) !== 'active'))
  const pending = requests.filter((r) => r.userId === me.id && r.status === 'pending' && Date.now() - new Date(r.createdAt).getTime() < 30 * 60_000)
  const reqId = params.get('req')
  const req = pending.find((r) => r.id === reqId)
  const reqGym = req && gyms.find((g) => g.id === req.gymId)
  const ticket = mine.find((c) => c.id === open)

  return (
    <div className="animate-fade-up">
      <PageHeader title="بلیت‌های من" subtitle="ورود به باشگاه و کلاس‌های رزروشده" />

      {pending.map((r) => {
        const g = gyms.find((x) => x.id === r.gymId)
        if (!g) return null
        return (
          <div key={r.id} className="mb-4 rounded-3xl grad-peach p-5 text-ink-950">
            <div className="text-xs opacity-60">درخواست ورود از پذیرش</div>
            <div className="mt-1 font-display text-2xl">{g.name}</div>
            <p className="mt-1 text-xs opacity-70">پذیرش باشگاه برای ورود شما درخواست ثبت کرده است. با تأیید، {toman(priceAt(g).price)} پرداخت و ورود ثبت می‌شود.</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="dark" onClick={() => setParams({ req: r.id })}>
                تأیید و پرداخت
              </Button>
              <Button size="sm" variant="ghost" onClick={() => runOk(() => answerEntryRequest(r.id, false), 'درخواست رد شد')}>
                رد درخواست
              </Button>
            </div>
          </div>
        )
      })}

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'active', label: 'فعال' },
          { value: 'history', label: 'سابقه' },
        ]}
      />
      {list.length ? (
        <div className="space-y-3">
          {list.map((c) => {
            const g = gyms.find((x) => x.id === c.gymId)
            const cls = c.classId ? g?.classes?.find((k) => k.id === c.classId) : undefined
            const st = ticketStatus(c)
            return (
              <Card key={c.id} onClick={() => setOpen(c.id)} className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl grad-lavender text-ink-950">{cls ? <CalendarClock size={20} /> : <Ticket size={20} />}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{cls ? `کلاس ${cls.title}` : 'سانس آزاد'} · {g?.name}</div>
                  <div className="mt-0.5 text-[11px] text-ink-500">{c.slotAt ? faDateTime(c.slotAt) : faDateTime(c.usedAt ?? c.createdAt)} · {toman(c.paid ?? c.price)}</div>
                </div>
                <Badge color={TICKET_STATUS[st].color}>{TICKET_STATUS[st].label}</Badge>
              </Card>
            )
          })}
        </div>
      ) : (
        <Empty
          title={tab === 'active' ? 'بلیت فعالی ندارید' : 'سابقه‌ای وجود ندارد'}
          desc="از فیت‌یاب یک باشگاه یا کلاس انتخاب کنید."
          action={
            <Link to="/fityab">
              <Button size="sm" icon={<MapPin size={15} />}>
                باشگاه‌های اطراف
              </Button>
            </Link>
          }
        />
      )}

      <TicketSheet ticket={ticket} gym={gyms.find((g) => g.id === ticket?.gymId)} onClose={() => setOpen(undefined)} />
      {req && reqGym && (
        <PaySheet
          open
          onClose={() => setParams({})}
          title={`ورود به ${reqGym.name}`}
          desc="با پرداخت، ورود شما فوراً در پذیرش ثبت می‌شود."
          price={priceAt(reqGym).price}
          credit={sub?.credit}
          balance={bal}
          onPay={async (prefer) => {
            if (await runOk(() => answerEntryRequest(req.id, true, prefer), 'ورود ثبت شد. تمرین خوبی داشته باشی!')) setParams({})
          }}
        />
      )}
    </div>
  )
}
