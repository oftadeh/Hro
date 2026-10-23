import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { CalendarClock, Clock, Heart, MapPin, Navigation, Phone, Share2, Star, Ticket, Users } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDate, faTime, num, toman } from '@/core/format'
import { campaignOffer } from '@/core/services/members'
import { ageOf, classEligibility } from '@/core/services/family'
import { bookClass, bookedCount, checkIn, classPrice, occupancy, priceAt, reviewGym, ticketStatus, toggleFavoriteGym, upcomingClasses, weekdayLabel, weekdayOf } from '@/core/services/fityab'
import { activeSubscription } from '@/core/services/wallet'
import type { GymClass } from '@/core/types'
import { Avatar, Badge, Button, Card, Cover, Empty, Field, PageHeader, SectionTitle, Select, Sheet, Stars, Textarea } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { run, runOk, toast } from '@/ui/toast'
import { GymMap } from './GymMap'
import { GENDER_LABEL } from './GymCard'
import { directionsUrl, neshanUrl, wazeUrl } from './nav'
import { PaySheet, TicketSheet } from './TicketView'
import { RentalBox } from './RentalBox'
import { isRental } from '@/core/services/fityab'
import { PostCard } from '@/modules/fitzone/PostCard'
import { CreatePostSheet } from '@/modules/fitzone/CreatePost'

