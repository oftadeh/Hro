import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useDB } from '@/core/db'
import { ROLE_META } from '@/core/config'
import { num } from '@/core/format'
import { levelOf } from '@/core/services/engagement'
import { toggleFollow } from '@/core/services/fitzone'
import { openThread } from '@/core/services/fityar'
import { Avatar, Badge, Button, Card, Empty, PageHeader, SectionTitle } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { run } from '@/ui/toast'
import { PostCard } from '@/modules/fitzone/PostCard'
import { RoleIcon } from '@/ui/icons'

export default function UserProfile() {
  const { id } = useParams()
  const me = useMe()!
  const nav = useNavigate()
  const user = useDB((s) => s.users.find((u) => u.id === id))
  const posts = useDB((s) => s.posts)
  const users = useDB((s) => s.users)
  if (!user) return <Empty icon="" title="کاربر یافت نشد" />
  if (user.id === me.id) return <Navigate to="/profile" replace />
  const lvl = levelOf(user.xp)
  const following = me.following.includes(user.id)
  const followers = users.filter((u) => u.following.includes(user.id)).length
  const theirPosts = posts.filter((p) => p.authorId === user.id)
  const isCoach = user.roles.includes('coach')
  const isDoctor = user.roles.includes('doctor')
  return (
    <div className="animate-fade-up">
      <PageHeader back title={user.name} />
      <Card className="text-center">
        <Avatar name={user.name} src={user.avatar} size={88} ring className="mx-auto" />
        <div className="mt-2 text-lg font-semibold">{user.name}</div>
        {user.bio && <p className="text-sm text-ink-500">{user.bio}</p>}
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          <Badge color="amber">{lvl.title}</Badge>
          <Badge color="rose">{num(user.streak)} روز</Badge>
          {user.roles.filter((r) => r !== 'user' && r !== 'admin').map((r) => <Badge key={r}><RoleIcon role={r} size={12} /> {ROLE_META[r].label}</Badge>)}
        </div>
        <div className="mt-3 flex justify-center gap-6 text-sm">
          <div><b>{num(theirPosts.length)}</b> پست</div>
          <div><b>{num(followers)}</b> دنبال‌کننده</div>
          <div><b>{num(user.xp)}</b> XP</div>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant={following ? 'outline' : 'primary'} onClick={() => toggleFollow(user.id)}>{following ? 'دنبال می‌کنی' : 'دنبال کردن'}</Button>
          <Button variant="secondary" icon={<MessageCircle size={16} />} onClick={() => run(() => nav(`/messages/${openThread(user.id, isCoach ? 'coach' : isDoctor ? 'doctor' : 'direct')}`))}>پیام</Button>
          {isCoach && <Button variant="dark" onClick={() => nav(`/fityar/coach/${user.id}`)}>پکیج‌های مربی</Button>}
          {isDoctor && <Button variant="dark" onClick={() => nav(`/doctors/${user.id}`)}>رزرو ویزیت</Button>}
        </div>
      </Card>
      <SectionTitle title="پست‌ها" />
      <div className="space-y-4">
        {theirPosts.length ? theirPosts.map((p) => <PostCard key={p.id} post={p} />) : <Empty icon="" title="هنوز پستی ندارد" />}
      </div>
    </div>
  )
}
