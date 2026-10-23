import { AppError, mutate, currentUserId, db, svc } from '../store'
import { uid, now } from '../id'
import { GRADIENTS } from '../config'
import type { Post, Report } from '../types'
import { addXP, completeMission } from './engagement'
import { notify } from './ledger'

const pickGradient = () => GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)]

/** هشتگ‌های متن */
export const hashtags = (text: string) => [...new Set((text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.slice(1)))].slice(0, 10)

/** پست‌هایی که کاربر می‌بیند (پنهان‌شده‌ها و کاربران مسدود حذف می‌شوند) */
export function visiblePosts(posts: Post[], blocked: string[] = []) {
  return posts.filter((p) => !p.hidden && !blocked.includes(p.authorId))
}

export function searchPosts(posts: Post[], q: string) {
  const s = q.trim().replace(/^#/, '')
  if (!s) return posts
  return posts.filter((p) => p.text.includes(s) || p.tags?.some((t) => t.includes(s)))
}

const MAX_TEXT = 2000

export const createPost = svc('zone.post', (input: { text: string; image?: string; challengeId?: string; gymId?: string }) => {
  const me = currentUserId()
  const text = String(input.text ?? '').trim()
  if (!text && !input.image) throw new AppError('متن یا تصویر پست را وارد کنید')
  if (text.length > MAX_TEXT) throw new AppError('متن پست خیلی طولانی است')
  mutate((d) => {
    if (input.gymId && !d.gyms.some((g) => g.id === input.gymId && g.approved)) throw new AppError('باشگاه انتخاب‌شده فعال نیست')
    if (input.challengeId && !d.challenges.some((c) => c.id === input.challengeId)) throw new AppError('چالش یافت نشد')
    d.posts.unshift({ id: uid('post-'), authorId: me, text, image: input.image, gradient: pickGradient(), likes: [], saves: [], comments: [], challengeId: input.challengeId, gymId: input.gymId, tags: hashtags(text), createdAt: now() })
    addXP(d, me, 15)
  })
})

export const createStory = svc('zone.story', (input: { text: string; image?: string }) => {
  const me = currentUserId()
  const text = String(input.text ?? '').trim()
  if (!text && !input.image) throw new AppError('متن یا تصویر استوری را وارد کنید')
  mutate((d) => {
    d.stories.unshift({ id: uid('s-'), authorId: me, text: text.slice(0, 300), image: input.image, gradient: pickGradient(), seenBy: [], createdAt: now() })
    addXP(d, me, 10)
  })
})

export const toggleLike = svc('zone.like', (postId: string) => {
  const me = currentUserId()
  mutate((d) => {
    const p = d.posts.find((x) => x.id === postId)
    if (!p) return
    if (p.likes.includes(me)) p.likes = p.likes.filter((x) => x !== me)
    else {
      p.likes.push(me)
      completeMission(d, me, 'social')
      if (p.authorId !== me) {
        const u = d.users.find((x) => x.id === me)!
        notify(d, p.authorId, 'لایک جدید', `${u.name} پست شما را پسندید.`, '', '/fitzone')
      }
    }
  })
})

export const toggleSave = svc('zone.save', (postId: string) => {
  const me = currentUserId()
  mutate((d) => {
    const p = d.posts.find((x) => x.id === postId)
    if (!p) return
    p.saves = p.saves.includes(me) ? p.saves.filter((x) => x !== me) : [...p.saves, me]
  })
})

export const addComment = svc('zone.comment', (postId: string, text: string) => {
  const me = currentUserId()
  const body = String(text ?? '').trim()
  if (!body) return
  if (body.length > 600) throw new AppError('نظر خیلی طولانی است')
  mutate((d) => {
    const p = d.posts.find((x) => x.id === postId)
    if (!p || p.hidden) throw new AppError('پست یافت نشد')
    if (d.users.find((u) => u.id === p.authorId)?.blockedUsers?.includes(me)) throw new AppError('امکان نظر دادن روی این پست وجود ندارد')
    p.comments.push({ id: uid('c-'), authorId: me, text: body, at: now() })
    if (p.authorId !== me) notify(d, p.authorId, 'نظر جدید', body.slice(0, 60), '', '/fitzone')
  })
})

export const deleteComment = svc('zone.deleteComment', (postId: string, commentId: string) => {
  const me = currentUserId()
  const isAdmin = db().users.find((u) => u.id === me)?.roles.includes('admin')
  mutate((d) => {
    const p = d.posts.find((x) => x.id === postId)
    const c = p?.comments.find((x) => x.id === commentId)
    if (!p || !c) throw new AppError('نظر یافت نشد')
    if (c.authorId !== me && p.authorId !== me && !isAdmin) throw new AppError('دسترسی ندارید')
    p.comments = p.comments.filter((x) => x.id !== commentId)
  })
})

export const markStorySeen = svc('zone.seen', (storyId: string) => {
  const me = currentUserId()
  mutate((d) => {
    const s = d.stories.find((x) => x.id === storyId)
    if (s && !s.seenBy.includes(me)) s.seenBy.push(me)
  })
})

export const toggleFollow = svc('zone.follow', (userId: string) => {
  const me = currentUserId()
  if (userId === me) throw new AppError('نمی‌توانید خودتان را دنبال کنید')
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    if (!d.users.some((x) => x.id === userId)) throw new AppError('کاربر یافت نشد')
    const was = u.following.includes(userId)
    u.following = was ? u.following.filter((x) => x !== userId) : [...u.following, userId]
    if (!was) notify(d, userId, 'دنبال‌کننده‌ی جدید', `${u.name} شما را دنبال کرد.`, '', `/u/${me}`)
  })
})

