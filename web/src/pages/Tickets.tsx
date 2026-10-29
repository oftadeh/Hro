import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { CalendarClock, MapPin, QrCode, Ticket } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, toman } from '@/core/format'
import { answerEntryRequest, priceAt, ticketStatus } from '@/core/services/fityab'
import { activeSubscription } from '@/core/services/wallet'
import { Badge, Button, Card, Empty, PageHeader, Tabs, toneFor } from '@/ui/kit'
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
          <div key={r.id} className="anim-enter mb-4 rounded-[26px] card-peach p-5 text-ink-950">
            <div className="text-[13px] opacity-70">درخواست ورود از پذیرش</div>
            <div className="mt-1 text-[22px] font-extrabold">{g.name}</div>
            <p className="mt-1 text-[13px] leading-6 opacity-75">پذیرش باشگاه برای ورود شما درخواست ثبت کرده است. با تأیید، {toman(priceAt(g).price)} پرداخت و ورود ثبت می‌شود.</p>
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
              st === 'active' ? (
                <button key={c.id} onClick={() => setOpen(c.id)} className={clsx('press relative flex w-full items-stretch overflow-hidden rounded-[26px] text-start text-ink-950', toneFor(c.id))}>
                  <div className="min-w-0 flex-1 p-4">
                    <div className="text-[13px] font-medium opacity-70">{cls ? `کلاس ${cls.title}` : 'سانس آزاد'}</div>
                    <div className="mt-0.5 truncate text-[19px] font-extrabold">{g?.name}</div>
                    <div className="mt-3 flex items-center gap-1.5 text-[13px] font-medium opacity-80">
                      <CalendarClock size={15} /> {c.slotAt ? faDateTime(c.slotAt) : faDateTime(c.createdAt)}
                    </div>
                  </div>
                  {/* خط پرفراژ بلیت */}
                  <span aria-hidden className="relative w-px border-r-2 border-dashed border-ink-950/25">
                    <span className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-ink-50 dark:bg-ink-950" />
                    <span className="absolute -bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-ink-50 dark:bg-ink-950" />
                  </span>
                  <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 p-3">
                    <QrCode size={30} strokeWidth={1.6} />
                    <span className="text-[12px] font-semibold">نمایش بلیت</span>
                  </div>
                </button>
              ) : (
                <Card key={c.id} onClick={() => setOpen(c.id)} className="press flex items-center gap-3">
                  <span className={clsx('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-ink-950', toneFor(c.id))}>{cls ? <CalendarClock size={20} /> : <Ticket size={20} />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{cls ? `کلاس ${cls.title}` : 'سانس آزاد'} · {g?.name}</div>
                    <div className="mt-0.5 text-[12px] text-ink-500">{c.slotAt ? faDateTime(c.slotAt) : faDateTime(c.usedAt ?? c.createdAt)} · {toman(c.paid ?? c.price)}</div>
                  </div>
                  <Badge color={TICKET_STATUS[st].color}>{TICKET_STATUS[st].label}</Badge>
                </Card>
              )
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
