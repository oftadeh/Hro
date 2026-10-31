import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { Plus, Volume2, VolumeX, X } from 'lucide-react'
import { useDB } from '@/core/db'
import { timeAgo } from '@/core/format'
import { toneClass } from '@/core/config'
import { createStory, markStorySeen } from '@/core/services/fitzone'
import type { Story } from '@/core/types'
import { Avatar, Button, Sheet, Textarea } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { runOk } from '@/ui/toast'
import { MediaInput, TonePicker } from './Media'
import { ModeSwitch, type PostMode } from './CreatePost'

/** پیش‌نمایش کوچک یک استوری (عکس، فریم ویدیو یا کارت رنگی متن) */
function StoryThumb({ s }: { s: Story }) {
  if (s.image) return <img loading="lazy" decoding="async" src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
  if (s.video) return <video src={s.video} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
  return (
    <div className={clsx('absolute inset-0 flex items-center justify-center p-2 text-center text-[12px] font-bold leading-5', toneClass(s.bg ?? 'violet'))}>
      <span className="line-clamp-3">{s.text}</span>
    </div>
  )
}

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
      .map(([authorId, items]) => ({ authorId, items: [...items].reverse(), unseen: items.some((s) => !s.seenBy.includes(me.id)) }))
      .sort((a, b) => Number(b.unseen) - Number(a.unseen))
  }, [stories, me.id])

  return (
    <>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar" aria-label="استوری‌ها">
        <button onClick={() => setCreate(true)} className="relative h-[136px] w-[92px] shrink-0 overflow-hidden rounded-[22px] bg-white text-start shadow-card dark:bg-ink-850 dark:shadow-none">
          {me.avatar ? <img loading="lazy" decoding="async" src={me.avatar} alt="" className="h-[86px] w-full object-cover" /> : <div className="card-lilac h-[86px] w-full" />}
          <span className="absolute right-1/2 top-[70px] flex h-8 w-8 translate-x-1/2 items-center justify-center rounded-full bg-ink-950 text-white ring-4 ring-white dark:bg-white dark:text-ink-950 dark:ring-ink-850">
            <Plus size={17} />
          </span>
          <span className="absolute inset-x-0 bottom-2.5 text-center text-[12px] font-semibold">استوری تو</span>
        </button>
        {groups.map((g) => {
          const u = users[g.authorId]
          if (!u) return null
          const last = g.items[g.items.length - 1]
          return (
            <button key={g.authorId} onClick={() => setOpen(g.authorId)} className={clsx('relative h-[136px] w-[92px] shrink-0 overflow-hidden rounded-[22px] p-[2.5px]', g.unseen ? 'card-violet' : 'bg-ink-200 dark:bg-ink-700')}>
              <span className="relative block h-full w-full overflow-hidden rounded-[20px] bg-ink-900">
                <StoryThumb s={last} />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                <Avatar name={u.name} src={u.avatar} size={30} className="absolute right-2 top-2 ring-2 ring-white" />
                <span className="absolute inset-x-2 bottom-2 truncate text-start text-[12px] font-semibold text-white">{u.name.split(' ')[0]}</span>
              </span>
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
  const [muted, setMuted] = useState(true)
  const [videoPct, setVideoPct] = useState(0)
  const group = groups[gi]
  const story = group?.items[si]

  useEffect(() => {
    if (!story) {
      onClose()
      return
    }
    markStorySeen(story.id)
    setVideoPct(0)
    if (story.video) return // ویدیو با پایان پخش جلو می‌رود
    const t = setTimeout(next, story.image ? 5000 : 6000)
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
  const textOnly = !story.image && !story.video
  return createPortal(
    <div className="fixed inset-0 z-[950] flex items-center justify-center bg-black" role="dialog" aria-label={`استوری ${u?.name ?? ''}`}>
      <div className={clsx('relative h-full w-full max-w-md overflow-hidden sm:h-[90dvh] sm:rounded-[28px]', textOnly ? toneClass(story.bg ?? 'violet') : 'bg-ink-900')}>
        {story.image && <img loading="lazy" decoding="async" src={story.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        {story.video && (
          <video
            key={story.id}
            src={story.video}
            autoPlay
            playsInline
            muted={muted}
            onEnded={next}
            onTimeUpdate={(e) => setVideoPct(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-x-0 top-0 z-10 space-y-3 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex gap-1">
            {group.items.map((s, i) => (
              <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                {i < si && <div className="h-full w-full bg-white" />}
                {i === si &&
                  (story.video ? (
                    <div className="h-full bg-white" style={{ width: `${videoPct * 100}%` }} />
                  ) : (
                    <div key={`${gi}-${si}`} className="h-full animate-progress bg-white" style={{ animationDuration: story.image ? '5s' : '6s' }} />
                  ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-white">
            <Avatar name={u?.name ?? ''} src={u?.avatar} size={34} />
            <div className="flex-1 text-sm font-semibold">
              {u?.name} <span className="text-xs font-normal opacity-70">{timeAgo(story.createdAt)}</span>
            </div>
            {story.video && (
              <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'پخش صدا' : 'بی‌صدا'} className="relative z-20 p-1">
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}
            <button onClick={onClose} aria-label="بستن" className="relative z-20 p-1">
              <X />
            </button>
          </div>
        </div>
        {story.text && (
          <div className={clsx('absolute inset-x-0 flex justify-center p-6', textOnly ? 'inset-y-0 items-center' : 'bottom-10')}>
            <p className={clsx('text-center', textOnly ? 'text-[30px] font-extrabold leading-[1.5]' : 'rounded-2xl bg-black/45 px-4 py-3 text-[17px] font-semibold leading-8 text-white backdrop-blur')}>{story.text}</p>
          </div>
        )}
        <button className="absolute inset-y-0 right-0 w-1/3" onClick={prev} aria-label="قبلی" />
        <button className="absolute inset-y-0 left-0 w-2/3" onClick={next} aria-label="بعدی" />
      </div>
    </div>,
    document.body,
  )
}

function CreateStorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<PostMode>('image')
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState<string>()
  const [bg, setBg] = useState('pink')
  const [sending, setSending] = useState(false)
  const submit = async () => {
    setSending(true)
    const ok = await runOk(() => createStory({ text, image: mode === 'image' ? images[0] : undefined, video: mode === 'video' ? video : undefined, bg: mode === 'text' ? bg : undefined }), 'استوری منتشر شد')
    setSending(false)
    if (ok) {
      setText('')
      setImages([])
      setVideo(undefined)
      onClose()
    }
  }
  const ready = mode === 'text' ? !!text.trim() : mode === 'image' ? images.length > 0 : !!video
  return (
    <Sheet open={open} onClose={onClose} title="استوری جدید">
      <div className="space-y-4">
        <ModeSwitch value={mode} onChange={setMode} />
        {mode === 'text' ? (
          <>
            <div className={clsx('anim-item flex aspect-[4/5] max-h-80 w-full items-center rounded-[28px] p-6', toneClass(bg))}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={300} rows={4} placeholder="امروز چه کردی؟" className="w-full resize-none bg-transparent text-center text-[24px] font-extrabold leading-10 outline-none placeholder:text-current placeholder:opacity-50" />
            </div>
            <TonePicker value={bg} onChange={setBg} />
          </>
        ) : (
          <>
            <MediaInput kind={mode} images={images} video={video} onImages={setImages} onVideo={setVideo} maxImages={1} />
            <Textarea rows={2} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="متن روی استوری (اختیاری)" />
          </>
        )}
        <Button variant="dark" size="lg" className="w-full" disabled={!ready} loading={sending} onClick={submit}>
          انتشار استوری
        </Button>
      </div>
    </Sheet>
  )
}
