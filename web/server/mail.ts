/**
 * ارسال ایمیل با SMTP روی TLS (پورت ۴۶۵) بدون کتابخانه‌ی جانبی.
 * برای Gmail: SMTP_HOST=smtp.gmail.com، SMTP_USER=آدرس جیمیل، SMTP_PASS=App Password (نه رمز اصلی).
 */
import tls from 'node:tls'
import crypto from 'node:crypto'
import { env } from './env'

export const mailEnabled = () => !!(env.mail.host && env.mail.user && env.mail.pass)

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')
const wrap = (s: string) => s.replace(/.{1,76}/g, '$&\r\n')
const word = (s: string) => `=?UTF-8?B?${b64(s)}?=`

export async function sendMail(to: string, subject: string, text: string, html: string) {
  const { host, port, user, pass, fromName } = env.mail
  if (!mailEnabled()) throw new Error('SMTP not configured')
  if (/[\r\n<>]/.test(to)) throw new Error('bad recipient')

  const boundary = 'kf_' + crypto.randomBytes(12).toString('hex')
  const domain = user.split('@')[1] ?? 'localhost'
  const message = [
    `From: ${word(fromName)} <${user}>`,
    `To: <${to}>`,
    `Subject: ${word(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(b64(text)),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(b64(html)),
    `--${boundary}--`,
    '',
  ].join('\r\n')

  const sock = tls.connect({ host, port, servername: host })
  sock.setTimeout(20_000)
  let buf = ''
  let waiting: ((line: string) => void) | null = null
  let failed: Error | null = null
  const fail = (e: Error) => {
    failed = e
    waiting?.('')
  }
  sock.on('error', fail)
  sock.on('timeout', () => fail(new Error('SMTP timeout')))
  sock.on('data', (d) => {
    buf += d.toString('utf8')
    // پاسخ کامل: خطی که بعد از کد سه‌رقمی فاصله دارد
    const lines = buf.split('\r\n')
    const done = lines.findIndex((l) => /^\d{3} /.test(l))
    if (done >= 0 && waiting) {
      const res = lines.slice(0, done + 1).join('\n')
      buf = lines.slice(done + 1).join('\r\n')
      const w = waiting
      waiting = null
      w(res)
    }
  })
  const expect = (code: number, cmd?: string) =>
    new Promise<void>((resolve, reject) => {
      if (failed) return reject(failed)
      waiting = (res) => {
        if (failed) return reject(failed)
        if (!res.startsWith(String(code))) return reject(new Error(`SMTP ${cmd ?? 'greeting'} → ${res.slice(0, 200)}`))
        resolve()
      }
      if (cmd !== undefined) sock.write(cmd + '\r\n')
      else if (buf) sock.emit('data', Buffer.alloc(0))
    })

  try {
    await expect(220)
    await expect(250, `EHLO ${domain}`)
    await expect(334, 'AUTH LOGIN')
    await expect(334, b64(user))
    await expect(235, b64(pass))
    await expect(250, `MAIL FROM:<${user}>`)
    await expect(250, `RCPT TO:<${to}>`)
    await expect(354, 'DATA')
    // نقطه در ابتدای خط باید دوتایی شود
    await expect(250, message.replace(/\r\n\./g, '\r\n..') + '\r\n.')
    sock.write('QUIT\r\n')
  } finally {
    sock.end()
  }
}

/** متن ایمیل کد ورود */
export function otpMail(code: string) {
  const text = `کد ورود شما به کی‌فیت: ${code}\n\nاین کد ۱۰ دقیقه اعتبار دارد. اگر شما درخواست نداده‌اید، این ایمیل را نادیده بگیرید.`
  const html = `<!doctype html><html dir="rtl" lang="fa"><body style="margin:0;background:#131118;font-family:Tahoma,Arial,sans-serif;color:#f4f2f7">
<div style="max-width:440px;margin:0 auto;padding:32px 20px;text-align:center">
<div style="font-size:22px;font-weight:bold">کی‌فیت</div>
<div style="margin-top:24px;background:linear-gradient(140deg,#e6ff9e,#c6ff3d);border-radius:24px;padding:28px 16px;color:#121016">
<div style="font-size:14px">کد ورود شما</div>
<div dir="ltr" style="margin-top:8px;font-size:40px;font-weight:bold;letter-spacing:10px">${code}</div>
</div>
<p style="margin-top:20px;font-size:13px;line-height:24px;color:#bdb6c9">این کد ۱۰ دقیقه اعتبار دارد.<br>اگر شما درخواست نداده‌اید، این ایمیل را نادیده بگیرید.</p>
</div></body></html>`
  return { subject: `کد ورود کی‌فیت: ${code}`, text, html }
}
