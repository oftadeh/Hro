import { useState } from 'react'
import { Activity, Megaphone, Send } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDate, num, timeAgo, toman } from '@/core/format'
import { SEGMENT_LABEL, gymMembers, recordInBody, sendCampaign } from '@/core/services/members'
import type { MemberSegment } from '@/core/types'
import { Avatar, Badge, Button, Card, Chips, Empty, Field, Input, NumberInput, PageHeader, SectionTitle, Select, Sheet, Stat, Textarea } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

const SEG_TONE: Record<MemberSegment, 'emerald' | 'amber' | 'rose' | 'sky' | 'slate'> = { all: 'slate', new: 'sky', active: 'emerald', at_risk: 'amber', lost: 'rose' }

/** فرم آنالیز ترکیب بدن (InBody) برای ورزشکار حاضر در باشگاه */
export function InBodySheet({ open, onClose, gymId, userId, name }: { open: boolean; onClose: () => void; gymId: string; userId: string; name: string }) {
  const [f, setF] = useState({ weightKg: 0, bodyFatPct: 0, muscleKg: 0, visceralFat: 0, bmr: 0, waterPct: 0 })
  const field = (k: keyof typeof f, label: string) => <Field label={label}><NumberInput value={f[k]} onChange={(v) => setF({ ...f, [k]: v })} /></Field>
  return (
    <Sheet open={open} onClose={onClose} title={`آنالیز بدن ${name}`}>
      <div className="space-y-3">
        <p className="text-xs leading-6 text-ink-500">اعداد برگه‌ی دستگاه InBody را وارد کنید؛ نتیجه در بخش «پیشرفت» ورزشکار ثبت می‌شود.</p>
        <div className="grid grid-cols-2 gap-2">
          {field('weightKg', 'وزن (کیلوگرم)')}
          {field('bodyFatPct', 'چربی بدن (٪)')}
          {field('muscleKg', 'عضله‌ی اسکلتی (کیلوگرم)')}
          {field('visceralFat', 'چربی احشایی (سطح)')}
          {field('bmr', 'متابولیسم پایه (kcal)')}
          {field('waterPct', 'آب بدن (٪)')}
        </div>
        <Button className="w-full" onClick={async () => { if (await runOk(() => recordInBody(gymId, userId, f), 'آنالیز ثبت و برای ورزشکار ارسال شد')) onClose() }}>ثبت نتیجه</Button>
      </div>
    </Sheet>
  )
}

