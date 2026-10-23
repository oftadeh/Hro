import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Award, MessageCircle, PhoneCall } from 'lucide-react'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { bookCall, buyCoachPlan, openThread } from '@/core/services/fityar'
import { toggleFollow } from '@/core/services/fitzone'
import { PerkPrice } from '@/ui/PerkPrice'
import type { CoachPlan } from '@/core/types'
import { VideoPlayer } from '@/modules/profile/IntroVideo'
import { Avatar, Badge, Button, Card, Empty, Field, PageHeader, SectionTitle, Sheet, Stars, Textarea } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { run, runOk } from '@/ui/toast'
import { PostCard } from '@/modules/fitzone/PostCard'

const KIND = { workout: 'تمرینی', diet: 'تغذیه', both: 'تمرین + تغذیه' } as const

export default function CoachDetail() {
  const { id } = useParams()
  const me = useMe()!
  const nav = useNavigate()
  const coach = useDB((s) => s.coaches.find((c) => c.userId === id))
  const user = useDB((s) => s.users.find((u) => u.id === id))
  const posts = useDB((s) => s.posts)
  const bal = useBalance(me.id)
  const [plan, setPlan] = useState<CoachPlan>()
  const [answers, setAnswers] = useState('')
  const [call, setCall] = useState(false)

  if (!coach || !user) return <Empty icon="" title="مربی یافت نشد" />
  const following = me.following.includes(user.id)

  const openBuy = (p: CoachPlan) => {
    setAnswers(
      [me.gender && `جنسیت: ${me.gender === 'female' ? 'زن' : 'مرد'}`, me.heightCm && `قد: ${me.heightCm}`, me.weightKg && `وزن: ${me.weightKg}`, me.goal && `هدف: ${{ lose: 'کاهش وزن', gain: 'افزایش حجم', fit: 'تناسب اندام' }[me.goal]}`]
        .filter(Boolean)
        .join('، '),
    )
    setPlan(p)
  }

  return (
    <div className="animate-fade-up">
      <PageHeader back="/fityar?tab=coaches" title={user.name} subtitle={coach.title} />
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 bg-ink-950" />
        <div className="relative flex flex-col items-center pt-8 text-center">
          <Avatar name={user.name} src={user.avatar} size={96} className="border-4 border-white dark:border-ink-900" />
          <div className="mt-2 text-xl font-semibold">{user.name}</div>
          <div className="flex items-center gap-1 text-sm text-ink-500">
            {coach.title}
            {coach.verified && <Badge color="emerald">مدارک تأییدشده</Badge>}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <Stars value={coach.rating} />
            <span>{num(coach.students)} شاگرد</span>
            <span>{num(coach.experienceYears)} سال سابقه</span>
            {coach.online && <Badge color="emerald">آنلاین</Badge>}
          </div>
          <p className="mt-3 max-w-lg text-sm leading-7 text-ink-600 dark:text-ink-300">{coach.bio}</p>
          {user.introVideo && <VideoPlayer src={user.introVideo} className="mt-4 aspect-video w-full max-w-lg rounded-3xl bg-black object-contain" />}
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {coach.specialties.map((s) => <Badge key={s} color="sky">{s}</Badge>)}
          </div>
          <div className="mt-4 grid w-full max-w-md grid-cols-3 gap-2">
            <Button variant="secondary" icon={<MessageCircle size={16} />} onClick={() => run(async () => nav(`/messages/${await openThread(user.id, 'coach')}`))}>
              چت
            </Button>
            <Button variant="secondary" icon={<PhoneCall size={16} />} onClick={() => setCall(true)}>
              تماس
            </Button>
            <Button variant={following ? 'outline' : 'dark'} onClick={() => toggleFollow(user.id)}>
              {following ? 'دنبال می‌کنی' : 'دنبال کردن'}
            </Button>
          </div>
        </div>
      </Card>

      {coach.certificates.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {coach.certificates.map((c) => (
            <span key={c} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <Award size={13} /> {c}
            </span>
          ))}
        </div>
      )}

      <SectionTitle title="پکیج‌های برنامه" />
      <div className="grid gap-3 sm:grid-cols-2">
        {coach.plans.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <Badge color="violet" className="w-fit">{KIND[p.kind]}</Badge>
            <div className="mt-2 font-semibold">{p.title}</div>
            <p className="mt-1 flex-1 text-xs leading-6 text-ink-500">{p.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{toman(p.price)}</div>
                <div className="text-[11px] text-ink-400">{num(p.durationWeeks)} هفته</div>
              </div>
              <Button onClick={() => openBuy(p)}>خرید برنامه</Button>
            </div>
          </Card>
        ))}
        {!coach.plans.length && <Empty icon="" title="هنوز پکیجی تعریف نشده" />}
      </div>

      <SectionTitle title="پست‌ها" />
      <div className="space-y-4">
        {posts.filter((p) => p.authorId === user.id).map((p) => <PostCard key={p.id} post={p} />)}
      </div>

      <Sheet open={!!plan} onClose={() => setPlan(undefined)} title={plan?.title}>
        {plan && (
          <div className="space-y-3">
            <Field label="اطلاعات بدنی، سابقه‌ی ورزشی، آسیب‌ها و هدف‌تان" hint="هرچه کامل‌تر بنویسید، برنامه دقیق‌تر خواهد بود">
              <Textarea rows={5} value={answers} onChange={(e) => setAnswers(e.target.value)} />
            </Field>
            <div className="flex items-center justify-between rounded-2xl bg-ink-50 p-3 text-sm dark:bg-white/5">
              <span>مبلغ</span>
              <PerkPrice userId={me.id} module="fityar" amount={plan.price} />
            </div>
            <div className="text-xs text-ink-400">موجودی کیف پول: {toman(bal)}</div>
            <Button
              className="w-full"
              size="lg"
              onClick={async () => {
                const ok = await runOk(() => buyCoachPlan(user.id, plan.id, answers), 'برنامه خریداری شد؛ مربی به‌زودی آن را تحویل می‌دهد')
                if (ok) {
                  setPlan(undefined)
                  nav('/fityar?tab=plans')
                }
              }}
            >
              پرداخت از کیف پول
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={call} onClose={() => setCall(false)} title="رزرو تماس مشاوره">
        <p className="text-sm leading-7 text-ink-500">یک تماس صوتی/تصویری ۳۰ دقیقه‌ای با {user.name}. پس از رزرو، مربی از طریق پیام‌ها زمان دقیق را هماهنگ می‌کند.</p>
        <div className="my-4 flex items-center justify-between rounded-2xl bg-ink-50 p-3 text-sm dark:bg-white/5">
          <span>هزینه‌ی تماس</span>
          <PerkPrice userId={me.id} module="fityar" amount={coach.callPrice} />
        </div>
        <Button
          className="w-full"
          size="lg"
          icon={<PhoneCall size={18} />}
          onClick={async () => {
            const t = await run(() => bookCall(user.id), 'تماس رزرو شد')
            if (t) nav(`/messages/${t}`)
          }}
        >
          رزرو و پرداخت
        </Button>
      </Sheet>
    </div>
  )
}
