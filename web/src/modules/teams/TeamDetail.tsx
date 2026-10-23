import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { Check, Copy, MessageCircle, Plus, Share2, Trash2, Trophy, UserPlus, X } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, num } from '@/core/format'
import { deleteTeamSession, inviteToTeam, leaveTeam, removeTeamMember, rsvpTeamSession, scheduleTeamSession, teamBoard, TEAM_MAX } from '@/core/services/teams'
import { Avatar, Button, Card, Empty, Field, Input, PageHeader, SectionTitle, Select, Sheet } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { run, runOk, toast } from '@/ui/toast'

export default function TeamDetail() {
  const { id } = useParams()
  const me = useMe()!
  const nav = useNavigate()
  const team = useDB((s) => s.teams.find((t) => t.id === id))
  const users = useDB((s) => s.users)
  const gyms = useDB((s) => s.gyms)
  const challenges = useDB((s) => s.challenges)
  const userMap = useUserMap()
  const [plan, setPlan] = useState(false)
  const [invite, setInvite] = useState(false)
  const tomorrow = new Date(Date.now() + 86_400_000)
  const [f, setF] = useState({ title: '', day: tomorrow.toISOString().slice(0, 10), time: '18:00', gymId: '', note: '' })
  if (!team || !team.members.includes(me.id)) return <Empty title="تیم یافت نشد" />
  const owner = team.ownerId === me.id
  const upcoming = team.sessions.filter((s) => new Date(s.at).getTime() > Date.now() - 2 * 3_600_000)
  const board = teamBoard(team, users)
  const teamChallenges = challenges.filter((c) => c.teamId === team.id && c.status === 'active')
  const candidates = users.filter((u) => me.following.includes(u.id) && !team.members.includes(u.id))
  const share = async () => {
    const text = `به تیم «${team.name}» در کی‌فیت بپیوند! کد: ${team.code} — ${location.origin}/teams?join=${team.code}`
    try {
      if (navigator.share) await navigator.share({ title: team.name, text })
      else {
        await navigator.clipboard.writeText(text)
        toast.success('متن دعوت کپی شد')
      }
    } catch {
      /* لغو */
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader back="/teams" title={team.name} subtitle={team.goal} actions={<Link to={`/messages/${team.threadId}`}><Button size="sm" icon={<MessageCircle size={15} />}>گفتگوی تیم</Button></Link>} />

      <Card className="p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">اعضا ({num(team.members.length)} از {num(TEAM_MAX)})</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<UserPlus size={14} />} onClick={() => setInvite(true)}>دعوت</Button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {team.members.map((m) => (
            <div key={m} className="flex items-center gap-2">
              <Link to={`/u/${m}`} className="flex flex-1 items-center gap-2">
                <Avatar name={userMap[m]?.name ?? ''} src={userMap[m]?.avatar} size={32} />
                <span className="text-sm">{userMap[m]?.name}</span>
                {m === team.ownerId && <span className="text-[10px] text-ink-400">سازنده</span>}
              </Link>
              {owner && m !== me.id && <button className="text-[11px] text-coral-500" onClick={() => confirm('این عضو حذف شود؟') && run(() => removeTeamMember(team.id, m))}>حذف</button>}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-ink-900/[.04] p-3 dark:bg-white/[.05]">
          <span className="text-xs text-ink-500">کد دعوت</span>
          <span className="flex-1 font-display text-2xl tracking-widest" dir="ltr">{team.code}</span>
          <Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={() => { navigator.clipboard?.writeText(team.code); toast.success('کد کپی شد') }} />
          <Button size="sm" variant="ghost" icon={<Share2 size={14} />} onClick={share} />
        </div>
      </Card>

      <SectionTitle title="قرارهای تمرین" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setPlan(true)}>قرار جدید</Button>} />
      {upcoming.length === 0 && <p className="text-xs text-ink-400">قراری ثبت نشده است. یک جلسه‌ی مشترک در باشگاه، پارک یا زمین چمن بگذارید.</p>}
      <div className="space-y-2">
        {upcoming.map((s) => {
          const going = s.going.includes(me.id)
          const no = s.notGoing.includes(me.id)
          const g = gyms.find((x) => x.id === s.gymId)
          return (
            <Card key={s.id}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-[11px] text-ink-500">{faDateTime(s.at)}{g ? ` · ` : ''}{g && <Link to={`/fityab/${g.id}`} className="underline">{g.name}</Link>}</div>
                  {s.note && <div className="mt-1 text-[11px] text-ink-400">{s.note}</div>}
                </div>
                {(s.createdBy === me.id || owner) && <button className="text-ink-300 hover:text-coral-500" onClick={() => confirm('قرار لغو شود؟') && run(() => deleteTeamSession(team.id, s.id))} aria-label="لغو"><Trash2 size={14} /></button>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant={going ? 'primary' : 'secondary'} icon={<Check size={13} />} onClick={() => run(() => rsvpTeamSession(team.id, s.id, true))}>می‌آیم</Button>
                <Button size="sm" variant={no ? 'dark' : 'ghost'} icon={<X size={13} />} onClick={() => run(() => rsvpTeamSession(team.id, s.id, false))}>نمی‌آیم</Button>
                <div className="mr-auto flex -space-x-2 space-x-reverse">
                  {s.going.map((m) => <Avatar key={m} name={userMap[m]?.name ?? ''} src={userMap[m]?.avatar} size={24} className="ring-2 ring-white dark:ring-ink-850" />)}
                </div>
              </div>
              {g && <Link to={`/fityab/${g.id}`} className="mt-2 block text-[11px] text-brand-600 dark:text-brand-300">رزرو بلیت / زمین در {g.name}</Link>}
            </Card>
          )
        })}
      </div>

      <SectionTitle title="چالش‌های تیم" action={<Link to={`/challenges/new?team=${team.id}`}><Button size="sm" variant="secondary" icon={<Trophy size={14} />}>چالش تیمی</Button></Link>} />
      {teamChallenges.length === 0 ? <p className="text-xs text-ink-400">چالش تیمی بدون جایزه‌ی نقدی رایگان است.</p> : teamChallenges.map((c) => (
        <Link key={c.id} to={`/challenges/${c.id}`}><Card className="mb-2 text-sm font-medium">{c.title} <span className="text-[11px] text-ink-400">· {num(c.participants.length)} شرکت‌کننده</span></Card></Link>
      ))}

      <SectionTitle title="رتبه‌بندی این هفته" />
      <Card className="px-3 py-1">
        {board.map((x, i) => (
          <div key={x.user.id} className={clsx('flex items-center gap-3 border-b hairline py-2.5 last:border-0', x.user.id === me.id && 'font-semibold')}>
            <span className="w-5 text-center text-ink-400">{num(i + 1)}</span>
            <Avatar name={x.user.name} src={x.user.avatar} size={28} />
            <span className="flex-1 text-sm">{x.user.name}</span>
            <span className="text-xs tabular-nums">{num(x.xp)}</span>
          </div>
        ))}
      </Card>

      <Button variant="ghost" className="mt-6 w-full text-coral-500" onClick={async () => { if (confirm('از تیم خارج می‌شوید؟') && (await runOk(() => leaveTeam(team.id), 'از تیم خارج شدید'))) nav('/teams') }}>ترک تیم</Button>

      <Sheet open={plan} onClose={() => setPlan(false)} title="قرار تمرین جدید">
        <div className="space-y-3">
          <Field label="عنوان"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="مثلاً پا و باسن / فوتبال جمعه" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="تاریخ"><Input type="date" dir="ltr" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></Field>
            <Field label="ساعت"><Input type="time" dir="ltr" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
          </div>
          <Field label="مکان (اختیاری)">
            <Select value={f.gymId} onChange={(e) => setF({ ...f, gymId: e.target.value })}>
              <option value="">بیرون از فیت‌یاب (پارک، خانه…)</option>
              {gyms.filter((g) => g.approved).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </Field>
          <Field label="توضیح (اختیاری)"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <Button className="w-full" onClick={async () => { if (await runOk(() => scheduleTeamSession(team.id, { title: f.title, at: new Date(`${f.day}T${f.time}`).toISOString(), gymId: f.gymId || undefined, note: f.note }), 'قرار ثبت و به اعضا اطلاع داده شد')) setPlan(false) }}>ثبت قرار</Button>
        </div>
      </Sheet>

      <Sheet open={invite} onClose={() => setInvite(false)} title="دعوت از دوستان">
        <Button className="mb-3 w-full" variant="secondary" icon={<Share2 size={15} />} onClick={share}>ارسال لینک دعوت</Button>
        <div className="text-xs text-ink-500">از دنبال‌شده‌هایت:</div>
        <div className="mt-2 max-h-[45vh] space-y-1 overflow-y-auto">
          {candidates.length === 0 && <div className="py-4 text-center text-xs text-ink-400">کسی را دنبال نکرده‌ای؛ لینک دعوت بفرست.</div>}
          {candidates.map((u) => (
            <div key={u.id} className="flex items-center gap-2 py-1.5">
              <Avatar name={u.name} src={u.avatar} size={30} />
              <span className="flex-1 text-sm">{u.name}</span>
              <Button size="sm" variant="secondary" onClick={() => run(() => inviteToTeam(team.id, u.id), 'دعوت ارسال شد')}>دعوت</Button>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
