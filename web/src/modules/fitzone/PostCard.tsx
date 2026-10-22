import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Heart, MessageCircle, Send, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { num, timeAgo, toman } from '@/core/format'
import { addComment, deletePost, toggleLike, toggleSave } from '@/core/services/fitzone'
import type { Post } from '@/core/types'
import { ROLE_META } from '@/core/config'
import { Avatar, Badge, Card, Input } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { toast } from '@/ui/toast'

export function PostCard({ post }: { post: Post }) {
  const me = useMe()!
  const users = useUserMap()
  const challenge = useDB((s) => (post.challengeId ? s.challenges.find((c) => c.id === post.challengeId) : undefined))
  const gym = useDB((s) => (post.gymId ? s.gyms.find((g) => g.id === post.gymId) : undefined))
  const author = users[post.authorId]
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState('')
  const liked = post.likes.includes(me.id)
  const saved = post.saves.includes(me.id)
  const proRole = author?.roles.find((r) => r !== 'user' && r !== 'admin')

  if (!author) return null
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 p-4">
        <Link to={`/u/${author.id}`}>
          <Avatar name={author.name} src={author.avatar} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/u/${author.id}`} className="flex items-center gap-1.5 text-sm font-bold">
            {author.name}
            {proRole && <Badge color="sky">{ROLE_META[proRole].icon} {ROLE_META[proRole].label}</Badge>}
          </Link>
          <div className="text-[11px] text-ink-400">{timeAgo(post.createdAt)}</div>
        </div>
        {post.authorId === me.id && (
          <button onClick={() => deletePost(post.id)} className="rounded-xl p-2 text-ink-400 hover:text-rose-500" aria-label="حذف">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {post.image ? (
        <div onDoubleClick={() => !liked && toggleLike(post.id)}>
          <img src={post.image} alt="" className="max-h-[32rem] w-full object-cover" />
          {post.text && <p className="whitespace-pre-line px-4 pt-3 text-sm leading-7">{post.text}</p>}
        </div>
      ) : (
        <div onDoubleClick={() => !liked && toggleLike(post.id)} className={`mx-4 flex min-h-40 items-center justify-center rounded-[1.75rem] bg-gradient-to-br p-6 ${post.gradient}`}>
          <p className="whitespace-pre-line text-center text-[15px] font-bold leading-8 text-white drop-shadow">{post.text}</p>
        </div>
      )}

      {challenge && (
        <Link to={`/challenges/${challenge.id}`} className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
          <span className="text-2xl">{challenge.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{challenge.title}</div>
            <div className="text-[11px] text-ink-500">صندوق {toman(challenge.pool)} · {num(challenge.participants.length)} شرکت‌کننده</div>
          </div>
          <Badge color="amber">شرکت در چالش</Badge>
        </Link>
      )}
      {gym && (
        <Link to={`/fityab/${gym.id}`} className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-500/20 dark:bg-orange-500/10">
          <span className="text-2xl">🏋️</span>
          <div className="flex-1 text-sm font-bold">{gym.name}</div>
          <Badge color="rose">مشاهده در فیت‌یاب</Badge>
        </Link>
      )}

      <div className="flex items-center gap-1 px-2 py-2">
        <button onClick={() => toggleLike(post.id)} className={clsx('flex items-center gap-1 rounded-xl p-2 text-sm transition', liked ? 'text-rose-500' : 'text-ink-500')}>
          <Heart size={21} className={clsx(liked && 'animate-pop fill-rose-500')} /> {num(post.likes.length)}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 rounded-xl p-2 text-sm text-ink-500">
          <MessageCircle size={21} /> {num(post.comments.length)}
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(`${location.origin}/fitzone#${post.id}`)
            toast.info('لینک پست کپی شد')
          }}
          className="rounded-xl p-2 text-ink-500"
          aria-label="اشتراک"
        >
          <Send size={20} />
        </button>
        <div className="flex-1" />
        <button onClick={() => toggleSave(post.id)} className={clsx('rounded-xl p-2', saved ? 'text-amber-500' : 'text-ink-500')} aria-label="ذخیره">
          <Bookmark size={20} className={clsx(saved && 'fill-amber-400')} />
        </button>
      </div>

      {(showComments || post.comments.length > 0) && (
        <div className="space-y-2 px-4 pb-4">
          {(showComments ? post.comments : post.comments.slice(-1)).map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-bold">{users[c.authorId]?.name} </span>
              <span className="text-ink-600 dark:text-ink-300">{c.text}</span>
            </div>
          ))}
          {!showComments && post.comments.length > 1 && (
            <button onClick={() => setShowComments(true)} className="text-xs text-ink-400">
              مشاهده‌ی همه‌ی {num(post.comments.length)} نظر
            </button>
          )}
          {showComments && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addComment(post.id, comment)
                setComment('')
              }}
            >
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="نظرت رو بنویس…" className="!py-2" />
              <button className="rounded-2xl bg-brand-500 px-4 text-sm font-bold text-white">ارسال</button>
            </form>
          )}
        </div>
      )}
    </Card>
  )
}