/** اعضای باشگاه، دسته‌بندی ریزش و کمپین بازگشت */
export default function GymMembers() {
  const me = useMe()!
  const gyms = useDB((s) => s.gyms)
  const checkins = useDB((s) => s.checkins)
  const campaigns = useDB((s) => s.campaigns)
  const users = useUserMap()
  const myGyms = gyms.filter((g) => g.ownerId === me.id && g.approved)
  const [gymId, setGymId] = useState(myGyms[0]?.id ?? '')
  const [seg, setSeg] = useState<MemberSegment>('all')
  const [open, setOpen] = useState(false)
  const [c, setC] = useState({ title: '', body: '', pct: 0, days: 7 })
  if (!myGyms.length) return <Empty title="هنوز باشگاه تأییدشده‌ای ندارید" />
  const members = gymMembers([gymId], { checkins })
  const count = (s: MemberSegment) => members.filter((m) => m.segments.includes(s)).length
  const list = members.filter((m) => m.segments.includes(seg))
  const mine = campaigns.filter((x) => x.gymId === gymId)
  const preset = (s: MemberSegment) =>
    s === 'at_risk' || s === 'lost'
      ? { title: 'دلمون برات تنگ شده!', body: 'مدتی است سر نزده‌ای. این هفته با تخفیف ویژه برگرد.', pct: 20, days: 7 }
      : s === 'new'
        ? { title: 'خوش اومدی!', body: 'ممنون که ما را انتخاب کردی. جلسه‌ی بعدی را با تخفیف تجربه کن.', pct: 10, days: 10 }
        : { title: '', body: '', pct: 0, days: 7 }

  return (
    <div className="animate-fade-up">
      <PageHeader title="اعضا و کمپین" subtitle="ورزشکارانی که از طریق کی‌فیت به باشگاه شما آمده‌اند" actions={<Button size="sm" icon={<Megaphone size={15} />} onClick={() => { setC(preset(seg)); setOpen(true) }} disabled={!count(seg)}>پیام به این گروه</Button>} />
      {myGyms.length > 1 && (
        <Select className="mb-3" value={gymId} onChange={(e) => setGymId(e.target.value)}>
          {myGyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="کل اعضا" value={num(count('all'))} />
        <Stat label="فعال" value={num(count('active'))} tone="emerald" />
        <Stat label="در خطر ریزش" value={num(count('at_risk'))} tone="amber" />
        <Stat label="ازدست‌رفته" value={num(count('lost'))} tone="rose" />
      </div>
      <Chips value={seg} onChange={setSeg} items={(Object.keys(SEGMENT_LABEL) as MemberSegment[]).map((k) => ({ value: k, label: `${SEGMENT_LABEL[k].split(' (')[0]} (${num(count(k))})` }))} />
      <div className="mt-3 space-y-2">
        {list.length === 0 && <Empty title="عضوی در این گروه نیست" />}
        {list.map((m) => (
          <Card key={m.userId} className="flex items-center gap-3">
            <Avatar name={users[m.userId]?.name ?? ''} src={users[m.userId]?.avatar} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{users[m.userId]?.name}</div>
              <div className="text-[11px] text-ink-500">{num(m.visits)} ورود · آخرین: {timeAgo(m.lastAt)} · {toman(m.spent)}</div>
            </div>
            {m.segments.filter((x) => x !== 'all').map((x) => <Badge key={x} color={SEG_TONE[x]}>{SEGMENT_LABEL[x].split(' (')[0]}</Badge>)}
          </Card>
        ))}
      </div>

      {mine.length > 0 && (
        <>
          <SectionTitle title="کمپین‌های ارسال‌شده" />
          <div className="space-y-2">
            {mine.map((x) => (
              <Card key={x.id}>
                <div className="flex items-center gap-2 text-sm">
                  <Send size={14} className="text-ink-400" />
                  <span className="flex-1 font-medium">{x.title}</span>
                  <span className="text-[11px] text-ink-400">{faDate(x.createdAt)}</span>
                </div>
                <div className="mt-1 text-xs text-ink-500">
                  {SEGMENT_LABEL[x.segment]} · {num(x.recipients.length)} گیرنده
                  {x.pct ? ` · ${num(x.pct)}٪ تخفیف · ${num(x.usedBy.length)} بازگشت (${num(Math.round((x.usedBy.length / Math.max(1, x.recipients.length)) * 100))}٪)` : ''}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={`پیام به ${SEGMENT_LABEL[seg].split(' (')[0]}`}>
        <div className="space-y-3">
          <div className="text-xs text-ink-500">{num(count(seg))} نفر اعلان را در اپ دریافت می‌کنند.</div>
          <Field label="عنوان"><Input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} /></Field>
          <Field label="متن"><Textarea rows={3} value={c.body} onChange={(e) => setC({ ...c, body: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="تخفیف ورود بعدی (٪)" hint="۰ = بدون تخفیف؛ از سهم باشگاه"><NumberInput value={c.pct} onChange={(v) => setC({ ...c, pct: v })} /></Field>
            <Field label="مهلت (روز)"><NumberInput value={c.days} onChange={(v) => setC({ ...c, days: v })} /></Field>
          </div>
          <Button className="w-full" icon={<Activity size={15} />} onClick={async () => { if (await runOk(() => sendCampaign({ gymId, segment: seg, ...c }), 'پیام ارسال شد')) setOpen(false) }}>ارسال</Button>
        </div>
      </Sheet>
    </div>
  )
}
