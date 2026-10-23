/** اسکنر QR با دوربین گوشی/لپ‌تاپ (BarcodeDetector یا jsQR) */
import { useEffect, useRef, useState } from 'react'
import { CameraOff } from 'lucide-react'

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> }

export function QrScanner({ onResult, active }: { onResult: (text: string) => void; active: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const done = useRef(false)

  useEffect(() => {
    if (!active) return
    done.current = false
    let stream: MediaStream | undefined
    let raf = 0
    let stopped = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera')
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (stopped) return
        const v = video.current!
        v.srcObject = stream
        await v.play()
        const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
        const detector = BD ? new BD({ formats: ['qr_code'] }) : null
        const jsQR = detector ? null : (await import('jsqr')).default
        const tick = async () => {
          if (stopped || done.current) return
          if (v.readyState >= 2) {
            let text: string | undefined
            if (detector) {
              const r = await detector.detect(v).catch(() => [])
              text = r[0]?.rawValue
            } else if (jsQR && ctx) {
              canvas.width = v.videoWidth
              canvas.height = v.videoHeight
              ctx.drawImage(v, 0, 0)
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
              text = jsQR(img.data, img.width, img.height)?.data
            }
            if (text) {
              done.current = true
              onResult(text)
              return
            }
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        setError('دسترسی به دوربین ممکن نشد؛ اجازه‌ی دوربین را بدهید یا کد ۶ رقمی را وارد کنید.')
      }
    })()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [active, onResult])

  if (error)
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl bg-ink-900/[.05] p-6 text-center text-xs leading-6 text-ink-500 dark:bg-white/[.05]">
        <CameraOff size={28} />
        {error}
      </div>
    )
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black">
      <video ref={video} muted playsInline className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-[18%] rounded-3xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,.35)]" />
    </div>
  )
}
