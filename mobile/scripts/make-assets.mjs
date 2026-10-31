/** آیکن و صفحه‌ی آغاز اپ اندروید را از آیکن‌های همان سایت می‌سازد (ImageMagick لازم است) */
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const pub = new URL('../../web/public/', import.meta.url).pathname
const out = new URL('../assets/', import.meta.url).pathname
mkdirSync(out, { recursive: true })

const bin = (() => {
  for (const b of ['magick', 'convert']) {
    try {
      execFileSync(b, ['-version'], { stdio: 'ignore' })
      return b
    } catch {
      /* بعدی */
    }
  }
  throw new Error('ImageMagick پیدا نشد')
})()
const im = (...args) => execFileSync(bin, args, { stdio: 'inherit' })

// آیکن تمام‌صفحه (اندروید خودش ماسک گرد یا چهارگوش را اعمال می‌کند)
im(`${pub}icon-maskable-512.png`, '-resize', '1024x1024', `${out}icon-only.png`)
// صفحه‌ی آغاز: آیکن وسط زمینه‌ی تیره‌ی برند
for (const name of ['splash.png', 'splash-dark.png'])
  im('-size', '2732x2732', 'xc:#131118', '(', `${pub}icon-512.png`, '-resize', '640x640', ')', '-gravity', 'center', '-composite', `${out}${name}`)
console.log('assets ready')
