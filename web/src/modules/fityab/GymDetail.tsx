import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, MapPin, Navigation, Phone, Share2, Ticket } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useDB } from '@/core/db'
import { faDateTime, toman } from '@/core/format'
import { checkIn, rateGym } from '@/core/services/fityab'
import { activeSubscription } from '@/core/services/wallet'
import type { CheckIn } from '@/core/types'
import { Badge, Button, Card, Cover, Empty, PageHeader, SectionTitle, Sheet, Stars } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { run, toast } from '@/ui/toast'
import { GymMap } from './GymMap'
import { GENDER_LABEL } from './GymCard'
import { directionsUrl, neshanUrl, wazeUrl } from './nav'
import { PostCard } from '@/modules/fitzone/PostCard'
import { CreatePostSheet } from '@/modules/fitzone/CreatePost'

export default function GymDetail() {
  const { id } = useParams()
  const me = useMe()!
  const gym = useDB((s) => s.gyms.find((g) => g.id === id))
  const checkins = useDB((s) => s.checkins)
  const posts = useDB((s) => s.posts)
  useDB((s) => s.subscriptions)
  const bal = useBalance(me.id)
  const sub = activeSubscription(me.id)
  const [confirm, setConfirm] = useState(false)
  const [ticket, setTicket] = useState<CheckIn>()
  const [media, setMedia] = useState(0)
  const [share, setShare] = useState(false)

  if (!gym) return <Empty icon="" title="باشگاه یافت نشد" />
  const active = checkins.find((c) => c.gymId === gym.id && c.userId === me.id && c.status === 'active')
  const canSub = !!sub && sub.credit >= gym.sessionPrice
  const gymPosts = posts.filter((p) => p.gymId === gym.id)
  const current = gym.media[media]

  const doCheckIn = async (prefer: 'subscription' | 'wallet') => {
    const ci = await run(() => checkIn(gym.id, prefer))
    if (ci) {
      setConfirm(false)
      setTicket(ci)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        back="/fityab"
        title={gym.name}
        subtitle={gym.tagline}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<Share2 size={15} />}
            onClick={() => {
              navigator.clipboard?.writeText(location.href)
              toast.info('لینک باشگاه کپی شد')
            }}
          />
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
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Stars value={gym.rating} count={gym.reviews} />
              <Badge color="violet">{GENDER_LABEL[gym.gender]}</Badge>
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
            <div className="text-xs text-ink-500">هزینه‌ی هر سانس</div>
            <div className="text-2xl font-semibold">{toman(gym.sessionPrice)}</div>
            <div className="mt-3 rounded-2xl bg-ink-50 p-3 text-xs leading-6 text-ink-600 dark:bg-white/5 dark:text-ink-300">
              بدون ثبت‌نام و پرداخت در باشگاه
              <br />کد ورود را در پذیرش نشان دهید
              <br />پرداخت از {sub ? 'اعتبار اشتراک' : 'کیف پول'}
            </div>
            {active ? (
              <Button className="mt-4 w-full" size="lg" variant="dark" icon={<Ticket size={18} />} onClick={() => setTicket(active)}>
                نمایش کد ورود فعال
              </Button>
            ) : (
              <Button className="mt-4 w-full" size="lg" icon={<Ticket size={18} />} onClick={() => setConfirm(true)} disabled={!gym.approved}>
                ورود به باشگاه
              </Button>
            )}
            <div className="mt-4 flex items-center justify-center gap-1">
              <span className="text-xs text-ink-400">امتیاز شما:</span>
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => run(() => rateGym(gym.id, s), 'ممنون از امتیازت')} className="text-lg grayscale hover:grayscale-0"></button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="ورود به باشگاه">
        <div className="space-y-3">
          <p className="text-sm text-ink-500">مبلغ {toman(gym.sessionPrice)} برای ورود به «{gym.name}» کسر می‌شود.</p>
          <Button className="w-full" size="lg" disabled={!canSub} onClick={() => doCheckIn('subscription')}>
            پرداخت از اشتراک {sub ? `(اعتبار: ${toman(sub.credit)})` : '(اشتراک ندارید)'}
          </Button>
          <Button className="w-full" size="lg" variant="outline" disabled={bal < gym.sessionPrice} onClick={() => doCheckIn('wallet')}>
            پرداخت از کیف پول (موجودی: {toman(bal)})
          </Button>
          {!canSub && bal < gym.sessionPrice && (
            <Link to="/wallet">
              <Button variant="secondary" className="mt-1 w-full">شارژ کیف پول / خرید اشتراک</Button>
            </Link>
          )}
        </div>
      </Sheet>

      <Sheet open={!!ticket} onClose={() => setTicket(undefined)} title="بلیت ورود شما">
        {ticket && (
          <div className="text-center">
            <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-soft">
              <QRCodeSVG value={`KEYFIT:${ticket.id}:${ticket.code}`} size={180} />
            </div>
            <div className="mt-4 text-xs text-ink-500">کد ورود</div>
            <div className="text-4xl font-semibold tracking-[.3em]" dir="ltr">{ticket.code}</div>
            <p className="mt-3 text-sm text-ink-500">این کد یا QR را در پذیرش «{gym.name}» نشان دهید.</p>
            <p className="text-xs text-ink-400">{faDateTime(ticket.createdAt)}</p>
            <a href={directionsUrl(gym.lat, gym.lng)} target="_blank" rel="noreferrer">
              <Button className="mt-4 w-full" icon={<Navigation size={16} />}>مسیریابی تا باشگاه</Button>
            </a>
            <Button variant="outline" className="mt-2 w-full" onClick={() => { setTicket(undefined); setShare(true) }}>اشتراک در فیت‌زون</Button>
          </div>
        )}
      </Sheet>
      <CreatePostSheet open={share} onClose={() => setShare(false)} gymId={gym.id} initialText={`امروز در ${gym.name} تمرین کردم.`} />
    </div>
  )
}
