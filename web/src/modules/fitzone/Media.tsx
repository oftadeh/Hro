import { useRef, useState } from 'react'
import clsx from 'clsx'
import { Film, ImagePlus, X } from 'lucide-react'
import { uploadImage, uploadVideo } from '@/core/client/remote'
import { CARD_TONES, toneClass } from '@/core/config'
import { resizeImage } from '@/ui/kit'
import { toast } from '@/ui/toast'

/** نمایش رسانه‌ی پست: ویدیو، یک عکس یا گالری قابل ورق زدن */
export function MediaGallery({ images, video, onDoubleTap, className }: { images: string[]; video?: string; onDoubleTap?: () => void; className?: string }) {
  const [idx, setIdx] = useState(0)
  if (video)
    return (
      <div className={clsx('overflow-hidden rounded-[22px] bg-black', className)}>
        <video src={video} controls playsInline preload="metadata" className="max-h-[34rem] w-full" />
      </div>
    )
  if (!images.length) return null
  if (images.length === 1)
    return (
      <div className={clsx('overflow-hidden rounded-[22px]', className)} onDoubleClick={onDoubleTap}>
        <img src={images[0]} alt="" loading="lazy" className="max-h-[34rem] w-full object-cover" />
      </div>
    )
  return (
    <div className={clsx('relative overflow-hidden rounded-[22px]', className)} onDoubleClick={onDoubleTap}>
      <div
        className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
        onScroll={(e) => {
          const el = e.currentTarget
          setIdx(Math.round(Math.abs(el.scrollLeft) / el.clientWidth))
        }}
      >
        {images.map((src, i) => (
          <img key={src.slice(-40) + i} src={src} alt={`تصویر ${i + 1}`} loading="lazy" className="aspect-[4/5] w-full shrink-0 snap-center object-cover" />
        ))}
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] tabular-nums text-white backdrop-blur">
        {(idx + 1).toLocaleString('fa-IR')}/{images.length.toLocaleString('fa-IR')}
      </span>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <span key={i} className={clsx('h-1.5 rounded-full bg-white transition-all', i === idx ? 'w-5' : 'w-1.5 opacity-60')} />
        ))}
      </div>
    </div>
  )
}

/** انتخاب رنگ کارت برای پست/استوری متنی */
export function TonePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="رنگ کارت">
      {CARD_TONES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          aria-label={t}
          onClick={() => onChange(t)}
          className={clsx('h-9 w-9 rounded-full transition', toneClass(t), value === t ? 'scale-110 ring-2 ring-ink-950 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-ink-850' : 'opacity-80')}
        />
      ))}
    </div>
  )
}

/** بارگذاری عکس‌ها (چندتایی) یا یک ویدیو */
export function MediaInput({
  kind, images, video, onImages, onVideo, maxImages = 6,
}: { kind: 'image' | 'video'; images: string[]; video?: string; onImages: (v: string[]) => void; onVideo: (v?: string) => void; maxImages?: number }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      if (kind === 'video') {
        onVideo(await uploadVideo(files[0]))
      } else {
        const out = [...images]
        for (const f of Array.from(files).slice(0, maxImages - images.length)) {
          if (!f.type.startsWith('image/')) continue
          out.push(await uploadImage(await resizeImage(f, 1280)))
        }
        onImages(out)
      }
    } catch (e) {
      toast.error((e as Error).message || 'بارگذاری ناموفق بود')
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  const empty = kind === 'video' ? !video : images.length === 0
  return (
    <div>
      <input ref={ref} type="file" hidden accept={kind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'} multiple={kind === 'image'} onChange={(e) => pick(e.target.files)} />
      {kind === 'video' && video && (
        <div className="relative overflow-hidden rounded-[22px] bg-black">
          <video src={video} controls playsInline className="max-h-72 w-full" />
          <button type="button" onClick={() => onVideo(undefined)} className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5 text-white" aria-label="حذف ویدیو"><X size={15} /></button>
        </div>
      )}
      {kind === 'image' && images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((src, i) => (
            <div key={src.slice(-40) + i} className="anim-item relative aspect-square overflow-hidden rounded-2xl">
              <img loading="lazy" decoding="async" src={src} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onImages(images.filter((_, j) => j !== i))} className="absolute left-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white" aria-label="حذف تصویر"><X size={13} /></button>
            </div>
          ))}
          {images.length < maxImages && (
            <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="flex aspect-square items-center justify-center rounded-2xl border border-dashed hairline text-ink-500" aria-label="افزودن تصویر">
              {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ImagePlus size={22} />}
            </button>
          )}
        </div>
      )}
      {empty && (
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="flex w-full flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed hairline py-10 text-[14px] text-ink-500 transition hover:text-ink-950 dark:hover:text-white">
          {busy ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" /> : kind === 'video' ? <Film size={26} strokeWidth={1.5} /> : <ImagePlus size={26} strokeWidth={1.5} />}
          {busy ? 'در حال بارگذاری…' : kind === 'video' ? 'انتخاب ویدیو (حداکثر ۴۰ مگابایت)' : `انتخاب عکس (تا ${maxImages.toLocaleString('fa-IR')} عکس)`}
        </button>
      )}
    </div>
  )
}
