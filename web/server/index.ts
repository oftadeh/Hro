/**
 * سرور کی‌فیت: همان هسته‌ی سرویس‌های اپ را با داده‌ی مشترک همه‌ی کاربران اجرا می‌کند.
 *
 *  POST /api/rpc         اجرای سرویس با هویت کاربر (کنترل نقش روی سرور)
 *  GET  /api/state       نمای مجاز کاربر از داده‌ها
 *  GET  /api/events      رویدادهای لحظه‌ای (SSE)
 *  /api/auth/*           کد تأیید پیامکی، ثبت‌نام، خروج
 *  /api/pay/*            درگاه زرین‌پال
 *  /api/upload           بارگذاری تصویر
 *  /api/upload-doc       بارگذاری مدرک خصوصی (احراز کسب‌وکار)
 *  /api/doc/<name>       دریافت مدرک (فقط صاحب حساب و مدیر)
 *  /api/ai/food-photo    تشخیص کالری از عکس
 *  /api/push/*           اعلان گوشی
 *  بقیه‌ی مسیرها         فایل‌های ساخته‌شده‌ی وب‌اپ (SPA)
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { AppError, assertServiceAllowed, configureCore, mutate, registry } from '../src/core/store'
import type { Role } from '../src/core/types'
import { setAI } from '../src/core/ai'
// ثبت همه‌ی سرویس‌ها
import '../src/core/services/auth'
import '../src/core/services/admin'
import '../src/core/services/ai'
import '../src/core/services/challenges'
import '../src/core/services/commerce'
import '../src/core/services/cycle'
import '../src/core/services/doctor'
import '../src/core/services/engagement'
import '../src/core/services/fityab'
import '../src/core/services/fityar'
import '../src/core/services/fitzone'
import '../src/core/services/health'
import '../src/core/services/org'
import '../src/core/services/support'
import '../src/core/services/wallet'
import '../src/core/services/teams'
import '../src/core/services/insurance'
import '../src/core/services/live'
import '../src/core/services/members'
import '../src/core/services/family'
import '../src/core/services/events'
import '../src/core/services/market'
import '../src/core/services/devices'
import { assertCanLogin, createUser, isValidPhone, normalizePhone, type ProfileInput } from '../src/core/services/auth'
import { creditTopUp } from '../src/core/services/wallet'
import { env } from './env'
import { ensureAdmin, getState, getVersion, mutateState, saveNow } from './storage'
import { project } from './project'
import { HttpError, checkOtp, createSession, deleteSession, readSignupToken, requestOtp, sessionUser, signupToken } from './auth'
import { startPayment, verifyPayment } from './pay'
import { claudeProvider } from './ai'
import { pushEnabled, pushTo, saveSubscription } from './push'
import { startCron } from './cron'

/* ───────── اتصال هسته به ذخیره‌سازی سرور ───────── */

const ctx = new AsyncLocalStorage<{ userId: string | null }>()
const clients = new Set<http.ServerResponse>()

configureCore({
  get: getState,
  userId: () => ctx.getStore()?.userId ?? null,
  mutate: (fn) => {
    const before = new Set(getState().notifications.slice(0, 50).map((n) => n.id))
    mutateState(fn)
    // اعلان‌های تازه به گوشی کاربران ارسال می‌شود
    const fresh = getState().notifications.slice(0, 50).filter((n) => !before.has(n.id))
    fresh.forEach((n) => pushTo(n.userId, { title: n.title, body: n.body, link: n.link }).catch(() => {}))
    broadcast()
  },
})
setAI(claudeProvider)
ensureAdmin()

let pending = false
function broadcast() {
  if (pending) return
  pending = true
  setTimeout(() => {
    pending = false
    const v = getVersion()
    for (const c of clients) c.write(`event: change\ndata: ${v}\n\n`)
  }, 100)
}

/* ───────── ابزار HTTP ───────── */

type Req = http.IncomingMessage
type Res = http.ServerResponse

const json = (res: Res, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readBody(req: Req, limit = 3_000_000): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) {
    size += (c as Buffer).length
    if (size > limit) throw new HttpError(413, 'حجم درخواست زیاد است')
    chunks.push(c as Buffer)
  }
  if (!size) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'درخواست نامعتبر')
  }
}

const tokenOf = (req: Req, url: URL) => (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : url.searchParams.get('token'))

function requireUser(req: Req, url: URL) {
  const uid = sessionUser(tokenOf(req, url))
  if (!uid) throw new HttpError(401, 'ابتدا وارد حساب کاربری شوید')
  const u = getState().users.find((x) => x.id === uid)
  if (!u || u.blocked) throw new HttpError(401, 'حساب کاربری در دسترس نیست')
  return uid
}

