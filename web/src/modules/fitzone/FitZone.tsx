import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PenSquare } from 'lucide-react'
import { useDB } from '@/core/db'
import { num } from '@/core/format'
import { levelOf } from '@/core/services/engagement'
import { Avatar, Button, Card, Empty, PageHeader, Tabs } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { StoriesBar } from './Stories'
import { PostCard } from './PostCard'
import { CreatePostSheet } from './CreatePost'

export default function FitZone() {
  const me = useMe()!
  const posts = useDB((s) => s.posts)
  const users = useDB((s) => s.users)
  const [tab, setTab] = useState<'all' | 'following' | 'challenges' | 'saved'>('all')
  const [create, setCreate] = useState(false)

  const feed = useMemo(() => {
    if (tab === 'following') return posts.filter((p) => me.following.includes(p.authorId) || p.authorId === me.id)
    if (tab === 'challenges') return posts.filter((p) => p.challengeId)
    if (tab === 'saved') return posts.filter((p) => p.saves.includes(me.id))
    return posts
  }, [posts, tab, me])

  const leaders = useMemo(() => [...users].filter((u) => !u.roles.includes('admin')).sort((a, b) => b.xp - a.xp).slice(0, 5), [users])

  return (
    <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">
      <div className="min-w-0">
        <PageHeader title="فیت‌زون" subtitle="شبکه‌ی اجتماعی ورزشکاران کی‌فیت" actions={<Button size="sm" icon={<PenSquare size={16} />} onClick={() => setCreate(true)}>پست جدید</Button>} />
        <StoriesBar />
        <Tabs
          className="my-4"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all', label: 'همه' },
            { value: 'following', label: 'دنبال‌شده‌ها' },
            { value: 'challenges', label: 'چالش‌ها' },
            { value: 'saved', label: 'ذخیره‌شده' },
          ]}
        />
        <div className="space-y-4">
          {feed.length ? feed.map((p) => <PostCard key={p.id} post={p} />) : <Empty icon="" title="پستی برای نمایش نیست" desc="افراد بیشتری را دنبال کن یا اولین پستت را بگذار." />}
        </div>
      </div>
      <aside className="hidden lg:block">
        <Card className="sticky top-20">
          <div className="mb-3 font-semibold">برترین‌های هفته</div>
          <div className="space-y-3">
            {leaders.map((u, i) => (
              <Link to={`/u/${u.id}`} key={u.id} className="flex items-center gap-2">
                <span className="w-5 text-center text-sm font-semibold text-ink-400">{num(i + 1)}</span>
                <Avatar name={u.name} src={u.avatar} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.name}</div>
                  <div className="text-[11px] text-ink-400">{levelOf(u.xp).title} · {num(u.xp)} XP</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </aside>
      <CreatePostSheet open={create} onClose={() => setCreate(false)} />
    </div>
  )
}
