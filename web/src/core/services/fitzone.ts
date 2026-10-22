import { AppError, mutate, currentUserId } from '../db'
import { uid, now } from '../id'
import { GRADIENTS } from '../config'
import { addXP, completeMission } from './engagement'
import { notify } from './ledger'

const pick = () => GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)]

export function createPost(input: { text: string; image?: string; challengeId?: string; gymId?: string }) {
  const me = currentUserId()
  if (!input.text.trim() && !input.image) throw new AppError('متن یا تصویر پست را وارد کنید')
  mutate((d) => {
    d.posts.unshift({ id: uid('post-'), authorId: me, text: input.text.trim(), image: input.image, gradient: pick(), likes: [], saves: [], comments: [], challengeId: input.challengeId, gymId: input.gymId, createdAt: now() })
    addXP(d, me, 15)
  })
}

export function createStory(input: { text: string; image?: string }) {
  const me = currentUserId()
  if (!input.text.trim() && !input.image) throw new AppError('متن یا تصویر استوری را وارد کنید')
  mutate((d) => {
    d.stories.unshift({ id: uid('s-'), authorId: me, text: input.text.trim(), image: input.image, gradient: pick(), seenBy: [], createdAt: now() })
    addXP(d, me, 10)
  })
}

export function toggleLike(postId: string) {
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
        notify(d, p.authorId, 'لایک جدید ❤️', `${u.name} پست شما را پسندید.`, '❤️', '/fitzone')
      }
    }
  })
}

export function toggleSave(postId: string) {
  const me = currentUserId()
  mutate((d) => {
    const p = d.posts.find((x) => x.id === postId)
    if (!p) return
    p.saves = p.saves.includes(me) ? p.saves.filter((x) => x !== me) : [...p.saves, me]
  })
}

export function addComment(postId: string, text: string) {
  const me = currentUserId()
  if (!text.trim()) return
  mutate((d) => {
    const p = d.posts.find((x) => x.id === postId)
    if (!p) return
    p.comments.push({ id: uid('c-'), authorId: me, text: text.trim(), at: now() })
    if (p.authorId !== me) notify(d, p.authorId, 'نظر جدید 💬', text.slice(0, 60), '💬', '/fitzone')
  })
}

export function markStorySeen(storyId: string) {
  const me = currentUserId()
  mutate((d) => {
    const s = d.stories.find((x) => x.id === storyId)
    if (s && !s.seenBy.includes(me)) s.seenBy.push(me)
  })
}

export function toggleFollow(userId: string) {
  const me = currentUserId()
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    u.following = u.following.includes(userId) ? u.following.filter((x) => x !== userId) : [...u.following, userId]
  })
}

export function deletePost(postId: string) {
  mutate((d) => {
    d.posts = d.posts.filter((p) => p.id !== postId)
  })
}
