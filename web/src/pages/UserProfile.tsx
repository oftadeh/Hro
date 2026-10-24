import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Lock, MessageCircle } from 'lucide-react'
import { useDB } from '@/core/db'
import { num } from '@/core/format'
import { ACTIVITY, GOALS, bodyOf } from '@/core/profile'
import { toggleFollow } from '@/core/services/fitzone'
import { openThread } from '@/core/services/fityar'
import { Button, Card, Empty, PageHeader, SectionTitle } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { run } from '@/ui/toast'
import { PostCard } from '@/modules/fitzone/PostCard'
import { IntroVideoCard } from '@/modules/profile/IntroVideo'
import { Achievements, ProfileHero, StatRow, achievementsOf } from '@/modules/profile/parts'

/** پروفایل عمومی؛ اطلاعات سلامت و چرخه‌ی قاعدگی هرگز اینجا نمایش داده نمی‌شود */
export default function UserProfile() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const me = useMe()!
  const nav = useNavigate()
  const user = useDB((s) => s.users.find((u) => u.id === id))
  const posts = useDB((s) => s.posts)
  const users = useDB((s) => s.users)
  const checkins = useDB((s) => s.checkins.filter((c) => c.userId === id).length)
  const allCh = useDB((s) => s.challenges)
  const chs = allCh.filter((c) => c.participants.some((p) => p.userId === id))
  if (!user) return <Empty icon="" title="کاربر یافت نشد" />
  const self = user.id === me.id
  if (self && !params.get('preview')) return <Navigate to="/profile" replace />
  const following = me.following.includes(user.id)
  const followers = users.filter((u) => u.following.includes(user.id)).length
  const theirPosts = posts.filter((p) => p.authorId === user.id)
  const isCoach = user.roles.includes('coach')
  const isDoctor = user.roles.includes('doctor')
  const privacy = user.privacy ?? { publicProfile: true, showBody: false }
  const visible = privacy.publicProfile || following || self
  const wins = chs.filter((c) => (c.participants.find((p) => p.userId === user.id)?.score ?? 0) >= c.goal).length
  const ach = achievementsOf(user, { checkins, challenges: chs.length, wins, posts: theirPosts.length, followers }).filter((a) => a.done)
  const body = bodyOf(user)

  return (
    <div className="animate-fade-up">
      <PageHeader back title={self ? 'نمای عمومی پروفایل شما' : user.name} />
      <ProfileHero
        user={user}
        actions={
          self ? undefined : (
            <>
              <button onClick={() => toggleFollow(user.id)} className={`flex h-10 items-center rounded-full px-5 text-sm font-medium transition ${following ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white text-ink-950 hover:brightness-95'}`}>
                {following ? 'دنبال می‌کنی' : 'دنبال کردن'}
              </button>
              <button onClick={() => run(async () => nav(`/messages/${await openThread(user.id, isCoach ? 'coach' : isDoctor ? 'doctor' : 'direct')}`))} className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm transition hover:bg-white/15">
                <MessageCircle size={15} /> پیام
              </button>
              {isCoach && (
                <button onClick={() => nav(`/fityar/coach/${user.id}`)} className="flex h-10 items-center rounded-full card-violet px-4 text-sm font-medium text-ink-950">
                  پکیج‌های مربی
                </button>
              )}
              {isDoctor && (
                <button onClick={() => nav(`/doctors/${user.id}`)} className="flex h-10 items-center rounded-full grad-mint px-4 text-sm font-medium text-ink-950">
                  رزرو ویزیت
                </button>
              )}
            </>
          )
        }
      />
      <StatRow items={[['پست', theirPosts.length], ['دنبال‌کننده', followers], ['ورود به باشگاه', visible ? checkins : 0], ['امتیاز', user.xp]]} />
      {visible && <IntroVideoCard user={user} />}

      {!visible ? (
        <Card className="mt-6 flex flex-col items-center gap-2 py-10 text-center">
          <Lock size={22} className="text-ink-400" />
          <div className="text-sm font-medium">این پروفایل خصوصی است</div>
          <div className="text-xs text-ink-500">برای دیدن پست‌ها و فعالیت‌ها، {user.name.split(' ')[0]} را دنبال کنید.</div>
        </Card>
      ) : (
        <>
          {privacy.showBody && (user.goal || body.bmi) && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {(
                [
                  ['هدف', user.goal ? GOALS[user.goal] : '—'],
                  ['سطح فعالیت', user.activityLevel ? ACTIVITY[user.activityLevel] : '—'],
                  ['قد / وزن', user.heightCm && user.weightKg ? `${num(user.heightCm)} / ${num(user.weightKg)}` : '—'],
                ] as const
              ).map(([l, v]) => (
                <div key={l} className="rounded-3xl bg-white p-4 shadow-card dark:bg-ink-850 dark:shadow-none">
                  <div className="text-[12px] text-ink-400">{l}</div>
                  <div className="mt-1 text-sm font-medium tabular-nums">{v}</div>
                </div>
              ))}
            </div>
          )}
          {ach.length > 0 && (
            <>
              <SectionTitle title="نشان‌ها" />
              <Achievements list={ach} />
            </>
          )}
          <SectionTitle title="پست‌ها" />
          <div className="space-y-4">{theirPosts.length ? theirPosts.map((p) => <PostCard key={p.id} post={p} />) : <Empty icon="" title="هنوز پستی ندارد" />}</div>
        </>
      )}
      {self && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="sm" onClick={() => nav('/profile?tab=settings')}>
            تنظیمات حریم خصوصی
          </Button>
        </div>
      )}
    </div>
  )
}