/** محدودیت ساده‌ی تعداد درخواست برای هر IP/کاربر */
const buckets = new Map<string, { n: number; at: number }>()
function limit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now - b.at > windowMs) buckets.set(key, { n: 1, at: now })
  else if (++b.n > max) throw new HttpError(429, 'درخواست‌ها زیاد است؛ کمی صبر کنید')
}
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) if (now - b.at > 3_600_000) buckets.delete(k)
}, 600_000)

const ipOf = (req: Req) => String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim()

/** سرویس‌هایی که فقط در حالت نمایشی مجازند */
const DEMO_ONLY = new Set(['demo.topUp'])

async function runAs<T>(userId: string | null, fn: () => T | Promise<T>): Promise<T> {
  return ctx.run({ userId }, fn)
}

const stateFor = (uid: string) => ({ ...project(getState(), uid), _v: getVersion() })

/* ───────── مسیرها ───────── */

async function api(req: Req, res: Res, url: URL) {
  const p = url.pathname
  const ip = ipOf(req)
  limit('ip:' + ip, 600, 60_000)

  if (p === '/api/health') return json(res, 200, { ok: true, version: getVersion() })

  if (p === '/api/config') {
    const demoUsers = env.demo ? getState().users.slice(0, 14).map((u) => ({ id: u.id, name: u.name })) : undefined
    return json(res, 200, { demo: env.demo, demoUsers, ai: !!env.ai.key, push: pushEnabled, payments: env.zarinpal.merchant ? 'zarinpal' : 'simulated' })
  }

  if (p === '/api/auth/otp' && req.method === 'POST') {
    const { phone } = await readBody(req)
    const ph = normalizePhone(String(phone ?? ''))
    if (!isValidPhone(ph)) throw new HttpError(400, 'شماره موبایل معتبر نیست')
    limit('otp:' + ip, 8, 3_600_000)
    return json(res, 200, await requestOtp(ph))
  }

  if (p === '/api/auth/verify' && req.method === 'POST') {
    const { phone, code } = await readBody(req)
    const ph = normalizePhone(String(phone ?? ''))
    limit('verify:' + ip, 20, 600_000)
    checkOtp(ph, String(code ?? '').trim())
    const user = getState().users.find((u) => u.phone === ph)
    if (user) {
      await runAs(null, () => assertCanLogin(user.id))
      return json(res, 200, { exists: true, token: createSession(user.id), userId: user.id })
    }
    return json(res, 200, { exists: false, signupToken: signupToken(ph) })
  }

  if (p === '/api/auth/register' && req.method === 'POST') {
    const body = await readBody(req)
    const phone = readSignupToken(String(body.signupToken ?? ''))
    const user = await runAs(null, () => createUser(phone, (body.profile ?? {}) as ProfileInput))
    return json(res, 200, { token: createSession(user.id), userId: user.id })
  }

  if (p === '/api/auth/demo' && req.method === 'POST') {
    if (!env.demo) throw new HttpError(403, 'ورود نمایشی غیرفعال است')
    const { userId } = await readBody(req)
    const u = getState().users.find((x) => x.id === userId)
    if (!u) throw new HttpError(404, 'کاربر یافت نشد')
    return json(res, 200, { token: createSession(u.id), userId: u.id })
  }

  if (p === '/api/auth/logout' && req.method === 'POST') {
    const t = tokenOf(req, url)
    if (t) deleteSession(t)
    return json(res, 200, { ok: true })
  }

  if (p === '/api/state') {
    const uid = requireUser(req, url)
    return json(res, 200, { state: stateFor(uid), userId: uid })
  }

  if (p === '/api/events') {
    requireUser(req, url)
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
    res.write(`event: hello\ndata: ${getVersion()}\n\n`)
    clients.add(res)
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000)
    req.on('close', () => {
      clearInterval(ping)
      clients.delete(res)
    })
    return
  }

  if (p === '/api/rpc' && req.method === 'POST') {
    const uid = requireUser(req, url)
    limit('rpc:' + uid, 240, 60_000)
    const { name, args } = await readBody(req)
    const entry = registry.get(String(name))
    if (!entry || (DEMO_ONLY.has(String(name)) && !env.demo)) throw new HttpError(404, 'سرویس یافت نشد')
    if (!Array.isArray(args) || args.length > 8) throw new HttpError(400, 'ورودی نامعتبر')
    const result = await runAs(uid, async () => {
      const roles = entry.opts.roles as Role[] | undefined
      if (roles?.length) {
        const u = getState().users.find((x) => x.id === uid)!
        if (!roles.some((r) => u.roles.includes(r))) throw new AppError('دسترسی به این بخش ندارید')
      }
      assertServiceAllowed(String(name), uid, roles)
      return await (entry.fn as (...a: unknown[]) => unknown)(...args)
    })
    return json(res, 200, { result: result ?? null, state: stateFor(uid) })
  }

  if (p === '/api/upload' && req.method === 'POST') {
    const uid = requireUser(req, url)
    limit('up:' + uid, 60, 3_600_000)
    const { dataUrl } = await readBody(req, 4_000_000)
    const m = String(dataUrl ?? '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/)
    if (!m) throw new HttpError(400, 'فقط تصویر JPG، PNG یا WebP')
    const buf = Buffer.from(m[2], 'base64')
    if (buf.length > 2_500_000) throw new HttpError(413, 'حجم تصویر زیاد است')
    const name = `${crypto.randomUUID()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`
    fs.writeFileSync(path.join(env.dataDir, 'uploads', name), buf)
    return json(res, 200, { url: `/uploads/${name}` })
  }

  /* مدارک احراز کسب‌وکار: خصوصی، فقط صاحب حساب و مدیر */
  if (p === '/api/upload-doc' && req.method === 'POST') {
    const uid = requireUser(req, url)
    limit('doc:' + uid, 30, 3_600_000)
    const { dataUrl } = await readBody(req, 8_000_000)
    const m = String(dataUrl ?? '').match(/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/)
    if (!m) throw new HttpError(400, 'فقط تصویر JPG، PNG، WebP یا فایل PDF')
    const buf = Buffer.from(m[3], 'base64')
    if (buf.length > 5_000_000) throw new HttpError(413, 'حداکثر حجم هر مدرک ۵ مگابایت است')
    const ext = m[1] === 'application/pdf' ? 'pdf' : m[2] === 'jpeg' ? 'jpg' : m[2]
    const name = `doc-${uid.replace(/[^A-Za-z0-9]/g, '')}-${crypto.randomUUID()}.${ext}`
    const dir = path.join(env.dataDir, 'docs')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, name), buf)
    return json(res, 200, { name })
  }

  if (p.startsWith('/api/doc/') && req.method === 'GET') {
    const uid = requireUser(req, url)
    const name = path.basename(p.slice('/api/doc/'.length))
    if (!/^doc-[A-Za-z0-9-]+\.(jpg|png|webp|pdf)$/.test(name)) throw new HttpError(404, 'یافت نشد')
    const viewer = getState().users.find((x) => x.id === uid)!
    // نام فایل با شناسه‌ی صاحب حساب شروع می‌شود؛ جز او فقط مدیر می‌بیند
    if (!name.startsWith(`doc-${uid.replace(/[^A-Za-z0-9]/g, '')}-`) && !viewer.roles.includes('admin')) throw new HttpError(403, 'دسترسی ندارید')
    const f = path.join(env.dataDir, 'docs', name)
    if (!fs.existsSync(f)) throw new HttpError(404, 'یافت نشد')
    const type = name.endsWith('.pdf') ? 'application/pdf' : name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    const buf = fs.readFileSync(f)
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'private, no-store', 'Content-Length': buf.length })
    return res.end(buf)
  }

  if (p === '/api/upload-video' && req.method === 'POST') {
    const uid = requireUser(req, url)
    limit('vid:' + uid, 10, 3_600_000)
    const type = String(req.headers['content-type'] ?? '')
    const ext = type === 'video/mp4' ? 'mp4' : type === 'video/webm' ? 'webm' : type === 'video/quicktime' ? 'mov' : ''
    if (!ext) throw new HttpError(400, 'فقط ویدیوی MP4، WebM یا MOV')
    const max = 40 * 1024 * 1024
    if (Number(req.headers['content-length'] ?? 0) > max) throw new HttpError(413, 'حداکثر حجم ویدیو ۴۰ مگابایت است')
    const name = `${crypto.randomUUID()}.${ext}`
    const file = path.join(env.dataDir, 'uploads', name)
    const out = fs.createWriteStream(file)
    let size = 0
    try {
      for await (const c of req) {
        size += (c as Buffer).length
        if (size > max) throw new HttpError(413, 'حداکثر حجم ویدیو ۴۰ مگابایت است')
        if (!out.write(c)) await new Promise<void>((r) => out.once('drain', () => r()))
      }
      await new Promise<void>((r, j) => out.end((e?: Error | null) => (e ? j(e) : r())))
    } catch (e) {
      out.destroy()
      fs.rmSync(file, { force: true })
      throw e
    }
    if (size < 1000) {
      fs.rmSync(file, { force: true })
      throw new HttpError(400, 'فایل ویدیو خالی است')
    }
    return json(res, 200, { url: `/uploads/${name}` })
  }

  if (p === '/api/pay/start' && req.method === 'POST') {
    const uid = requireUser(req, url)
    limit('pay:' + uid, 20, 600_000)
    const { amount } = await readBody(req)
    const u = getState().users.find((x) => x.id === uid)!
    return json(res, 200, await startPayment(uid, Math.round(Number(amount)), u.phone))
  }

  if (p === '/api/pay/callback') {
    const authority = url.searchParams.get('Authority') ?? ''
    const status = url.searchParams.get('Status') ?? ''
    try {
      const r = await verifyPayment(authority, status)
      if (r.ok && !r.already) await runAs(r.payment.user_id, () => mutate((d) => creditTopUp(d, r.payment.user_id, r.payment.amount, r.refId)))
      res.writeHead(302, { Location: `/wallet?pay=${r.ok ? 'ok' : 'fail'}${r.refId ? `&ref=${r.refId}` : ''}` })
    } catch {
      res.writeHead(302, { Location: '/wallet?pay=fail' })
    }
    return res.end()
  }

  if (p === '/api/ai/food-photo' && req.method === 'POST') {
    const uid = requireUser(req, url)
    limit('ai:' + uid, 20, 3_600_000)
    if (!env.ai.key || !claudeProvider.foodPhoto) throw new HttpError(503, 'تشخیص از روی عکس فعال نیست')
    const { image } = await readBody(req, 4_000_000)
    try {
      return json(res, 200, await claudeProvider.foodPhoto(String(image ?? '')))
    } catch {
      throw new HttpError(502, 'تشخیص غذا ممکن نشد؛ دستی ثبت کنید')
    }
  }

  if (p === '/api/push/key') return json(res, 200, { publicKey: pushEnabled ? env.push.publicKey : undefined })
  if (p === '/api/push/subscribe' && req.method === 'POST') {
    const uid = requireUser(req, url)
    try {
      saveSubscription(uid, (await readBody(req)) as { endpoint?: string })
    } catch {
      throw new HttpError(400, 'اشتراک اعلان نامعتبر')
    }
    return json(res, 200, { ok: true })
  }

  throw new HttpError(404, 'یافت نشد')
}

