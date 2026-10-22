import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Gift, Share2, Ticket, Trophy, Zap } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { daysLeft, faDate, num, toman } from '@/core/format'
import { joinChallenge, logChallengeProgress, rankings, settleChallenge } from '@/core/services/challenges'
import { ROLE_META } from '@/core/config'
import { Avatar, Badge, Button, Card, Empty, Field, HeroHeader, Input, NumberInput, PageHeader, Progress, RaisedSheet, SectionTitle, Sheet, Stat } from '@/ui/kit'
import { useMe, useUserMap, useBalance } from '@/ui/hooks'
import { run, runOk } from '@/ui/toast'
import { CreatePostSheet } from '@/modules/fitzone/CreatePost'
import { PostCard } from '@/modules/fitzone/PostCard'

const MEDALS = ['🥇', '🥈', '🥉']

export default function ChallengeDetail() {
  const { id } = useParams()
  const me = useMe()!
  const c = useDB((s) => s.challenges.find((x) => x.id === id))
  const posts = useDB((s) => s.posts)
  const users = useUserMap()
  const bal = useBalance(me.id)
  const [log, setLog] = useState(false)
  const [value, setValue] = useState(0)
  const [note, setNote] = useState('')
  const [share, setShare] = useState(false)
  const [join, setJoin] = useState(false)

  if (!c) return <Empty icon="🔍" title="چالش یافت نشد" />
  const ranked = rankings(c)
  const myIdx = ranked.findIndex((p) => p.userId === me.id)
  const mine = ranked[myIdx]
  const creator = users[c.creatorId]
  const creatorRole = creator?.roles.find((r) => r !== 'user')
  const left = daysLeft(c.endAt)
  const canSettle = c.status === 'active' && (c.creatorId === me.id || me.roles.includes('admin'))
  const related = posts.filter((p) => p.challengeId === c.id)

  return (
    <div className="animate-fade-up">
      <PageHeader back="/challenges" title={c.title} actions={<Button variant="outline" size="sm" icon={<Share2 size={15} />} onClick={() => setShare(true)}>فیت‌زون</Button>} />
      <HeroHeader gradient={c.gradient} className="px-5 pb-14 pt-6 text-center">
        <div className="text-6xl drop-shadow-xl">{c.emoji}</div>
        <div className="mt-2 text-xs font-semibold text-white/80">صندوق جایزه</div>
        <div className="text-[2.5rem] font-black leading-tight tracking-tight">{toman(c.pool)}</div>
        {c.extraReward && <div className="mx-auto mt-2 w-fit rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">🎁 {c.extraReward}</div>}
      </HeroHeader>
      <RaisedSheet className="mx-auto max-w-3xl">
        <div className="grid grid-cols-3 text-center">
          {[
            ['زمان باقی‌مانده', c.status === 'finished' ? 'پایان‌یافته' : left > 0 ? `${num(left)} روز` : 'اعلام نتایج'],
            ['شرکت‌کننده', `${num(c.participants.length)} / ${num(c.maxParticipants)}`],
            ['هدف', `${num(c.goal)} ${c.unit}`],
          ].map(([k, v], i) => (
            <div key={k} className={i === 1 ? 'border-x border-ink-100 dark:border-white/10' : ''}>
              <div className="text-[11px] text-ink-400">{k}</div>
              <div className="mt-0.5 text-sm font-black">{v}</div>
            </div>
          ))}
        </div>
      </RaisedSheet>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <p className="text-sm leading-7 text-ink-600 dark:text-ink-300">{c.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
              <Link to={`/u/${c.creatorId}`} className="flex items-center gap-1.5">
                <Avatar name={creator?.name ?? ''} size={24} /> سازنده: <b>{creator?.name}</b>
              </Link>
              {creatorRole && <Badge color="sky">{ROLE_META[creatorRole].label}</Badge>}
              <span>· {faDate(c.startAt)} تا {faDate(c.endAt)}</span>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="ورودی" value={c.entryFee ? num(c.entryFee) : 'رایگان'} hint={c.entryFee ? 'تومان' : undefined} icon={<Ticket size={18} />} tone="rose" />
            <Stat label="امتیاز تجربه" value={`+${num(c.xpReward)} XP`} hint="با رسیدن به هدف" icon={<Zap size={18} />} tone="sky" />
          </div>

          {mine ? (
            <Card className="bg-gradient-to-br from-white to-brand-50 dark:from-ink-900/70 dark:to-ink-850/70">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-ink-500">پیشرفت تو</div>
                  <div className="text-2xl font-black">
                    {num(mine.score)} <span className="text-sm font-normal text-ink-400">/ {num(c.goal)} {c.unit}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-ink-500">رتبه</div>
                  <div className="text-3xl font-black text-brand-600 dark:text-gold-300">{MEDALS[myIdx] ?? num(myIdx + 1)}</div>
                </div>
              </div>
              <Progress value={mine.score / c.goal} className="mt-3 h-2.5" tone="from-coral-400 to-fuchsia-600" />
              {c.status === 'active' && left > 0 && (
                <Button className="mt-4 w-full" onClick={() => setLog(true)}>
                  ثبت پیشرفت امروز
                </Button>
              )}
            </Card>
          ) : c.status === 'active' ? (
            <Button size="lg" className="w-full" icon={<Trophy size={18} />} onClick={() => setJoin(true)}>
              شرکت در چالش {c.entryFee ? `(${toman(c.entryFee)})` : '(رایگان)'}
            </Button>
          ) : null}

          {c.status === 'finished' && c.winners && (
            <Card>
              <div className="mb-3 font-extrabold">🏆 برندگان</div>
              {c.winners.length === 0 && <div className="text-sm text-ink-500">برنده‌ای ثبت نشد.</div>}
              {c.winners.map((w) => (
                <div key={w.userId} className="flex items-center gap-3 py-2">
                  <span className="text-2xl">{MEDALS[w.rank - 1] ?? w.rank}</span>
                  <Avatar name={users[w.userId]?.name ?? ''} size={36} />
                  <div className="flex-1 font-bold">{users[w.userId]?.name}</div>
                  <b className="text-brand-600">{toman(w.amount)}</b>
                </div>
              ))}
            </Card>
          )}

          {related.length > 0 && (
            <>
              <SectionTitle title="پست‌های این چالش در فیت‌زون" />
              {related.map((p) => <PostCard key={p.id} post={p} />)}
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2 font-extrabold">
              <Gift size={18} className="text-rose-500" /> جوایز
            </div>
            {c.prizes.map((p) => (
              <div key={p.rank} className="flex items-center justify-between py-1.5 text-sm">
                <span>{MEDALS[p.rank - 1] ?? p.rank} {p.title}</span>
                <b>{toman(Math.floor((c.pool * p.percent) / 100))}</b>
              </div>
            ))}
            <div className="mt-2 text-[11px] text-ink-400">صندوق با هر شرکت‌کننده‌ی جدید بزرگ‌تر می‌شود.</div>
          </Card>
          <Card>
            <div className="mb-3 font-extrabold">📊 جدول رده‌بندی</div>
            <div className="space-y-1">
              {ranked.slice(0, 20).map((p, i) => {
                const u = users[p.userId]
                return (
                  <Link to={`/u/${p.userId}`} key={p.userId} className={clsx('flex items-center gap-2 rounded-2xl p-2', p.userId === me.id && 'bg-brand-50 dark:bg-gold-400/10')}>
                    <span className="w-6 text-center font-black text-ink-400">{MEDALS[i] ?? num(i + 1)}</span>
                    <Avatar name={u?.name ?? ''} src={u?.avatar} size={32} />
                    <span className="flex-1 truncate text-sm font-semibold">{u?.name}</span>
                    <span className="text-xs font-bold">{num(p.score)}</span>
                  </Link>
                )
              })}
              {ranked.length === 0 && <div className="py-4 text-center text-sm text-ink-400">اولین نفر باش! 🚀</div>}
            </div>
          </Card>
          {canSettle && (
            <Button variant="outline" className="w-full" onClick={() => run(() => settleChallenge(c.id, me.roles.includes('admin')), 'چالش بسته و جوایز پرداخت شد 🏆')}>
              پایان چالش و پرداخت جوایز
            </Button>
          )}
        </div>
      </div>

      <Sheet open={join} onClose={() => setJoin(false)} title={`شرکت در «${c.title}»`}>
        <p className="text-sm leading-7 text-ink-500">
          {c.entryFee ? `ورودی ${toman(c.entryFee)} از کیف پولت کسر و به صندوق جایزه اضافه می‌شود.` : 'شرکت در این چالش رایگان است.'} با ثبت روزانه‌ی پیشرفتت در رده‌بندی بالا برو!
        </p>
        <div className="my-3 text-xs text-ink-400">موجودی کیف پول: {toman(bal)}</div>
        <Button
          className="w-full"
          size="lg"
          onClick={async () => {
            const ok = await runOk(() => joinChallenge(c.id), 'به چالش پیوستی! 🏁')
            if (ok) setJoin(false)
          }}
        >
          تایید و شرکت
        </Button>
      </Sheet>

      <Sheet open={log} onClose={() => setLog(false)} title="ثبت پیشرفت">
        <div className="space-y-3">
          <Field label={`مقدار (${c.unit})`}>
            <NumberInput value={value} onChange={setValue} placeholder="مثلاً ۸۵۰۰" />
          </Field>
          <Field label="یادداشت (اختیاری)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button
            className="w-full"
            onClick={async () => {
              const ok = await runOk(() => logChallengeProgress(c.id, value, note), 'ثبت شد 💪')
              if (ok) {
                setLog(false)
                setValue(0)
                setNote('')
              }
            }}
          >
            ثبت
          </Button>
        </div>
      </Sheet>

      <CreatePostSheet open={share} onClose={() => setShare(false)} challengeId={c.id} initialText={`من توی چالش «${c.title}» هستم ${c.emoji} تو هم بیا!`} />
    </div>
  )
}
