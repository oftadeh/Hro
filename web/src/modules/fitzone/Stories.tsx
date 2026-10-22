import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X } from 'lucide-react'
import { useDB } from '@/core/db'
import { timeAgo } from '@/core/format'
import { createStory, markStorySeen } from '@/core/services/fitzone'
import type { Story } from '@/core/types'
import { Avatar, Button, Orbs, ImagePicker, Sheet, Textarea } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

export function StoriesBar() {
  const me = useMe()!
  const stories = useDB((s) => s.stories)
  const users = useUserMap()
  const [open, setOpen] = useState<string | null>(null)
  const [create, setCreate] = useState(false)

  // گروه‌بندی استوری‌ها بر اساس نویسنده (۲۴ ساعت اخیر)
  const groups = useMemo(() => {
    const fresh = stories.filter((s) => Date.now() - new Date(s.createdAt).getTime() < 86_400_000)
    const map = new Map<string, Story[]>()
    fresh.forEach((s) => map.set(s.authorId, [...(map.get(s.authorId) ?? []), s]))
    return [...map.entries()]
      .map(([authorId, items]) => ({ authorId, items: items.reverse(), unseen: items.some((s) => !s.seenBy.includes(me.id)) }))
      .sort((a, b) => Number(b.unseen) - Number(a.unseen))
  }, [stories, me.id])

  return (
    <>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
        <button onClick={() => setCreate(true)} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <div className="relative">
            <Avatar name={me.name} src={me.avatar} size={58} />
            <span className="absolute -bottom-0.5 -left-0.5 rounded-full border-2 border-ink-50 bg-ink-950 p-0.5 text-white dark:border-ink-950 dark:bg-brand-300 dark:text-ink-950">
              <Plus size={12} />
            </span>
          </div>
          <span className="w-full truncate text-center text-[11px] text-ink-500">استوری تو</span>
        </button>
        {groups.map((g) => {
          const u = users[g.authorId]
          if (!u) return null
          return (
            <button key={g.authorId} onClick={() => setOpen(g.authorId)} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <Avatar name={u.name} src={u.avatar} size={58} ring={g.unseen} className={g.unseen ? '' : 'opacity-60'} />
              <span className="w-full truncate text-center text-[11px]">{u.name.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>
      {open && <StoryViewer groups={groups} startAuthor={open} onClose={() => setOpen(null)} />}
      <CreateStorySheet open={create} onClose={() => setCreate(false)} />
    </>
  )
}

function StoryViewer({ groups, startAuthor, onClose }: { groups: { authorId: string; items: Story[] }[]; startAuthor: string; onClose: () => void }) {
  const users = useUserMap()
  const [gi, setGi] = useState(() => groups.findIndex((g) => g.authorId === startAuthor))
  const [si, setSi] = useState(0)
  const group = groups[gi]
  const story = group?.items[si]

  useEffect(() => {
    if (!story) return onClose()
    markStorySeen(story.id)
    const t = setTimeout(next, 5000)
    return () => clearTimeout(t)
  }, [gi, si]) // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    if (si < group.items.length - 1) setSi(si + 1)
    else if (gi < groups.length - 1) {
      setGi(gi + 1)
      setSi(0)
    } else onClose()
  }
  function prev() {
    if (si > 0) setSi(si - 1)
    else if (gi > 0) {
      setGi(gi - 1)
      setSi(0)
    }
  }
  if (!story) return null
  const u = users[group.authorId]
  return createPortal(
    <div className="fixed inset-0 z-[950] flex items-center justify-center bg-black">
      <div className={`relative h-full w-full max-w-md overflow-hidden bg-ink-850 sm:h-[90dvh] sm:rounded-2xl`}>
        <Orbs seed={story.id} />
        {story.image && <img src={story.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-x-0 top-0 z-10 space-y-3 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex gap-1">
            {group.items.map((s, i) => (
              <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                {i < si && <div className="h-full w-full bg-white" />}
                {i === si && <div key={`${gi}-${si}`} className="h-full animate-progress bg-white" />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-white">
            <Avatar name={u?.name ?? ''} src={u?.avatar} size={34} />
            <div className="flex-1 text-sm font-semibold">
              {u?.name} <span className="text-xs font-normal opacity-70">{timeAgo(story.createdAt)}</span>
            </div>
            <button onClick={onClose} aria-label="بستن">
              <X />
            </button>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-8">
          {story.text && <p className={`text-center font-display text-[2.3rem] leading-[1.3] text-white ${story.image ? 'rounded-2xl bg-black/40 p-4 text-lg' : ''}`}>{story.text}</p>}
        </div>
        <button className="absolute inset-y-0 right-0 w-1/3" onClick={prev} aria-label="قبلی" />
        <button className="absolute inset-y-0 left-0 w-2/3" onClick={next} aria-label="بعدی" />
      </div>
    </div>,
    document.body,
  )
}

function CreateStorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('')
  const [image, setImage] = useState<string>()
  const submit = async () => {
    const ok = await runOk(() => createStory({ text, image }), 'استوری منتشر شد')
    if (ok) {
      setText('')
      setImage(undefined)
      onClose()
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title="استوری جدید">
      <div className="space-y-3">
        <ImagePicker value={image} onChange={setImage} />
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="امروز چه کردی؟" />
        <Button className="w-full" onClick={submit}>
          انتشار استوری
        </Button>
      </div>
    </Sheet>
  )
}