export default function GymDetail() {
  const { id } = useParams()
  const me = useMe()!
  const gym = useDB((s) => s.gyms.find((g) => g.id === id))
  const checkins = useDB((s) => s.checkins)
  const posts = useDB((s) => s.posts)
  const reviews = useDB((s) => s.reviews)
  const users = useDB((s) => s.users)
  useDB((s) => s.subscriptions)
  const bal = useBalance(me.id)
  const sub = activeSubscription(me.id)
  const [confirm, setConfirm] = useState(false)
  const [book, setBook] = useState<{ cls: GymClass; at: Date }>()
  const [memberId, setMemberId] = useState('')
  const campaigns = useDB((s) => s.campaigns)
  const [ticketId, setTicketId] = useState<string>()
  const [media, setMedia] = useState(0)
  const [share, setShare] = useState(false)
  const [dayIdx, setDayIdx] = useState(0)
  const [rv, setRv] = useState({ open: false, stars: 5, text: '' })
  const slots = useMemo(() => (gym ? upcomingClasses(gym, 7) : []), [gym])

  if (!gym) return <Empty icon="" title="باشگاه یافت نشد" />
  const mine = checkins.filter((c) => c.gymId === gym.id && c.userId === me.id)
  const active = mine.find((c) => !c.classId && ticketStatus(c) === 'active')
  const myClasses = mine.filter((c) => c.classId && ticketStatus(c) === 'active')
  const ticket = checkins.find((c) => c.id === ticketId)
  const offer = campaignOffer({ campaigns }, me.id, gym.id)
  const withOffer = (p: number) => (offer ? Math.round((p * (100 - offer.pct!)) / 100 / 1000) * 1000 : p)
  const now = priceAt(gym)
  const kidsOk = book?.cls.audience === 'kids' ? (me.family ?? []).filter((m) => !classEligibility(book.cls, m)) : []
  const occ = occupancy(gym, { checkins })
  const fav = me.favoriteGyms?.includes(gym.id)
  const canReview = mine.some((c) => c.status === 'used' && !c.reviewed)
  const gymReviews = reviews.filter((r) => r.kind === 'gym' && r.refId === gym.id)
  const gymPosts = posts.filter((p) => p.gymId === gym.id && !p.hidden)
  const current = gym.media[media]
  const days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
  const daySlots = slots.filter((x) => x.at.toDateString() === days[dayIdx].toDateString())

  const doCheckIn = async (prefer: 'subscription' | 'wallet') => {
    const ci = await run(() => checkIn(gym.id, prefer), 'بلیت صادر شد')
    if (ci) {
      setConfirm(false)
      setTicketId(ci.id)
    }
  }
  const doBook = async (prefer: 'subscription' | 'wallet') => {
    if (!book) return
    const forMember = book.cls.audience === 'kids' ? memberId || kidsOk[0]?.id : undefined
    const ci = await run(() => bookClass(gym.id, book.cls.id, book.at.toISOString(), prefer, forMember), 'کلاس رزرو شد')
    if (ci) {
      setBook(undefined)
      setMemberId('')
      setTicketId(ci.id)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        back="/fityab"
        title={gym.name}
        subtitle={gym.tagline}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" aria-label="علاقه‌مندی" icon={<Heart size={15} className={fav ? 'fill-coral-400 text-coral-400' : ''} />} onClick={() => run(() => toggleFavoriteGym(gym.id))} />
            <Button
              variant="outline"
              size="sm"
              aria-label="اشتراک‌گذاری"
              icon={<Share2 size={15} />}
              onClick={() => {
                navigator.clipboard?.writeText(location.href)
                toast.info('لینک باشگاه کپی شد')
              }}
            />
          </div>
        }
      />

      {/* گالری عکس و فیلم */}
      <div className="overflow-hidden rounded-3xl">
        {current?.type === 'video' ? (
          <video src={current.url} controls playsInline className="aspect-video w-full bg-black object-cover" />
        ) : (
          <Cover gradient={gym.cover} image={current?.url} emoji="" className="aspect-video">
            <div className="absolute bottom-3 right-3 flex gap-1">
              {gym.sports.map((s) => <Badge key={s} color="slate" className="!bg-white/90 !text-ink-800">{s}</Badge>)}
            </div>
          </Cover>
        )}
      </div>
      {gym.media.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
          {gym.media.map((m, i) => (
            <button key={i} onClick={() => setMedia(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 ${i === media ? 'border-brand-500' : 'border-transparent'}`}>
              {m.type === 'video' ? <div className="flex h-full items-center justify-center bg-ink-900 text-xl text-white"></div> : <img src={m.url} alt="" className="h-full w-full object-cover" />}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Stars value={gym.rating} count={gym.reviews} />
              <Badge color="violet">{GENDER_LABEL[gym.gender]}</Badge>
              <Badge color={occ.tone}>
                <Users size={12} /> الان {occ.label}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-7 text-ink-600 dark:text-ink-300">{gym.description}</p>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2"><MapPin size={16} className="text-ink-400" /> {gym.address}</div>
              <div className="flex items-center gap-2"><Clock size={16} className="text-ink-400" /> {gym.hours}</div>
              <a href={`tel:${gym.phone}`} className="flex items-center gap-2"><Phone size={16} className="text-ink-400" /> <span dir="ltr">{gym.phone}</span></a>
            </div>
            <SectionTitle title="امکانات" />
            <div className="flex flex-wrap gap-2">
              {gym.facilities.map((f) => <Badge key={f}>{f}</Badge>)}
            </div>
          </Card>

          <Card className="p-2">
            <GymMap gyms={[gym]} center={[gym.lat, gym.lng]} className="h-56" />
            <div className="grid grid-cols-3 gap-2 p-2">
              <a href={directionsUrl(gym.lat, gym.lng)} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary" className="w-full" icon={<Navigation size={14} />}>گوگل مپ</Button></a>
              <a href={neshanUrl(gym.lat, gym.lng)} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary" className="w-full">نشان</Button></a>
              <a href={wazeUrl(gym.lat, gym.lng)} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary" className="w-full">ویز</Button></a>
            </div>
          </Card>

          {(gym.classes?.length ?? 0) > 0 && (
            <div>
              <SectionTitle title="کلاس‌های گروهی" action={<span className="text-xs text-ink-500">رزرو تا ۷ روز آینده</span>} />
              <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 no-scrollbar">
                {days.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setDayIdx(i)}
                    className={clsx('flex w-14 shrink-0 flex-col items-center rounded-2xl py-2 text-xs transition', i === dayIdx ? 'grad-lavender text-ink-950' : 'bg-white text-ink-500 shadow-card dark:bg-ink-850 dark:shadow-none')}
                  >
                    <span>{i === 0 ? 'امروز' : weekdayLabel(weekdayOf(d)).slice(0, 2)}</span>
                    <span className="mt-0.5 font-display text-xl leading-none">{d.toLocaleDateString('fa-IR', { day: 'numeric' })}</span>
                  </button>
                ))}
              </div>
              <Card className="px-4 py-1">
                {daySlots.length ? (
                  daySlots.map(({ cls, at }) => {
                    const key = at.toISOString()
                    const taken = bookedCount(cls.id, key, { checkins })
                    const left = cls.capacity - taken
                    const kids = cls.audience === 'kids'
                    const booked = !kids && mine.some((c) => c.classId === cls.id && c.slotAt === key && !c.memberId && (c.status === 'active' || c.status === 'used'))
                    return (
                      <div key={cls.id + key} className="flex items-center gap-3 border-b hairline py-3 last:border-0">
                        <div className="w-14 text-center">
                          <div className="font-display text-2xl leading-none">{faTime(key)}</div>
                          <div className="text-[10px] text-ink-400">{num(cls.durationMin)} دقیقه</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 truncate text-sm font-medium">{cls.title}{kids && <Badge color="violet">کودکان {num(cls.ageMin ?? 0)}–{num(cls.ageMax ?? 0)} سال</Badge>}</div>
                          <div className="truncate text-[11px] text-ink-500">
                            {cls.coachName} · {left > 0 ? `${num(left)} جای خالی` : 'تکمیل'} · {toman(classPrice(gym, cls))}
                          </div>
                        </div>
                        <Button size="sm" variant={booked ? 'secondary' : 'primary'} disabled={!booked && left <= 0} onClick={() => (booked ? setTicketId(mine.find((c) => c.classId === cls.id && c.slotAt === key)?.id) : setBook({ cls, at }))}>
                          {booked ? 'بلیت من' : left > 0 ? 'رزرو' : 'تکمیل'}
                        </Button>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-ink-400">برای این روز کلاسی ثبت نشده است</div>
                )}
              </Card>
            </div>
          )}

          <div>
            <SectionTitle
              title={`نظرات (${num(gymReviews.length)})`}
              action={canReview ? <Button size="sm" variant="secondary" onClick={() => setRv({ open: true, stars: 5, text: '' })}>ثبت نظر</Button> : undefined}
            />
            {gymReviews.length ? (
              <Card className="px-4 py-1">
                {gymReviews.slice(0, 8).map((r) => {
                  const u = users.find((x) => x.id === r.userId)
                  return (
                    <div key={r.id} className="border-b hairline py-3 last:border-0">
                      <div className="flex items-center gap-2">
                        <Avatar name={u?.name ?? 'کاربر'} src={u?.avatar} size={28} />
                        <span className="text-xs font-medium">{u?.name ?? 'کاربر کی‌فیت'}</span>
                        <Stars value={r.stars} />
                        <span className="mr-auto text-[10px] text-ink-400">{faDate(r.createdAt)}</span>
                      </div>
                      {r.text && <p className="mt-2 text-xs leading-6 text-ink-600 dark:text-ink-300">{r.text}</p>}
                      {r.reply && <p className="mt-2 rounded-xl bg-ink-900/[.04] p-2.5 text-[11px] leading-5 text-ink-500 dark:bg-white/[.05]">پاسخ باشگاه: {r.reply}</p>}
                    </div>
                  )
                })}
              </Card>
            ) : (
              <p className="text-xs text-ink-400">هنوز نظری ثبت نشده است. پس از ورود می‌توانید اولین نظر را بنویسید.</p>
            )}
          </div>

          {gymPosts.length > 0 && (
            <>
              <SectionTitle title="از فیت‌زون" />
              {gymPosts.map((p) => <PostCard key={p.id} post={p} />)}
            </>
          )}
        </div>

        {/* کارت ورود */}
        <div>
          <Card className="sticky top-20">
            {isRental(gym) ? (
              <RentalBox gym={gym} onBooked={setTicketId} />
            ) : (
            <>
            <div className="flex items-center justify-between">
              <div className="text-xs text-ink-500">سانس آزاد · همین الان</div>
              {now.offPeak && <Badge color="emerald">ساعت خلوت</Badge>}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-[2.2rem] leading-none">{toman(now.price)}</span>
              {now.offPeak && <span className="text-xs text-ink-400 line-through">{toman(now.base)}</span>}
            </div>
            {gym.offPeak && gym.offPeak.discountPct > 0 && (
              <div className="mt-2 text-[11px] text-aqua-700 dark:text-aqua-300">
                {num(gym.offPeak.discountPct)}٪ تخفیف از ساعت {num(gym.offPeak.from)} تا {num(gym.offPeak.to)}
              </div>
            )}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-ink-500">
                <span>شلوغی لحظه‌ای</span>
                <span>
                  {num(occ.count)} نفر از {num(occ.capacity)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-900/[.07] dark:bg-white/10">
                <div className={clsx('h-full rounded-full', occ.tone === 'emerald' ? 'bg-aqua-400' : occ.tone === 'amber' ? 'bg-gold-300' : 'bg-coral-400')} style={{ width: `${Math.max(4, Math.min(100, occ.ratio * 100))}%` }} />
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-ink-900/[.04] p-3 text-xs leading-6 text-ink-600 dark:bg-white/5 dark:text-ink-300">
              بدون ثبت‌نام و پرداخت در باشگاه
              <br />
              بلیت تا پایان امروز معتبر است
              <br />
              QR را در پذیرش نشان دهید
            </div>
            {active ? (
              <Button className="mt-4 w-full" size="lg" variant="dark" icon={<Ticket size={18} />} onClick={() => setTicketId(active.id)}>
                نمایش بلیت فعال
              </Button>
            ) : (
              <Button className="mt-4 w-full" size="lg" icon={<Ticket size={18} />} onClick={() => setConfirm(true)} disabled={!gym.approved}>
                خرید بلیت امروز
              </Button>
            )}
            </>
            )}
            {myClasses.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {myClasses.map((c) => (
                  <button key={c.id} onClick={() => setTicketId(c.id)} className="flex w-full items-center gap-2 rounded-xl bg-brand-400/10 px-3 py-2 text-right text-xs">
                    <CalendarClock size={14} />
                    <span className="flex-1 truncate">{gym.classes?.find((k) => k.id === c.classId)?.title}</span>
                    <span className="text-ink-500">{c.slotAt && `${weekdayLabel(weekdayOf(new Date(c.slotAt)))} ${faTime(c.slotAt)}`}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <PaySheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="بلیت سانس آزاد"
        desc={`ورود به «${gym.name}» تا پایان امروز${now.offPeak ? ' — با تخفیف ساعت خلوت' : ''}.`}
        price={withOffer(now.price)}
        credit={sub?.credit}
        balance={bal}
        onPay={doCheckIn}
      >
        {offer && <div className="rounded-2xl bg-aqua-400/10 p-3 text-xs">تخفیف ویژه‌ی {gym.name} برای شما: {num(offer.pct!)}٪</div>}
      </PaySheet>
      <PaySheet
        open={!!book}
        onClose={() => setBook(undefined)}
        title={book ? `رزرو کلاس ${book.cls.title}` : ''}
        desc={book ? `${weekdayLabel(weekdayOf(book.at))} ${faDate(book.at.toISOString())} ساعت ${faTime(book.at.toISOString())} · مربی: ${book.cls.coachName}` : ''}
        price={book ? withOffer(classPrice(gym, book.cls)) : 0}
        credit={sub?.credit}
        balance={bal}
        onPay={doBook}
        disabled={book?.cls.audience === 'kids' && kidsOk.length === 0}
      >
        {book?.cls.audience === 'kids' &&
          (kidsOk.length ? (
            <Field label="برای کدام فرزند؟">
              <Select value={memberId || kidsOk[0].id} onChange={(e) => setMemberId(e.target.value)}>
                {kidsOk.map((m) => <option key={m.id} value={m.id}>{m.name} ({num(ageOf(m.birthYear))} ساله)</option>)}
              </Select>
            </Field>
          ) : (
            <div className="rounded-2xl bg-gold-300/15 p-3 text-xs leading-6">این کلاس برای کودکان {num(book.cls.ageMin ?? 0)} تا {num(book.cls.ageMax ?? 0)} سال است. ابتدا فرزندتان را در <Link to="/family" className="underline">خانواده</Link> اضافه کنید.</div>
          ))}
        {offer && <div className="rounded-2xl bg-aqua-400/10 p-3 text-xs">تخفیف ویژه‌ی {gym.name} برای شما: {num(offer.pct!)}٪</div>}
      </PaySheet>
      <TicketSheet ticket={ticket} gym={gym} onClose={() => setTicketId(undefined)} onShare={() => { setTicketId(undefined); setShare(true) }} />
      <Sheet open={rv.open} onClose={() => setRv({ ...rv, open: false })} title="نظر شما درباره‌ی باشگاه">
        <div className="min-w-0 space-y-4">
          <div className="flex justify-center gap-2" dir="ltr">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRv({ ...rv, stars: s })} aria-label={`${s} ستاره`}>
                <Star size={30} strokeWidth={1.5} className={s <= rv.stars ? 'fill-gold-300 text-gold-300' : 'text-ink-300'} />
              </button>
            ))}
          </div>
          <Textarea rows={3} value={rv.text} onChange={(e) => setRv({ ...rv, text: e.target.value })} placeholder="تجهیزات، تمیزی، رفتار پرسنل، شلوغی…" />
          <Button
            className="w-full"
            onClick={async () => {
              if (await runOk(() => reviewGym(gym.id, rv.stars, rv.text), 'ممنون از نظرت!')) setRv({ open: false, stars: 5, text: '' })
            }}
          >
            ثبت نظر
          </Button>
        </div>
      </Sheet>
      <CreatePostSheet open={share} onClose={() => setShare(false)} gymId={gym.id} initialText={`امروز در ${gym.name} تمرین کردم.`} />
    </div>
  )
}
