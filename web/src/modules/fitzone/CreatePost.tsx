import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Film, Image as ImageIcon, Type } from 'lucide-react'
import { useDB } from '@/core/db'
import { toneClass } from '@/core/config'
import { createPost } from '@/core/services/fitzone'
import { Button, Select, Sheet, Textarea, Field } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { runOk } from '@/ui/toast'
import { MediaInput, TonePicker } from './Media'

/** ایموجی‌های ورزشی پرکاربرد برای نوشتن سریع */
const EMOJIS = ['🔥', '💪', '🏃‍♀️', '🏃', '🏆', '🥇', '🚴', '🏊', '⚽', '🧘', '🏋️', '👏', '😅', '💦', '🎯', '❤️']

export type PostMode = 'text' | 'image' | 'video'

export const MODES: { id: PostMode; label: string; icon: typeof Type }[] = [
  { id: 'text', label: 'متن', icon: Type },
  { id: 'image', label: 'عکس', icon: ImageIcon },
  { id: 'video', label: 'ویدیو', icon: Film },
]

/** انتخاب نوع محتوا (متن، عکس، ویدیو) */
export function ModeSwitch({ value, onChange }: { value: PostMode; onChange: (m: PostMode) => void }) {
  return (
    <div className="flex rounded-full bg-ink-100 p-1 dark:bg-ink-800" role="tablist">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={value === m.id}
          onClick={() => onChange(m.id)}
          className={clsx('flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-[14px] transition', value === m.id ? 'bg-ink-950 font-semibold text-white dark:bg-white dark:text-ink-950' : 'text-ink-500')}
        >
          <m.icon size={16} /> {m.label}
        </button>
      ))}
    </div>
  )
}

export function CreatePostSheet({ open, onClose, challengeId, gymId, initialText = '', initialMode = 'text' }: { open: boolean; onClose: () => void; challengeId?: string; gymId?: string; initialText?: string; initialMode?: PostMode }) {
  const me = useMe()!
  const challenges = useDB((s) => s.challenges)
  const gyms = useDB((s) => s.gyms)
  const [mode, setMode] = useState<PostMode>(initialMode)
  const [text, setText] = useState(initialText)
  const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState<string>()
  const [bg, setBg] = useState('violet')
  const [ch, setCh] = useState(challengeId ?? '')
  const [gym, setGym] = useState(gymId ?? '')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      setText(initialText)
      setMode(initialMode)
      setCh(challengeId ?? '')
      setGym(gymId ?? '')
    }
  }, [open, initialText, initialMode, challengeId, gymId])

  // باشگاه‌های خود کاربر اول نمایش داده می‌شوند
  const gymOptions = gyms.filter((g) => g.approved).sort((a, b) => Number(b.ownerId === me.id) - Number(a.ownerId === me.id))

  const submit = async () => {
    setSending(true)
    const ok = await runOk(
      () =>
        createPost({
          text,
          images: mode === 'image' ? images : undefined,
          video: mode === 'video' ? video : undefined,
          bg: mode === 'text' ? bg : undefined,
          challengeId: ch || undefined,
          gymId: gym || undefined,
        }),
      'پست منتشر شد',
    )
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
    <Sheet open={open} onClose={onClose} title="پست جدید">
      <div className="space-y-4">
        <ModeSwitch value={mode} onChange={setMode} />

        {mode === 'text' ? (
          <div className={clsx('anim-item rounded-[28px] p-5 transition-colors', toneClass(bg))}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="از تمرین، رژیم یا دستاوردت بنویس…"
              className="w-full resize-none bg-transparent text-center text-[20px] font-bold leading-9 outline-none placeholder:text-current placeholder:opacity-50"
            />
          </div>
        ) : (
          <>
            <MediaInput kind={mode} images={images} video={video} onImages={setImages} onVideo={setVideo} />
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="توضیح (اختیاری)… می‌توانی #هشتگ هم بگذاری" />
          </>
        )}
        <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1" aria-label="افزودن ایموجی">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setText((t) => t + e)} className="press h-10 w-10 shrink-0 rounded-xl bg-ink-900/[.05] text-[20px] dark:bg-white/[.06]" aria-label={`افزودن ${e}`}>
              {e}
            </button>
          ))}
        </div>
        {mode === 'text' && <TonePicker value={bg} onChange={setBg} />}

        <details className="rounded-2xl bg-ink-50 px-4 py-3 dark:bg-ink-800/60">
          <summary className="cursor-pointer text-[14px] text-ink-500">برچسب باشگاه یا چالش (اختیاری)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="باشگاه">
              <Select value={gym} onChange={(e) => setGym(e.target.value)}>
                <option value="">بدون باشگاه</option>
                {gymOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                    {g.ownerId === me.id ? ' — باشگاه من' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="چالش">
              <Select value={ch} onChange={(e) => setCh(e.target.value)}>
                <option value="">بدون چالش</option>
                {challenges.filter((c) => c.status === 'active').map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </Select>
            </Field>
          </div>
        </details>

        <Button variant="dark" size="lg" className="w-full" disabled={!ready} loading={sending} onClick={submit}>
          انتشار
        </Button>
      </div>
    </Sheet>
  )
}
