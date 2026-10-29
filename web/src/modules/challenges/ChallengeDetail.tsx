import { useState } from 'react'
import { faDateTime } from '@/core/format'
import { Link, useParams } from 'react-router-dom'
import { Check, Gift, ShieldCheck, Share2, Ticket, Trophy, X, Zap } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { daysLeft, faDate, num, toman } from '@/core/format'
import { DAILY_CAP, VERIFICATION_LABEL, joinChallenge, logChallengeProgress, pendingLogs, rankings, reviewChallengeLog, settleChallenge, verificationOf } from '@/core/services/challenges'
import { ROLE_META } from '@/core/config'
import { freeChallengeLeft } from '@/core/services/perks'
import { toneFor, Avatar, Badge, Button, Card, Empty, Field, ImagePicker, Money, Input, NumberInput, PageHeader, Progress, RaisedSheet, SectionTitle, Sheet, Stat } from '@/ui/kit'
import { useMe, useUserMap, useBalance } from '@/ui/hooks'
import { run, runOk } from '@/ui/toast'
import { MetricIcon } from '@/ui/icons'
import { CreatePostSheet } from '@/modules/fitzone/CreatePost'
import { PostCard } from '@/modules/fitzone/PostCard'
import { vtName } from '@/ui/ViewTransitions'
import { MetricArt } from '@/ui/art'
import { moment } from '@/ui/moments'

const MEDALS = ['', '', '']

