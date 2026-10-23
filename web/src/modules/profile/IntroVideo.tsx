/** ویدیوی معرفی پروفایل: مربیان، باشگاه‌داران، پزشکان، کاربران سطح ۴ به بالا و اشتراک‌های ویژه */
import { useRef, useState } from 'react'
import { Lock, Trash2, Upload, Video } from 'lucide-react'
import { useDB } from '@/core/db'
import { canHaveIntroVideo, setIntroVideo } from '@/core/services/auth'
import type { User } from '@/core/types'
import { uploadVideo } from '@/core/client/remote'
import { Button, Card } from '@/ui/kit'
import { run, runOk } from '@/ui/toast'

export function VideoPlayer({ src, className }: { src: string; className?: string }) {
  return <video src={src} controls playsInline preload="metadata" className={className ?? 'aspect-video w-full rounded-3xl bg-black object-contain'} />
}

export function IntroVideoCard({ user, self }: { user: User; self?: boolean }) {
  const subs = useDB((s) => s.subscriptions)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const eligible = canHaveIntroVideo(user, { subscriptions: subs })
  if (!self && !user.introVideo) return null
  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    const url = await run(() => uploadVideo(file))
    if (url) await runOk(() => setIntroVideo(url), 'ویدیوی معرفی ذخیره شد')
    setBusy(false)
  }
  return (
    <Card className="mt-3 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Video size={16} className="text-brand-500" /> ویدیوی معرفی
        {self && user.introVideo && (
          <button className="mr-auto text-ink-300 hover:text-coral-500" onClick={() => confirm('ویدیو حذف شود؟') && run(() => setIntroVideo(null))} aria-label="حذف ویدیو">
            <Trash2 size={15} />
          </button>
        )}
      </div>
      {user.introVideo ? (
        <VideoPlayer src={user.introVideo} />
      ) : eligible ? (
        <p className="text-xs leading-6 text-ink-500">یک ویدیوی کوتاه (حداکثر ۶۰ ثانیه) از خودت، سبک تمرین یا خدماتت بگذار تا دیگران بهتر با تو آشنا شوند.</p>
      ) : (
        <p className="flex items-start gap-1.5 text-xs leading-6 text-ink-500">
          <Lock size={13} className="mt-1 shrink-0" /> ویدیوی معرفی برای مربیان، باشگاه‌داران، کاربران سطح ۴ (جنگجو) به بالا و دارندگان اشتراک طلایی و الماس فعال است.
        </p>
      )}
      {self && eligible && (
        <>
          <input ref={input} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <Button size="sm" variant="secondary" className="mt-3" loading={busy} icon={<Upload size={14} />} onClick={() => input.current?.click()}>
            {user.introVideo ? 'جایگزینی ویدیو' : 'بارگذاری ویدیو'}
          </Button>
        </>
      )}
    </Card>
  )
}
