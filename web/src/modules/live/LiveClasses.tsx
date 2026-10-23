import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Radio, Users, Video } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, num, toman } from '@/core/format'
import { LIVE_CANCEL_HOURS, LIVE_EARLY_MIN, LIVE_LEVEL, enterLiveClass, isLiveNow, leaveLiveClass, liveEnd, registerLiveClass } from '@/core/services/live'
import type { LiveClass } from '@/core/types'
import { PerkPrice } from '@/ui/PerkPrice'
import { Avatar, Badge, Button, Card, Empty, HeroHeader, PageHeader, SectionTitle } from '@/ui/kit'
import { useBalance, useMe, useUserMap } from '@/ui/hooks'
import { run, runOk } from '@/ui/toast'

export function LiveCard({ c }: { c: LiveClass }) {
  const users = useUserMap()
  const host = users[c.hostId]
  const live = isLiveNow(c)
  return (
    <Link to={`/live/${c.id}`}>
      <Card className="flex items-center gap-3 transition hover:-translate-y-0.5">
        <Avatar name={host?.name ?? ''} src={host?.avatar} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{c.title}</span>
            {live && <Badge color="rose">در حال برگزاری</Badge>}
          </div>
          <div className="text-xs text-ink-500">{host?.name} · {c.sport} · {LIVE_LEVEL[c.level]}</div>
          <div className="mt-1 text-[11px] text-ink-400">{faDateTime(c.at)} · {num(c.durationMin)} دقیقه · {num(c.attendees.length)}/{num(c.capacity)} نفر</div>
        </div>
        <div className="text-left text-xs font-semibold">{c.price ? toman(c.price) : 'رایگان'}</div>
      </Card>
    </Link>
  )
}

/** فهرست کلاس‌های آنلاین زنده */
export default function LiveClasses() {
  const me = useMe()!
  const all = useDB((s) => s.liveClasses)
  const upcoming = all.filter((c) => c.status === 'scheduled' && liveEnd(c) > new Date()).sort((a, b) => a.at.localeCompare(b.at))
  const mine = upcoming.filter((c) => c.attendees.includes(me.id))
  const others = upcoming.filter((c) => !c.attendees.includes(me.id))
  return (
    <div className="animate-fade-up">
      <PageHeader back title="کلاس آنلاین زنده" subtitle="یوگا، HIIT، پیلاتس و حرکات اصلاحی با مربیان کی‌فیت، از خانه" />
      <HeroHeader seed="live" className="mb-5 p-6">
        <div className="flex items-center gap-1.5 text-[11px] text-white/70"><Radio size={13} /> زنده و تعاملی</div>
        <div className="mt-2 font-display text-[1.9rem] leading-[1.1]">همراه مربی، هر جا که هستی</div>
        <div className="mt-1 text-[13px] text-white/75">با ورود به کلاس، تمرین امروزت خودکار ثبت و در چالش‌ها حساب می‌شود.</div>
      </HeroHeader>
      {mine.length > 0 && (
        <>
          <SectionTitle title="کلاس‌های من" />
          <div className="space-y-2">{mine.map((c) => <LiveCard key={c.id} c={c} />)}</div>
        </>
      )}
      <SectionTitle title="کلاس‌های پیش‌رو" />
      {others.length === 0 && <Empty title="فعلاً کلاس جدیدی زمان‌بندی نشده" desc="مربیان از پنل خود کلاس آنلاین می‌گذارند." />}
      <div className="space-y-2">{others.map((c) => <LiveCard key={c.id} c={c} />)}</div>
    </div>
  )
}

export function LiveDetail() {
  const { id } = useParams()
  const me = useMe()!
  const c = useDB((s) => s.liveClasses.find((x) => x.id === id))
  const users = useUserMap()
  const bal = useBalance(me.id)
  useDB((s) => s.subscriptions)
  const [link, setLink] = useState('')
  if (!c) return <Empty title="کلاس یافت نشد" />
  const host = users[c.hostId]
  const registered = c.attendees.includes(me.id)
  const isHost = c.hostId === me.id
  const live = isLiveNow(c)
  const ended = liveEnd(c) < new Date()
  const full = c.attendees.length >= c.capacity
  const canLeave = registered && new Date(c.at).getTime() - Date.now() > LIVE_CANCEL_HOURS * 3_600_000
  const enter = async () => {
    const l = await run(() => enterLiveClass(c.id))
    if (l) {
      setLink(l)
      window.open(l, '_blank', 'noopener')
    }
  }
  return (
    <div className="animate-fade-up">
      <PageHeader back="/live" title={c.title} subtitle={`${c.sport} · ${LIVE_LEVEL[c.level]}`} />
      <Card className="flex items-center gap-3">
        <Avatar name={host?.name ?? ''} src={host?.avatar} size={56} />
        <div className="flex-1">
          <div className="text-xs text-ink-400">مدرس</div>
          <Link to={`/fityar/coach/${c.hostId}`} className="font-semibold">{host?.name}</Link>
        </div>
        {c.status === 'cancelled' ? <Badge color="rose">لغو شد</Badge> : live ? <Badge color="rose">زنده</Badge> : ended ? <Badge>برگزار شد</Badge> : <Badge color="sky">{faDateTime(c.at)}</Badge>}
      </Card>
      {c.description && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-600 dark:text-ink-300">{c.description}</p>}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Card className="p-3"><div className="text-ink-400">مدت</div><div className="mt-1 font-semibold">{num(c.durationMin)} دقیقه</div></Card>
        <Card className="p-3"><div className="text-ink-400">ظرفیت</div><div className="mt-1 flex items-center justify-center gap-1 font-semibold"><Users size={13} />{num(c.attendees.length)}/{num(c.capacity)}</div></Card>
        <Card className="p-3"><div className="text-ink-400">بلیت</div><div className="mt-1 font-semibold">{c.price ? toman(c.price) : 'رایگان'}</div></Card>
      </div>

      {c.status === 'scheduled' && !ended && (
        <Card className="mt-4 space-y-3">
          {registered || isHost ? (
            <>
              <Button className="w-full" size="lg" icon={<Video size={18} />} disabled={!live} onClick={enter}>
                {live ? 'ورود به کلاس' : `ورود از ${num(LIVE_EARLY_MIN)} دقیقه قبل فعال می‌شود`}
              </Button>
              {link && <a href={link} target="_blank" rel="noreferrer" className="block text-center text-xs text-aqua-600 underline">اگر کلاس باز نشد، اینجا بزنید</a>}
              {registered && c.joined.includes(me.id) && <div className="text-center text-xs text-aqua-600">حضور شما ثبت شد و تمرین امروز به‌روز شد.</div>}
              {canLeave && (
                <Button className="w-full" variant="ghost" onClick={() => confirm('انصراف و بازگشت وجه؟') && runOk(() => leaveLiveClass(c.id), 'انصراف ثبت شد')}>
                  انصراف (تا {num(LIVE_CANCEL_HOURS)} ساعت قبل)
                </Button>
              )}
            </>
          ) : (
            <>
              {c.price > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>بهای بلیت</span>
                  <PerkPrice userId={me.id} module="fityar" amount={c.price} />
                </div>
              )}
              {c.price > 0 && <div className="text-xs text-ink-400">موجودی کیف پول: {toman(bal)}</div>}
              <Button className="w-full" size="lg" disabled={full} onClick={() => runOk(() => registerLiveClass(c.id), 'ثبت‌نام شد')}>
                {full ? 'ظرفیت تکمیل است' : c.price ? 'ثبت‌نام و پرداخت' : 'ثبت‌نام رایگان'}
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
