import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, MapPin, Medal, Plus, ShieldCheck, Users } from 'lucide-react'
import { useDB } from '@/core/db'
import { EVENT_KINDS } from '@/core/config'
import { faDateTime, faDigitsToEn, num, toman } from '@/core/format'
import { EVENT_CANCEL_HOURS, cancelEvent, cancelRegistration, checkInEvent, createEvent, publishResults, registerEvent, updateEvent, type NewEvent } from '@/core/services/events'
import { activePolicy } from '@/core/services/insurance'
import type { SportEvent } from '@/core/types'
import { Avatar, Badge, Button, Card, Chips, Cover, Empty, Field, Input, NumberInput, PageHeader, SectionTitle, Select, Textarea } from '@/ui/kit'
import { useBalance, useMe, useUserMap } from '@/ui/hooks'
import { CityInput } from '@/ui/CityInput'
import { isBusiness } from '@/core/roles'
import { run, runOk, ask, toast } from '@/ui/toast'

const STATUS: Record<SportEvent['status'], [string, 'emerald' | 'amber' | 'slate' | 'rose']> = {
  open: ['ثبت‌نام باز', 'emerald'],
  closed: ['ظرفیت تکمیل', 'amber'],
  done: ['برگزار شد', 'slate'],
  cancelled: ['لغو شد', 'rose'],
}
const GENDER = { mixed: 'همه', female: 'بانوان', male: 'آقایان' } as const

function EventCard({ e }: { e: SportEvent }) {
  return (
    <Link to={`/events/${e.id}`}>
      <Card className="overflow-hidden p-0 transition hover:-translate-y-0.5">
        <Cover gradient={e.cover} className="h-24" label={EVENT_KINDS[e.kind]} />
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate font-semibold">{e.title}</span>
            <Badge color={STATUS[e.status][1]}>{STATUS[e.status][0]}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-ink-500"><CalendarDays size={12} /> {faDateTime(e.at)}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} /> {e.location}</div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-ink-400">{num(e.registrations.length)}/{num(e.capacity)} نفر · {GENDER[e.gender]}</span>
            <b>{e.fee ? toman(e.fee) : 'رایگان'}</b>
          </div>
        </div>
      </Card>
    </Link>
  )
}

/** رویدادهای ورزشی: مسابقه، کوهپیمایی، تورنمنت */
export default function Events() {
  const me = useMe()!
  const events = useDB((s) => s.events)
  const [kind, setKind] = useState<'all' | SportEvent['kind']>('all')
  const canCreate = me.roles.some((r) => r === 'gym' || r === 'coach' || r === 'admin')
  const visible = events.filter((e) => e.approved && (kind === 'all' || e.kind === kind))
  const upcoming = visible.filter((e) => e.status === 'open' || e.status === 'closed').sort((a, b) => a.at.localeCompare(b.at))
  const past = visible.filter((e) => e.status === 'done').sort((a, b) => b.at.localeCompare(a.at))
  const mine = events.filter((e) => e.registrations.some((r) => r.userId === me.id) && e.status !== 'cancelled' && e.status !== 'done')
  const organized = events.filter((e) => e.organizerId === me.id && !e.approved && e.status !== 'cancelled')
  return (
    <div className="animate-fade-up">
      <PageHeader back title="رویدادهای ورزشی" subtitle="مسابقه‌ی دو، کوهپیمایی، تورنمنت و کارگاه" actions={canCreate && <Link to="/events/new"><Button size="sm" icon={<Plus size={15} />}>رویداد جدید</Button></Link>} />
      <div className="mb-4">
        <Chips value={kind} onChange={setKind} items={[{ value: 'all', label: 'همه' }, ...(Object.keys(EVENT_KINDS) as SportEvent['kind'][]).map((k) => ({ value: k, label: EVENT_KINDS[k] }))]} />
      </div>
      {mine.length > 0 && (
        <>
          <SectionTitle title="ثبت‌نام‌های من" />
          <div className="grid gap-3 sm:grid-cols-2">{mine.map((e) => <EventCard key={e.id} e={e} />)}</div>
        </>
      )}
      {organized.length > 0 && (
        <>
          <SectionTitle title="در انتظار تأیید مدیر" />
          <div className="grid gap-3 sm:grid-cols-2">{organized.map((e) => <EventCard key={e.id} e={e} />)}</div>
        </>
      )}
      <SectionTitle title="پیش‌رو" />
      {upcoming.length === 0 && <Empty title="رویدادی در این دسته نیست" />}
      <div className="grid gap-3 sm:grid-cols-2">{upcoming.filter((e) => !mine.includes(e)).map((e) => <EventCard key={e.id} e={e} />)}</div>
      {past.length > 0 && (
        <>
          <SectionTitle title="نتایج رویدادهای گذشته" />
          <div className="grid gap-3 sm:grid-cols-2">{past.map((e) => <EventCard key={e.id} e={e} />)}</div>
        </>
      )}
    </div>
  )
}