export default function ChallengeDetail() {
  const { id } = useParams()
  const me = useMe()!
  const c = useDB((s) => s.challenges.find((x) => x.id === id))
  const posts = useDB((s) => s.posts)
  const users = useUserMap()
  const bal = useBalance(me.id)
  useDB((s) => s.subscriptions)
  const freeEntries = freeChallengeLeft(me.id)
  const [log, setLog] = useState(false)
  const [value, setValue] = useState(0)
  const [note, setNote] = useState('')
  const [proof, setProof] = useState<string>()
  const [share, setShare] = useState(false)
  const [postText, setPostText] = useState<string>()
  const [join, setJoin] = useState(false)

  if (!c) return <Empty icon="" title="چالش یافت نشد" />
  const ranked = rankings(c)
  const myIdx = ranked.findIndex((p) => p.userId === me.id)
  const mine = ranked[myIdx]
  const creator = users[c.creatorId]
  const creatorRole = creator?.roles.find((r) => r !== 'user')
  const left = daysLeft(c.endAt)
  const canSettle = c.status === 'active' && (c.creatorId === me.id || me.roles.includes('admin'))
  const related = posts.filter((p) => p.challengeId === c.id && !p.hidden)
  const mode = verificationOf(c)
  const isJudge = c.creatorId === me.id || me.roles.includes('admin')
  const pending = pendingLogs(c)
  const myPending = mine ? mine.logs.filter((l) => l.status === 'pending') : []

  return (
    <div className="animate-fade-up">
      <PageHeader back="/challenges" title={c.title} actions={<Button variant="outline" size="sm" icon={<Share2 size={15} />} onClick={() => setShare(true)}>فیت‌زون</Button>} />
      <div style={vtName(`ch-${c.id}`)} className={`relative overflow-hidden rounded-[30px] px-6 pb-14 pt-8 text-center text-ink-950 ${toneFor(c.id)}`}>
        <MetricArt metric={c.metric} size={130} className="pointer-events-none absolute -bottom-3 left-2 opacity-80" />
        <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-950 text-white">
          <MetricIcon metric={c.metric} size={20} />
        </div>
        <div className="relative mt-5 text-[13px] font-semibold opacity-70">صندوق جایزه</div>
        <div className="relative mt-1 text-[44px] font-black leading-none"><Money value={c.pool} /></div>
        {c.extraReward && <div className="relative mx-auto mt-4 w-fit rounded-full bg-white/50 px-3 py-1.5 text-[13px] font-semibold">+ {c.extraReward}</div>}
      </div>
      <RaisedSheet className="mx-3 sm:mx-auto sm:max-w-3xl">
        <div className="grid grid-cols-3 text-center">
          {[
            ['زمان باقی‌مانده', c.status === 'finished' ? 'پایان‌یافته' : left > 0 ? `${num(left)} روز` : 'اعلام نتایج'],
            ['شرکت‌کننده', `${num(c.participants.length)} / ${num(c.maxParticipants)}`],
            ['هدف', `${num(c.goal)} ${c.unit}`],
          ].map(([k, v], i) => (
            <div key={k} className={i === 1 ? 'border-x hairline' : ''}>
              <div className="text-[12px] text-ink-400">{k}</div>
              <div className="mt-0.5 text-sm font-semibold">{v}</div>
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
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-aqua-400/10 px-3 py-2 text-xs text-ink-600 dark:text-ink-300">
              <ShieldCheck size={15} className="shrink-0 text-aqua-600 dark:text-aqua-300" />
              تأیید امتیاز: {VERIFICATION_LABEL[mode]} · سقف روزانه {num(DAILY_CAP[c.metric])} {c.unit}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="ورودی" value={c.entryFee ? num(c.entryFee) : 'رایگان'} hint={c.entryFee ? 'تومان' : undefined} icon={<Ticket size={18} />} tone="violet" />
            <Stat label="امتیاز تجربه" value={`+${num(c.xpReward)} XP`} hint="با رسیدن به هدف" icon={<Zap size={18} />} tone="sky" />
          </div>

          {mine ? (
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-ink-500">پیشرفت تو</div>
                  <div className="text-2xl font-semibold">
                    {num(mine.score)} <span className="text-sm font-normal text-ink-400">/ {num(c.goal)} {c.unit}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-ink-500">رتبه</div>
                  <div className="text-3xl font-semibold text-brand-600 dark:text-gold-300">{MEDALS[myIdx] ?? num(myIdx + 1)}</div>
                </div>
              </div>
              <Progress value={mine.score / c.goal} className="mt-3 h-2.5" tone="from-coral-400 to-ink-900" />
              {myPending.length > 0 && <div className="mt-2 text-[12px] text-gold-700 dark:text-gold-300">{num(myPending.reduce((a, l) => a + l.value, 0))} {c.unit} در انتظار تأیید سازنده</div>}
              {c.status === 'active' && left > 0 && mode !== 'auto' && (
                <Button className="mt-4 w-full" onClick={() => setLog(true)}>
                  ثبت پیشرفت امروز
                </Button>
              )}
              {c.status === 'active' && mode === 'auto' && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link to="/fityab"><Button variant="secondary" className="w-full">ورود به باشگاه</Button></Link>
                  <Link to="/workouts"><Button variant="secondary" className="w-full">ثبت تمرین</Button></Link>
                </div>
              )}
            </Card>
          ) : c.status === 'active' ? (
            <Button size="lg" className="w-full" icon={<Trophy size={18} />} onClick={() => setJoin(true)}>
              شرکت در چالش {c.entryFee ? (freeEntries > 0 ? '(رایگان با اشتراک)' : `(${toman(c.entryFee)})`) : '(رایگان)'}
            </Button>
          ) : null}

          {isJudge && pending.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center justify-between font-semibold">
                بررسی ثبت‌ها <Badge color="amber">{num(pending.length)} مورد</Badge>
              </div>
              <div className="space-y-3">
                {pending.map(({ userId, log: l }) => (
                  <div key={l.id} className="flex gap-3 rounded-2xl bg-ink-900/[.03] p-3 dark:bg-white/[.04]">
                    {l.proof ? <a href={l.proof} target="_blank" rel="noreferrer"><img loading="lazy" decoding="async" src={l.proof} alt="مدرک" className="h-20 w-20 rounded-xl object-cover" /></a> : <div className="h-20 w-20 rounded-xl bg-ink-900/10" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{users[userId]?.name}</div>
                      <div className="text-xs text-ink-500">{num(l.value)} {c.unit} · {faDateTime(l.at)}</div>
                      {l.note && <div className="mt-1 truncate text-[12px] text-ink-400">{l.note}</div>}
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" icon={<Check size={14} />} onClick={() => run(() => reviewChallengeLog(c.id, userId, l.id!, true), 'تأیید شد')}>تأیید</Button>
                        <Button size="sm" variant="ghost" className="text-coral-500" icon={<X size={14} />} onClick={() => run(() => reviewChallengeLog(c.id, userId, l.id!, false), 'رد شد')}>رد</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {c.status === 'finished' && c.winners && (
            <Card>
              <div className="mb-3 font-semibold">برندگان</div>
              {c.winners.length === 0 && <div className="text-sm text-ink-500">برنده‌ای ثبت نشد.</div>}
              {c.winners.map((w) => (
                <div key={w.userId} className="flex items-center gap-3 py-2">
                  <span className="text-2xl">{MEDALS[w.rank - 1] ?? w.rank}</span>
                  <Avatar name={users[w.userId]?.name ?? ''} size={36} />
                  <div className="flex-1 font-semibold">{users[w.userId]?.name}</div>
                  <b className="text-brand-600">{toman(w.amount)}</b>
                </div>
              ))}
            </Card>
          )}

          {/* دیوار چالش: عکس، متن و ایموجی شرکت‌کننده‌ها با واکنش‌های ایموجی */}
          <SectionTitle title="دیوار چالش" />
          {mine && (
            <Button variant="secondary" className="mb-3 w-full" onClick={() => { setPostText(''); setShare(true) }}>
              امروز چطور پیش رفت؟ عکس یا متن بگذار
            </Button>
          )}
          {related.length > 0 ? related.map((p) => <PostCard key={p.id} post={p} />) : (
            <p className="py-4 text-center text-[13px] text-ink-500">{mine ? 'هنوز پستی نیست؛ اولین نفر باش.' : 'با پیوستن به چالش، روی دیوار آن پست بگذار.'}</p>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Gift size={18} className="text-coral-500" /> جوایز
            </div>
            {c.prizes.map((p) => (
              <div key={p.rank} className="flex items-center justify-between py-1.5 text-sm">
                <span>{MEDALS[p.rank - 1] ?? p.rank} {p.title}</span>
                <b>{toman(Math.floor((c.pool * p.percent) / 100))}</b>
              </div>
            ))}
            <div className="mt-2 text-[12px] text-ink-400">صندوق با هر شرکت‌کننده‌ی جدید بزرگ‌تر می‌شود.</div>
          </Card>
          <Card>
            <div className="mb-3 font-semibold">جدول رده‌بندی</div>
            <div className="space-y-1">
              {ranked.slice(0, 20).map((p, i) => {
                const u = users[p.userId]
                return (
                  <Link to={`/u/${p.userId}`} key={p.userId} className={clsx('flex items-center gap-2 rounded-2xl p-2', p.userId === me.id && 'bg-brand-50 dark:bg-gold-400/10')}>
                    <span className="w-6 text-center font-semibold text-ink-400">{MEDALS[i] ?? num(i + 1)}</span>
                    <Avatar name={u?.name ?? ''} src={u?.avatar} size={32} />
                    <span className="flex-1 truncate text-sm font-medium">{u?.name}</span>
                    <span className="text-xs font-semibold">{num(p.score)}</span>
                  </Link>
                )
              })}
              {ranked.length === 0 && <div className="py-4 text-center text-sm text-ink-400">اولین نفر باش!</div>}
            </div>
          </Card>
          {canSettle && (
            <Button variant="outline" className="w-full" onClick={() => run(() => settleChallenge(c.id, me.roles.includes('admin')), 'چالش بسته و جوایز پرداخت شد')}>
              پایان چالش و پرداخت جوایز
            </Button>
          )}
        </div>
      </div>

      <Sheet open={join} onClose={() => setJoin(false)} title={`شرکت در «${c.title}»`}>
        <p className="text-sm leading-7 text-ink-500">
          {c.entryFee ? (freeEntries > 0 ? `ورودی این چالش با مزیت اشتراکت رایگان است (${num(freeEntries)} ورود رایگان باقی‌مانده).` : `ورودی ${toman(c.entryFee)} از کیف پولت کسر و به صندوق جایزه اضافه می‌شود.`) : 'شرکت در این چالش رایگان است.'} با ثبت روزانه‌ی پیشرفتت در رده‌بندی بالا برو!
        </p>
        <div className="my-3 text-xs text-ink-400">موجودی کیف پول: {toman(bal)}</div>
        <Button
          className="w-full"
          size="lg"
          onClick={async () => {
            const ok = await runOk(() => joinChallenge(c.id))
            if (ok) moment('join', { title: 'به چالش پیوستی!', sub: c.title })
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
          {mode === 'proof' && (
            <div>
              <div className="mb-2 text-xs text-ink-500">عکس مدرک (اسکرین‌شات قدم‌شمار، ساعت هوشمند، ترازو…) — الزامی</div>
              <ImagePicker value={proof} onChange={setProof} label="افزودن عکس مدرک" />
            </div>
          )}
          <Button
            className="w-full"
            onClick={async () => {
              const ok = await runOk(() => logChallengeProgress(c.id, value, note, proof), mode === 'proof' ? 'ثبت شد و پس از تأیید سازنده در امتیاز حساب می‌شود' : 'ثبت شد')
              if (ok) {
                setLog(false)
                setValue(0)
                setNote('')
                setProof(undefined)
              }
            }}
          >
            ثبت
          </Button>
        </div>
      </Sheet>

      <CreatePostSheet open={share} onClose={() => { setShare(false); setPostText(undefined) }} challengeId={c.id} initialText={postText ?? `من توی چالش «${c.title}» هستم ${c.emoji} تو هم بیا!`} />
    </div>
  )
}