export const deletePost = svc('zone.deletePost', (postId: string) => {
  const me = currentUserId()
  const isAdmin = db().users.find((u) => u.id === me)?.roles.includes('admin')
  mutate((d) => {
    const p = d.posts.find((x) => x.id === postId)
    if (!p) return
    if (p.authorId !== me && !isAdmin) throw new AppError('فقط نویسنده یا مدیر می‌تواند پست را حذف کند')
    d.posts = d.posts.filter((x) => x.id !== postId)
  })
})

/** گزارش تخلف */
export const reportContent = svc('zone.report', (kind: Report['kind'], refId: string, reason: string, parentId?: string) => {
  const me = currentUserId()
  if (!['post', 'comment', 'user', 'story', 'listing'].includes(kind)) throw new AppError('نوع گزارش معتبر نیست')
  if (String(reason ?? '').trim().length < 3) throw new AppError('دلیل گزارش را بنویسید')
  if (db().reports.some((r) => r.reporterId === me && r.refId === refId && r.status === 'open')) throw new AppError('این مورد را قبلاً گزارش داده‌اید')
  mutate((d) => {
    d.reports.unshift({ id: uid('rp-'), reporterId: me, kind, refId, parentId, reason: reason.slice(0, 300), status: 'open', createdAt: now() })
    // پستی که ۳ گزارش باز داشته باشد تا بررسی مدیر پنهان می‌شود
    if (kind === 'post') {
      const open = d.reports.filter((r) => r.kind === 'post' && r.refId === refId && r.status === 'open').length
      const p = d.posts.find((x) => x.id === refId)
      if (p && open >= 3) p.hidden = true
    }
    d.users.filter((u) => u.roles.includes('admin')).forEach((a) => notify(d, a.id, 'گزارش تخلف جدید', reason.slice(0, 60), '', '/panel/admin/moderation'))
  })
})

/** مسدود کردن کاربر: پست‌ها و پیام‌هایش دیگر دیده نمی‌شود */
export const toggleBlock = svc('zone.block', (userId: string) => {
  const me = currentUserId()
  if (userId === me) throw new AppError('نمی‌توانید خودتان را مسدود کنید')
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    const b = u.blockedUsers ?? []
    const blocking = !b.includes(userId)
    u.blockedUsers = blocking ? [...b, userId] : b.filter((x) => x !== userId)
    if (blocking) u.following = u.following.filter((x) => x !== userId)
  })
})