export function EventDetail() {
  const { id } = useParams()
  const me = useMe()!
  const e = useDB((s) => s.events.find((x) => x.id === id))
  const state = useDB((s) => s)
  const users = useUserMap()
  const bal = useBalance(me.id)
  const [cat, setCat] = useState('')
  const [bib, setBib] = useState('')
  const [results, setResults] = useState<Record<number, { rank?: number; time?: string }>>({})
  if (!e) return <Empty title="رویداد یافت نشد" />
  const reg = e.registrations.find((r) => r.userId === me.id)
  const manager = e.organizerId === me.id || me.roles.includes('admin')
  const insured = !!activePolicy(me.id, state)
  const ranked = e.registrations.filter((r) => r.result?.rank).sort((a, b) => a.result!.rank! - b.result!.rank!)
  const canLeave = reg && e.status !== 'done' && new Date(e.at).getTime() - Date.now() > EVENT_CANCEL_HOURS * 3_600_000
  const started = new Date(e.at) < new Date()

  return (
    <div className="animate-fade-up">
      <PageHeader back="/events" title={e.title} subtitle={`${EVENT_KINDS[e.kind]} · ${e.sport}`} />
      <Cover gradient={e.cover} className="h-32 rounded-[2rem]" label={EVENT_KINDS[e.kind]} />
      <Card className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center gap-2"><CalendarDays size={15} className="text-ink-400" /> {faDateTime(e.at)}</div>
        <div className="flex items-center gap-2"><MapPin size={15} className="text-ink-400" /> {e.location}، {e.city}</div>
        <div className="flex items-center gap-2"><Users size={15} className="text-ink-400" /> {num(e.registrations.length)} از {num(e.capacity)} نفر · {GENDER[e.gender]}</div>
        <div className="flex items-center gap-2 text-xs text-ink-500">برگزارکننده: <Avatar name={users[e.organizerId]?.name ?? ''} size={20} /> {users[e.organizerId]?.name}</div>
        <div className="pt-1"><Badge color={STATUS[e.status][1]}>{STATUS[e.status][0]}</Badge>{!e.approved && <Badge color={e.review?.status === 'changes' ? 'rose' : 'amber'} className="mr-1">{e.review?.status === 'changes' ? 'نیاز به اصلاح' : 'در انتظار تأیید'}</Badge>}</div>
      </Card>
      {manager && !e.approved && e.review?.status === 'changes' && <EventFix e={e} />}
      {e.description && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-600 dark:text-ink-300">{e.description}</p>}

      {ranked.length > 0 && (
        <>
          <SectionTitle title="نتایج" />
          <Card className="divide-y divide-ink-100 p-0 dark:divide-white/5">
            {ranked.map((r) => (
              <div key={r.bib} className="flex items-center gap-3 p-3 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/[.05] font-semibold dark:bg-white/10">{r.result!.rank! <= 3 ? <Medal size={16} /> : num(r.result!.rank!)}</span>
                <span className="flex-1">{r.userId === 'anon' ? 'شرکت‌کننده' : users[r.userId]?.name}</span>
                <span className="text-xs text-ink-500">{r.result?.time ?? r.result?.note}</span>
                <b>{num(r.result!.rank!)}</b>
              </div>
            ))}
          </Card>
        </>
      )}

      {!manager && !isBusiness(me) && e.approved && (e.status === 'open' || e.status === 'closed') && (
        <Card className="mt-4 space-y-3">
          {reg ? (
            <>
              <div className="text-center">
                <div className="text-xs text-ink-400">شماره‌ی سینه‌ی شما</div>
                <div className="font-display text-5xl">{num(reg.bib)}</div>
                {reg.category && <div className="text-xs text-ink-500">{reg.category}</div>}
              </div>
              {!insured && <Link to="/insurance" className="flex items-center justify-center gap-1 text-xs text-aqua-600"><ShieldCheck size={13} /> پیش از رویداد، بیمه‌ی ورزشی بگیرید</Link>}
              {canLeave && <Button className="w-full" variant="ghost" onClick={async () => (await ask('انصراف و بازگشت ورودی؟')) && runOk(() => cancelRegistration(e.id), 'انصراف ثبت شد')}>انصراف (تا {num(EVENT_CANCEL_HOURS)} ساعت قبل)</Button>}
            </>
          ) : e.status === 'open' && !started ? (
            <>
              {e.categories.length > 0 && <Chips value={cat} onChange={setCat} items={e.categories.map((c) => ({ value: c, label: c }))} />}
              {e.fee > 0 && <div className="flex justify-between text-sm"><span>ورودی</span><b>{toman(e.fee)}</b></div>}
              {e.fee > 0 && <div className="text-xs text-ink-400">موجودی کیف پول: {toman(bal)}</div>}
              {!insured && <div className="rounded-2xl bg-gold-300/15 p-3 text-xs leading-6">بیمه‌ی ورزشی ندارید. برای پوشش آسیب‌های احتمالی <Link to="/insurance" className="underline">بیمه بگیرید</Link>.</div>}
              <Button className="w-full" size="lg" onClick={() => runOk(() => registerEvent(e.id, cat || undefined), 'ثبت‌نام انجام شد')}>{e.fee ? 'ثبت‌نام و پرداخت' : 'ثبت‌نام رایگان'}</Button>
            </>
          ) : null}
        </Card>
      )}

      {manager && e.status !== 'cancelled' && (
        <>
          <SectionTitle title="مدیریت رویداد" />
          <Card className="space-y-3">
            {!started && e.status !== 'done' && (
              <div className="flex gap-2">
                <Input inputMode="numeric" dir="ltr" placeholder="شماره‌ی سینه" value={bib} onChange={(x) => setBib(x.target.value)} />
                <Button variant="secondary" onClick={async () => { const n = await run(() => checkInEvent(e.id, Number(faDigitsToEn(bib)))); if (n !== undefined) { setBib(''); toast.success(`حضور ${n} ثبت شد`) } }}>ثبت حضور</Button>
              </div>
            )}
            <div className="text-xs text-ink-500">{num(e.registrations.filter((r) => r.checkedIn).length)} نفر حاضر از {num(e.registrations.length)} ثبت‌نام</div>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {e.registrations.map((r) => (
                <div key={r.bib} className="flex items-center gap-2 text-xs">
                  <span className="w-10 font-semibold tabular-nums">{num(r.bib)}</span>
                  <span className="flex-1 truncate">{users[r.userId]?.name}{r.category ? ` · ${r.category}` : ''}</span>
                  {started && (
                    <>
                      <Input className="!w-16 !py-1" inputMode="numeric" placeholder="رتبه" value={results[r.bib]?.rank ?? r.result?.rank ?? ''} onChange={(x) => setResults({ ...results, [r.bib]: { ...results[r.bib], rank: Number(faDigitsToEn(x.target.value)) || undefined } })} />
                      <Input className="!w-20 !py-1" dir="ltr" placeholder="00:45:12" value={results[r.bib]?.time ?? r.result?.time ?? ''} onChange={(x) => setResults({ ...results, [r.bib]: { ...results[r.bib], time: x.target.value } })} />
                    </>
                  )}
                  {r.checkedIn && <Badge color="emerald">حاضر</Badge>}
                </div>
              ))}
            </div>
            {started && e.registrations.length > 0 && (
              <Button className="w-full" onClick={() => runOk(() => publishResults(e.id, e.registrations.map((r) => ({ bib: r.bib, rank: results[r.bib]?.rank ?? r.result?.rank, time: results[r.bib]?.time ?? r.result?.time }))), 'نتایج منتشر شد')}>انتشار نتایج و پایان رویداد</Button>
            )}
            {e.status !== 'done' && <Button className="w-full" variant="ghost" onClick={async () => (await ask('رویداد لغو و ورودی همه برگردانده شود؟')) && run(() => cancelEvent(e.id), 'رویداد لغو شد')}>لغو رویداد</Button>}
          </Card>
        </>
      )}
    </div>
  )
}

/** اصلاح رویداد پس از درخواست مدیر و ارسال دوباره برای بررسی */
function EventFix({ e }: { e: SportEvent }) {
  const [desc, setDesc] = useState(e.description)
  const [loc, setLoc] = useState(e.location)
  return (
    <Card className="mt-3 space-y-3 border border-coral-300/50">
      <div className="text-[14px] leading-7"><b>یادداشت مدیر:</b> {e.review?.note}</div>
      <Field label="محل برگزاری"><Input value={loc} onChange={(x) => setLoc(x.target.value)} /></Field>
      <Field label="توضیحات"><Textarea rows={4} value={desc} onChange={(x) => setDesc(x.target.value)} /></Field>
      <Button className="w-full" onClick={() => run(() => updateEvent(e.id, { description: desc, location: loc }), 'برای بررسی دوباره ارسال شد')}>ذخیره و ارسال دوباره</Button>
    </Card>
  )
}

export function CreateEvent() {
  const nav = useNavigate()
  const me = useMe()!
  const [f, setF] = useState<NewEvent>({ title: '', kind: 'race', sport: 'دویدن', description: '', at: '', location: '', city: me.city ?? '', fee: 0, capacity: 100, categories: [], gender: 'mixed' })
  const [cats, setCats] = useState('')
  return (
    <div className="animate-fade-up">
      <PageHeader back="/events" title="رویداد جدید" subtitle="پس از تأیید مدیر منتشر می‌شود" />
      <Card className="space-y-3">
        <Field label="عنوان"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="مثلاً دوی ۵ کیلومتر بانوان" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="نوع">
            <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as SportEvent['kind'] })}>
              {(Object.keys(EVENT_KINDS) as SportEvent['kind'][]).map((k) => <option key={k} value={k}>{EVENT_KINDS[k]}</option>)}
            </Select>
          </Field>
          <Field label="رشته"><Input value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value })} /></Field>
        </div>
        <Field label="زمان"><Input type="datetime-local" dir="ltr" value={f.at} onChange={(e) => setF({ ...f, at: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="محل برگزاری"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
          <Field label="شهر"><CityInput value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="ورودی (تومان)" hint="۰ = رایگان"><NumberInput value={f.fee} onChange={(v) => setF({ ...f, fee: v })} /></Field>
          <Field label="ظرفیت"><NumberInput value={f.capacity} onChange={(v) => setF({ ...f, capacity: v })} /></Field>
          <Field label="ویژه‌ی">
            <Select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value as SportEvent['gender'] })}>
              <option value="mixed">همه</option><option value="female">بانوان</option><option value="male">آقایان</option>
            </Select>
          </Field>
        </div>
        <Field label="رده‌ها / مسافت‌ها" hint="با ویرگول جدا کنید (اختیاری)"><Input value={cats} onChange={(e) => setCats(e.target.value)} placeholder="۵ کیلومتر، ۱۰ کیلومتر" /></Field>
        <Field label="توضیحات، قوانین و وسایل لازم"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Button className="w-full" onClick={async () => {
          const id = await run(() => createEvent({ ...f, at: f.at ? new Date(f.at).toISOString() : '', categories: cats.split(/[,،]/) }), 'رویداد ثبت شد')
          if (id) nav(`/events/${id}`)
        }}>ثبت رویداد</Button>
      </Card>
    </div>
  )
}
