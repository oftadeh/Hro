import { useCallback, useMemo, useState } from 'react'
import clsx from 'clsx'
import { CheckCircle2, QrCode, ScanLine, Send, Users } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, faTime, num, toman } from '@/core/format'
import { occupancy, requestEntry, ticketStatus, verifyEntry } from '@/core/services/fityab'
import { Avatar, Badge, Button, Card, Empty, Input, PageHeader, SectionTitle, Select, Sheet, Tabs } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { run, toast } from '@/ui/toast'
import { QrScanner } from '@/ui/QrScanner'
import { InBodySheet } from './GymMembers'

type Result = Awaited<ReturnType<typeof verifyEntry>>

export default function GymCheckins() {
  const me = useMe()!
  const gyms = useDB((s) => s.gyms)
  const checkins = useDB((s) => s.checkins)
  const requests = useDB((s) => s.entryRequests)
  const users = useUserMap()
  const myGyms = gyms.filter((g) => g.ownerId === me.id)
  const [gymId, setGymId] = useState(myGyms[0]?.id ?? '')
  const gym = myGyms.find((g) => g.id === gymId)
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [scan, setScan] = useState(false)
  const [result, setResult] = useState<Result>()
  const [inbody, setInbody] = useState(false)
  const [tab, setTab] = useState<'today' | 'expected' | 'all'>('today')

  const verify = useCallback(async (raw: string) => {
    setScan(false)
    const r = await run(() => verifyEntry(raw))
    if (r) {
      setResult(r)
      setCode('')
      toast.success(`ورود ${r.userName} تأیید شد`)
    }
  }, [])

  const todayKey = new Date().toDateString()
  const mine = useMemo(() => checkins.filter((c) => c.gymId === gymId), [checkins, gymId])
  const usedToday = mine.filter((c) => c.status === 'used' && c.usedAt && new Date(c.usedAt).toDateString() === todayKey)
  const expected = mine.filter((c) => ticketStatus(c) === 'active').sort((a, b) => (a.slotAt ?? a.createdAt).localeCompare(b.slotAt ?? b.createdAt))
  const list = tab === 'today' ? usedToday : tab === 'expected' ? expected : mine
  const occ = gym ? occupancy(gym, { checkins }) : null
  const myReqs = requests.filter((r) => r.gymId === gymId && Date.now() - new Date(r.createdAt).getTime() < 30 * 60_000)

  if (!myGyms.length) return <Empty title="هنوز باشگاهی ثبت نکرده‌اید" />

  return (
    <div className="animate-fade-up">
      <PageHeader title="پذیرش ورود" subtitle="اسکن QR بلیت، وارد کردن کد یا ثبت ورود با شماره موبایل" />
      {myGyms.length > 1 && (
        <Select value={gymId} onChange={(e) => setGymId(e.target.value)} className="mb-3">
          {myGyms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Button size="lg" className="w-full" icon={<ScanLine size={20} />} onClick={() => setScan(true)}>
            اسکن QR بلیت
          </Button>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              verify(code)
            }}
          >
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="کد ۶ رقمی" dir="ltr" className="text-center text-xl tracking-[.4em]" maxLength={6} inputMode="numeric" />
            <Button type="submit" variant="dark" icon={<QrCode size={18} />}>
              تأیید
            </Button>
          </form>
          {result && (
            <div className="mt-4 flex animate-pop items-center gap-3 rounded-2xl bg-aqua-400/15 p-3">
              <CheckCircle2 size={28} className="shrink-0 text-aqua-600 dark:text-aqua-300" />
              <Avatar name={result.userName} src={result.avatar} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{result.memberName ? `${result.memberName} (فرزند ${result.userName})` : result.userName}</div>
                <div className="text-[12px] text-ink-500">
                  {result.className ? `کلاس ${result.className}` : 'سانس آزاد'} · {toman(result.paid)}
                </div>
                {result.memberNotes && <div className="mt-1 text-[12px] font-medium text-coral-600">نکته‌ی والد: {result.memberNotes}</div>}
              </div>
              {!result.memberName && <Button size="sm" variant="secondary" onClick={() => setInbody(true)}>InBody</Button>}
            </div>
          )}
          {result && <InBodySheet open={inbody} onClose={() => setInbody(false)} gymId={checkins.find((c) => c.id === result.ticketId)?.gymId ?? gymId} userId={result.userId} name={result.userName} />}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">ورزشکار بلیت ندارد؟</div>
            {occ && (
              <Badge color={occ.tone}>
                <Users size={12} /> {num(occ.count)}/{num(occ.capacity)} · {occ.label}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-[12px] leading-5 text-ink-500">شماره‌ی موبایل کی‌فیت ورزشکار را وارد کنید؛ درخواست ورود برایش ارسال می‌شود و با تأیید او، پرداخت و ورود ثبت می‌شود.</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              const r = await run(() => requestEntry(gymId, phone))
              if (r) {
                toast.success(`درخواست برای ${r.userName} ارسال شد`)
                setPhone('')
              }
            }}
          >
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲…" dir="ltr" inputMode="tel" className="text-left" />
            <Button type="submit" variant="secondary" icon={<Send size={16} />}>
              ارسال
            </Button>
          </form>
          {myReqs.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {myReqs.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl bg-ink-900/[.04] px-3 py-2 text-xs dark:bg-white/[.05]">
                  <span>{users[r.userId]?.name}</span>
                  <Badge color={r.status === 'approved' ? 'emerald' : r.status === 'pending' ? 'amber' : 'rose'}>{r.status === 'approved' ? 'وارد شد' : r.status === 'pending' ? 'در انتظار تأیید' : r.status === 'rejected' ? 'رد شد' : 'منقضی'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <SectionTitle title="ورودها" />
      <Tabs
        className="mb-3"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'today', label: `امروز (${num(usedToday.length)})` },
          { value: 'expected', label: `منتظر ورود (${num(expected.length)})` },
          { value: 'all', label: 'همه' },
        ]}
      />
      <div className="space-y-2">
        {list.length === 0 && <Empty title="موردی نیست" />}
        {list.map((c) => {
          const st = ticketStatus(c)
          const cls = c.classId ? gym?.classes?.find((k) => k.id === c.classId) : undefined
          return (
            <Card key={c.id} className="flex items-center gap-3 py-3">
              <Avatar name={users[c.userId]?.name ?? ''} src={users[c.userId]?.avatar} size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{users[c.userId]?.name}</div>
                <div className="text-[12px] text-ink-400">
                  {cls ? `کلاس ${cls.title} · ${c.slotAt && faTime(c.slotAt)}` : 'سانس آزاد'} · {faDateTime(c.usedAt ?? c.createdAt)}
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold">{toman(c.paid ?? c.price)}</div>
                <Badge color={st === 'used' ? 'slate' : st === 'active' ? 'emerald' : st === 'cancelled' ? 'rose' : 'amber'}>
                  {st === 'used' ? 'وارد شد' : st === 'active' ? 'منتظر ورود' : st === 'cancelled' ? 'لغو شد' : 'منقضی'}
                </Badge>
              </div>
            </Card>
          )
        })}
      </div>

      <Sheet open={scan} onClose={() => setScan(false)} title="اسکن QR بلیت">
        <div className={clsx(!scan && 'hidden')}>
          <QrScanner active={scan} onResult={verify} />
          <p className="mt-3 text-center text-xs text-ink-500">QR بلیت ورزشکار را در کادر قرار دهید</p>
        </div>
      </Sheet>
    </div>
  )
}