/* ───────── فایل‌های ثابت ───────── */

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.webm': 'video/webm', '.mov': 'video/quicktime', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
}

/** ارسال فایل با پشتیبانی از Range (برای جلو/عقب بردن ویدیو) */
function serveFile(res: Res, file: string, cache: string, range?: string) {
  const type = MIME[path.extname(file)] ?? 'application/octet-stream'
  const size = fs.statSync(file).size
  const m = range?.match(/^bytes=(\d*)-(\d*)$/)
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : size - Number(m[2])
    let end = m[1] && m[2] ? Number(m[2]) : size - 1
    start = Math.max(0, start)
    end = Math.min(size - 1, end)
    if (start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` })
      return res.end()
    }
    res.writeHead(206, { 'Content-Type': type, 'Cache-Control': cache, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 })
    return fs.createReadStream(file, { start, end }).pipe(res)
  }
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, 'Accept-Ranges': 'bytes', 'Content-Length': size })
  fs.createReadStream(file).pipe(res)
}

function statics(req: Req, res: Res, url: URL) {
  const p = decodeURIComponent(url.pathname)
  if (p.startsWith('/uploads/')) {
    const f = path.join(env.dataDir, 'uploads', path.basename(p))
    if (fs.existsSync(f)) return serveFile(res, f, 'public, max-age=31536000, immutable', req.headers.range)
    res.writeHead(404)
    return res.end()
  }
  const root = path.resolve(env.staticDir)
  const f = path.resolve(root, '.' + p)
  if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile())
    return serveFile(res, f, p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : p === '/sw.js' ? 'no-cache' : 'public, max-age=3600')
  // SPA: همه‌ی مسیرهای دیگر به index.html
  serveFile(res, path.join(root, 'index.html'), 'no-cache')
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()')
  const url = new URL(req.url ?? '/', 'http://local')
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url)
    else statics(req, res, url)
  } catch (e) {
    if (res.headersSent) return res.end()
    if (e instanceof HttpError) return json(res, e.status, { error: e.message })
    if (e instanceof AppError) return json(res, 400, { error: e.message })
    console.error(e)
    json(res, 500, { error: 'خطای داخلی سرور' })
  }
})

startCron(ctx)
server.listen(env.port, () => console.log(`KeyFit server on :${env.port} (demo=${env.demo}, ai=${!!env.ai.key}, push=${pushEnabled}, payments=${env.zarinpal.merchant ? 'zarinpal' : 'simulated'})`))

const shutdown = () => {
  saveNow()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
