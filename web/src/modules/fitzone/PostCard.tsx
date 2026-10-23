import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Ban, Bookmark, Flag, Heart, MessageCircle, MoreHorizontal, Send, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { num, timeAgo, toman } from '@/core/format'
import { addComment, deleteComment, deletePost, reportContent, toggleBlock, toggleLike, toggleSave } from '@/core/services/fitzone'
import { hasBadge } from '@/core/services/perks'
import type { Post } from '@/core/types'
import { ROLE_META } from '@/core/config'
import { Avatar, Button, Card, Sheet, Textarea } from '@/ui/kit'
import { MetricIcon } from '@/ui/icons'
import { useMe, useUserMap } from '@/ui/hooks'
import { run, runOk, toast } from '@/ui/toast'

const action = 'flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] tabular-nums transition'

export function PostCard({ post }: { post: Post }) {
  const me = useMe()!
  const users = useUserMap()
  const subs = useDB((s) => s.subscriptions)
  const challenge = useDB((s) => (post.challengeId ? s.challenges.find((c) => c.id === post.challengeId) : undefined))
  const gym = useDB((s) => (post.gymId ? s.gyms.find((g) => g.id === post.gymId) : undefined))
  const author = users[post.authorId]
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState('')
  const liked = post.likes.includes(me.id)
  const saved = post.saves.includes(me.id)
  const proRole = author?.roles.find((r) => r !== 'user' && r !== 'admin')
  const [menu, setMenu] = useState(false)
  const [report, setReport] = useState<{ kind: 'post' | 'comment' | 'user'; refId: string } | null>(null)
  const [reason, setReason] = useState('')
  const isAdmin = me.roles.includes('admin')

  if (!author) return null
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 px-4 pt-4">
        <Link to={`/u/${author.id}`}>
          <Avatar name={author.name} src={author.avatar} size={36} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link to={`/u/${author.id}`} className="flex items-center gap-1 text-[13.5px] font-medium">
            {author.name}
            {hasBadge(author.id, { subscriptions: subs }) && <BadgeCheck size={14} strokeWidth={1.75} className="text-brand-500 dark:text-brand-300" aria-label="عضو ویژه" />}
          </Link>
          <div className="mt-0.5 text-[11px] text-ink-400">
            {proRole && <span>{ROLE_META[proRole].label} · </span>}
            {timeAgo(post.createdAt)}
          </div>
        </div>
        <button onClick={() => setMenu(true)} className="rounded-full p-2 text-ink-400 transition hover:text-ink-900 dark:hover:text-white" aria-label="گزینه‌ها">
          <MoreHorizontal size={17} strokeWidth={1.5} />
        </button>
      </div>

      {post.text && (
        <p className="whitespace-pre-line px-4 pt-3 text-[14.5px] leading-7 text-ink-800 dark:text-ink-100">
          {post.text.split(/(#[\p{L}\p{N}_]+)/u).map((part, i) =>
            part.startsWith('#') ? (
              <Link key={i} to={`/fitzone?q=${encodeURIComponent(part)}`} className="text-brand-600 dark:text-brand-300">
                {part}
              </Link>
            ) : (
              part
            ),
          )}
        </p>
      )}
      {post.image && (
        <div className="mt-3" onDoubleClick={() => !liked && toggleLike(post.id)}>
          <img src={post.image} alt="" className="max-h-[34rem] w-full object-cover" />
        </div>
      )}

      {(challenge || gym) && (
        <div className="mx-4 mt-3 space-y-2">
          {challenge && (
            <Link to={`/challenges/${challenge.id}`} className="flex items-center gap-3 rounded-xl border hairline p-3 transition hover:border-ink-300 dark:hover:border-white/15">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-950 text-brand-300"><MetricIcon metric={challenge.metric} size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{challenge.title}</div>
                <div className="text-[11px] tabular-nums text-ink-400">صندوق {toman(challenge.pool)} · {num(challenge.participants.length)} شرکت‌کننده</div>
              </div>
              <span className="text-[11px] text-ink-500">مشاهده</span>
            </Link>
          )}
          {gym && (
            <Link to={`/fityab/${gym.id}`} className="flex items-center gap-3 rounded-xl border hairline p-3 transition hover:border-ink-300 dark:hover:border-white/15">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900/[.05] text-[11px] font-medium dark:bg-white/[.06]">{gym.name.replace('باشگاه ', '')[0]}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{gym.name}</div>
                <div className="truncate text-[11px] text-ink-400">{gym.address}</div>
              </div>
              <span className="text-[11px] text-ink-500">فیت‌یاب</span>
            </Link>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1 px-2.5 pb-1">
        <button onClick={() => run(() => toggleLike(post.id))} className={clsx(action, liked ? 'text-coral-600' : 'text-ink-500 hover:text-ink-950 dark:hover:text-white')}>
          <Heart size={18} strokeWidth={1.5} className={clsx(liked && 'fill-coral-600')} /> {num(post.likes.length)}
        </button>
        <button onClick={() => setShowComments(!showComments)} className={clsx(action, 'text-ink-500 hover:text-ink-950 dark:hover:text-white')}>
          <MessageCircle size={18} strokeWidth={1.5} /> {num(post.comments.length)}
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(`${location.origin}/fitzone#${post.id}`)
            toast.info('پیوند پست کپی شد')
          }}
          className={clsx(action, 'text-ink-500 hover:text-ink-950 dark:hover:text-white')}
          aria-label="اشتراک"
        >
          <Send size={17} strokeWidth={1.5} />
        </button>
        <div className="flex-1" />
        <button onClick={() => run(() => toggleSave(post.id))} className={clsx(action, saved ? 'text-ink-950 dark:text-brand-300' : 'text-ink-500')} aria-label="ذخیره">
          <Bookmark size={18} strokeWidth={1.5} className={clsx(saved && 'fill-current')} />
        </button>
      </div>

      {(showComments || post.comments.length > 0) && (
        <div className="space-y-2 border-t hairline px-4 py-3">
          {(showComments ? post.comments : post.comments.slice(-1)).map((c) => (
            <div key={c.id} className="text-[13px] leading-6">
              <span className="font-medium">{users[c.authorId]?.name} </span>
              <span className="text-ink-600 dark:text-ink-300">{c.text}</span>
              {showComments && (
                <span className="mr-2 inline-flex gap-1 align-middle">
                  {(c.authorId === me.id || post.authorId === me.id || isAdmin) && (
                    <button onClick={() => run(() => deleteComment(post.id, c.id))} className="text-ink-300 hover:text-coral-500" aria-label="حذف نظر"><Trash2 size={12} /></button>
                  )}
                  {c.authorId !== me.id && (
                    <button onClick={() => setReport({ kind: 'comment', refId: c.id })} className="text-ink-300 hover:text-coral-500" aria-label="گزارش نظر"><Flag size={12} /></button>
                  )}
                </span>
              )}
            </div>
          ))}
          {!showComments && post.comments.length > 1 && (
            <button onClick={() => setShowComments(true)} className="text-xs text-ink-400">
              مشاهده‌ی {num(post.comments.length)} نظر
            </button>
          )}
          {showComments && (
            <form
              className="flex gap-2 pt-1"
              onSubmit={(e) => {
                e.preventDefault()
                run(() => addComment(post.id, comment))
                setComment('')
              }}
            >
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="نوشتن نظر…" className="min-w-0 flex-1 rounded-full border hairline bg-transparent px-4 py-2 text-[13px] outline-none focus:border-ink-900 dark:focus:border-brand-300/60" />
              <button className="rounded-full px-3 text-[13px] font-medium text-ink-950 dark:text-brand-300">ارسال</button>
            </form>
          )}
        </div>
      )}
      <Sheet open={menu} onClose={() => setMenu(false)} title="گزینه‌های پست">
        <div className="space-y-2">
          {(post.authorId === me.id || isAdmin) && (
            <Button variant="ghost" className="w-full justify-start text-coral-500" icon={<Trash2 size={16} />} onClick={async () => { if (await runOk(() => deletePost(post.id), 'پست حذف شد')) setMenu(false) }}>
              حذف پست
            </Button>
          )}
          {post.authorId !== me.id && (
            <>
              <Button variant="ghost" className="w-full justify-start" icon={<Flag size={16} />} onClick={() => { setMenu(false); setReport({ kind: 'post', refId: post.id }) }}>
                گزارش تخلف
              </Button>
              <Button variant="ghost" className="w-full justify-start" icon={<Ban size={16} />} onClick={async () => { if (await runOk(() => toggleBlock(post.authorId), `${author.name} مسدود شد؛ پست‌ها و پیام‌هایش را نمی‌بینید`)) setMenu(false) }}>
                مسدود کردن {author.name}
              </Button>
            </>
          )}
        </div>
      </Sheet>
      <Sheet open={!!report} onClose={() => setReport(null)} title="گزارش تخلف">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {['محتوای نامناسب', 'توهین یا آزار', 'اسپم یا تبلیغ', 'اطلاعات نادرست سلامت'].map((r) => (
              <button key={r} onClick={() => setReason(r)} className={clsx('rounded-full px-3 py-1.5 text-xs', reason === r ? 'grad-lavender text-ink-950' : 'bg-ink-900/[.05] dark:bg-white/[.06]')}>
                {r}
              </button>
            ))}
          </div>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="توضیح (اختیاری)" />
          <Button
            className="w-full"
            onClick={async () => {
              if (report && (await runOk(() => reportContent(report.kind, report.refId, reason, report.kind === 'comment' ? post.id : undefined), 'گزارش ثبت شد و بررسی می‌شود'))) {
                setReport(null)
                setReason('')
              }
            }}
          >
            ارسال گزارش
          </Button>
        </div>
      </Sheet>
    </Card>
  )
}
