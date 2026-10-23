import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Video } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, num, toman } from '@/core/format'
import { LIVE_LEVEL, cancelLiveClass, createLiveClass, enterLiveClass, isLiveNow, liveEnd } from '@/core/services/live'
import type { LiveClass } from '@/core/types'
import { Badge, Button, Card, Empty, Field, Input, NumberInput, PageHeader, SectionTitle, Select, Sheet, Textarea } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { run, runOk } from '@/ui/toast'

const empty = { title: '', sport: 'یوگا', description: '', level: 'all' as LiveClass['level'], at: '', durationMin: 45, price: 100_000, capacity: 30 }

/** پنل مربی: زمان‌بندی و برگزاری کلاس آنلاین زنده */
export default function CoachLive() {
  const me = useMe()!
  const all = useDB((s) => s.liveClasses)
  const coach = useDB((s) => s.coaches.find((c) => c.userId === me.id))
  const txs = useDB((s) => s.transactions)
  const mine = all.filter((c) => c.hostId === me.id).sort((a, b) => b.at.localeCompare(a.at))
  const upcoming = mine.filter((c) => c.status === 'scheduled' && liveEnd(c) > new Date())
  const past = mine.filter((c) => !upcoming.includes(c))
  const income = txs.filter((t) => t.type === 'live_class' && t.to === me.id).reduce((a, t) => a + t.amount - t.commission, 0)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(empty)

  return (
    <div className="animate-fade-up">
      <PageHeader title="کلاس آنلاین" subtitle={`درآمد خالص کلاس‌ها: ${toman(income)}`} actions={<Button size="sm" icon={<Plus size={15} />} onClick={() => setOpen(true)} disabled={!coach?.verified}>کلاس جدید</Button>} />
      {!coach?.verified && <div className="mb-4 rounded-2xl bg-gold-300/15 p-3 text-xs">پس از تأیید مدارک مربیگری می‌توانید کلاس آنلاین برگزار کنید.</div>}
      <SectionTitle title="پیش‌رو" />
      {upcoming.length === 0 && <Empty title="کلاسی زمان‌بندی نکرده‌اید" />}
      <div className="space-y-2">
        {upcoming.map((c) => (
          <Card key={c.id}>
            <div className="flex items-center gap-2">
              <Link to={`/live/${c.id}`} className="flex-1 text-sm font-semibold">{c.title}</Link>
              {isLiveNow(c) ? <Badge color="rose">زنده</Badge> : <Badge color="sky">{faDateTime(c.at)}</Badge>}
            </div>
            <div className="mt-1 text-xs text-ink-500">{num(c.attendees.length)}/{num(c.capacity)} ثبت‌نام · {num(c.durationMin)} دقیقه · {c.price ? toman(c.price) : 'رایگان'}</div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" icon={<Video size={14} />} disabled={!isLiveNow(c)} onClick={async () => { const l = await run(() => enterLiveClass(c.id)); if (l) window.open(l, '_blank', 'noopener') }}>شروع کلاس</Button>
              <Button size="sm" variant="ghost" className="text-coral-500" onClick={() => confirm('کلاس لغو و وجه همه‌ی شرکت‌کنندگان برگردانده شود؟') && run(() => cancelLiveClass(c.id), 'کلاس لغو شد')}>لغو کلاس</Button>
            </div>
          </Card>
        ))}
      </div>
      {past.length > 0 && (
        <>
          <SectionTitle title="برگزارشده و لغوشده" />
          <div className="space-y-2">
            {past.map((c) => (
              <Card key={c.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{c.title}</span>
                <span className="text-[11px] text-ink-400">{faDateTime(c.at)}</span>
                {c.status === 'cancelled' ? <Badge color="rose">لغو</Badge> : <Badge color="emerald">{num(c.joined.length)} حاضر</Badge>}
              </Card>
            ))}
          </div>
        </>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="کلاس آنلاین جدید">
        <div className="space-y-3">
          <Field label="عنوان"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="مثلاً پیلاتس مبتدی" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="رشته"><Input value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value })} /></Field>
            <Field label="سطح">
              <Select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value as LiveClass['level'] })}>
                {(Object.keys(LIVE_LEVEL) as LiveClass['level'][]).map((k) => <option key={k} value={k}>{LIVE_LEVEL[k]}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="زمان شروع"><Input type="datetime-local" dir="ltr" value={f.at} onChange={(e) => setF({ ...f, at: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="مدت (دقیقه)"><NumberInput value={f.durationMin} onChange={(v) => setF({ ...f, durationMin: v })} /></Field>
            <Field label="ظرفیت"><NumberInput value={f.capacity} onChange={(v) => setF({ ...f, capacity: v })} /></Field>
            <Field label="بلیت (تومان)" hint="۰ = رایگان"><NumberInput value={f.price} onChange={(v) => setF({ ...f, price: v })} /></Field>
          </div>
          <Field label="توضیحات و وسایل لازم"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Button className="w-full" onClick={async () => {
            const ok = await runOk(() => createLiveClass({ ...f, at: f.at ? new Date(f.at).toISOString() : '' }), 'کلاس زمان‌بندی شد و شاگردانتان باخبر شدند')
            if (ok) { setOpen(false); setF(empty) }
          }}>انتشار کلاس</Button>
        </div>
      </Sheet>
    </div>
  )
}
