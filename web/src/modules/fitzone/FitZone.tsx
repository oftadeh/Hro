import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Film, Image as ImageIcon, Plus, Search, Type, X } from 'lucide-react'
import { searchPosts, visiblePosts } from '@/core/services/fitzone'
import { useDB } from '@/core/db'
import { num } from '@/core/format'
import { levelOf } from '@/core/services/engagement'
import { Avatar, Card, Empty, Input } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { StoriesBar } from './Stories'
import { PostCard } from './PostCard'
import { CreatePostSheet, type PostMode } from './CreatePost'

const TABS = [
  { value: 'all', label: 'برای تو' },
  { value: 'following', label: 'دنبال‌شده‌ها' },
  { value: 'challenges', label: 'چالش‌ها' },
  { value: 'saved', label: 'ذخیره‌شده' },
] as const
type Tab = (typeof TABS)[number]['value']

export default function FitZone() {
  const me = useMe()!
  const posts = useDB((s) => s.posts)
  const users = useDB((s) => s.users)
  const [tab, setTab] = useState<Tab>('all')
  const [create, setCreate] = useState<PostMode | null>(null)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [searching, setSearching] = useState(!!q)

  const feed = useMemo(() => {
    const base = searchPosts(visiblePosts(posts, me.blockedUsers), q)
    if (tab === 'following') return base.filter((p) => me.following.includes(p.authorId) || p.authorId === me.id)
    if (tab === 'challenges') return base.filter((p) => p.challengeId)
    if (tab === 'saved') return base.filter((p) => p.saves.includes(me.id))
    return base
  }, [posts, tab, me, q])
  const trending = useMemo(() => {
    const c: Record<string, number> = {}
    posts.forEach((p) => p.tags?.forEach((t) => (c[t] = (c[t] ?? 0) + 1)))
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [posts])

  const leaders = useMemo(() => [...users].filter((u) => !u.roles.includes('admin')).sort((a, b) => b.xp - a.xp).slice(0, 5), [users])

  return (
    <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">
      <div className="min-w-0 space-y-4">
        <header className="flex items-center gap-2 pt-1">
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-extrabold leading-tight">فیت‌زون</h1>
            <p className="text-[13px] text-ink-500">جامعه‌ی ورزشکاران کی‌فیت</p>
          </div>
          <button onClick={() => { setSearching((v) => !v); if (searching) setParams({}, { replace: true }) }} aria-label={searching ? 'بستن جستجو' : 'جستجو'} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card dark:bg-ink-850 dark:shadow-none">
            {searching ? <X size={19} /> : <Search size={19} />}
          </button>
          <button onClick={() => setCreate('text')} aria-label="پست جدید" className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-950 text-white dark:bg-white dark:text-ink-950">
            <Plus size={21} />
          </button>
        </header>

        {searching && (
          <div className="anim-item space-y-2">
            <div className="relative">
              <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400" />
              <Input autoFocus value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} placeholder="جستجو یا #هشتگ" className="pr-10" />
            </div>
            {trending.length > 0 && !q && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
                {trending.map(([t]) => (
                  <button key={t} onClick={() => setParams({ q: '#' + t })} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[13px] shadow-card dark:bg-ink-850 dark:shadow-none">
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <StoriesBar />

        {/* نوشتن سریع: متن، عکس یا ویدیو */}
        <Card className="rounded-[28px] p-3">
          <div className="flex items-center gap-3">
            <Avatar name={me.name} src={me.avatar} size={40} />
            <button onClick={() => setCreate('text')} className="h-11 min-w-0 flex-1 rounded-full bg-ink-50 px-4 text-start text-[14px] text-ink-500 dark:bg-ink-800">
              از تمرین امروزت بگو…
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { m: 'text' as const, label: 'متن', icon: Type, tone: 'card-violet' },
              { m: 'image' as const, label: 'عکس', icon: ImageIcon, tone: 'card-pink' },
              { m: 'video' as const, label: 'ویدیو', icon: Film, tone: 'card-mint' },
            ].map((x) => (
              <button key={x.m} onClick={() => setCreate(x.m)} className={clsx('flex h-11 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition active:scale-95', x.tone)}>
                <x.icon size={17} /> {x.label}
              </button>
            ))}
          </div>
        </Card>

        <div role="tablist" aria-label="فید" className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={clsx('h-10 shrink-0 rounded-full px-5 text-[14px] transition', tab === t.value ? 'bg-ink-950 font-semibold text-white dark:bg-white dark:text-ink-950' : 'bg-white text-ink-500 shadow-card dark:bg-ink-850 dark:shadow-none')}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {feed.length ? feed.map((p) => <PostCard key={p.id} post={p} />) : <Empty title="پستی برای نمایش نیست" desc="افراد بیشتری را دنبال کن یا اولین پستت را بگذار." />}
        </div>
      </div>
      <aside className="hidden lg:block">
        <Card className="sticky top-20 rounded-[28px]">
          <div className="mb-3 font-semibold">برترین‌های هفته</div>
          <div className="space-y-3">
            {leaders.map((u, i) => (
              <Link to={`/u/${u.id}`} key={u.id} className="flex items-center gap-2">
                <span className="w-5 text-center text-sm font-semibold text-ink-400">{num(i + 1)}</span>
                <Avatar name={u.name} src={u.avatar} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.name}</div>
                  <div className="text-[12px] text-ink-400">{levelOf(u.xp).title} · {num(u.xp)} XP</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </aside>
      <CreatePostSheet open={!!create} initialMode={create ?? 'text'} onClose={() => setCreate(null)} />
    </div>
  )
}
