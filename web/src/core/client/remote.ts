/**
 * اتصال مرورگر به سرور کی‌فیت (وقتی اپ با VITE_REMOTE=1 ساخته شود).
 * - فراخوانی سرویس‌ها به /api/rpc می‌رود و سرور همان کد هسته را با هویت کاربر اجرا می‌کند.
 * - داده‌ها فقط «نمای مجاز» هر کاربر است (اطلاعات خصوصی دیگران ارسال نمی‌شود).
 * - تغییرات دیگران با Server-Sent Events لحظه‌ای می‌رسد (پیام، سفارش، ورود و...).
 */
import { AppError, setTransport } from '../store'
import { useDB, useSession } from '../db'
import type { DBState } from '../state'

export const REMOTE = import.meta.env.VITE_REMOTE === '1'
const BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'keyfit-token'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* حالت خصوصی مرورگر */
  }
}

export async function api<T = unknown>(path: string, body?: unknown, method: 'GET' | 'POST' = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new AppError('ارتباط با سرور برقرار نشد؛ اینترنت را بررسی کنید')
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T
  if (res.status === 401) {
    setToken(null)
    useSession.getState().logout()
  }
  if (!res.ok) throw new AppError(data.error || 'خطای سرور')
  return data
}

let lastVersion = 0
function applyState(s: DBState & { _v?: number }) {
  if (s._v && s._v < lastVersion) return
  lastVersion = s._v ?? lastVersion
  useDB.setState(s, true)
}

export async function syncState() {
  if (!getToken()) return
  const r = await api<{ state: DBState & { _v?: number }; userId: string }>('/state')
  applyState(r.state)
  if (useSession.getState().userId !== r.userId) useSession.getState().login(r.userId, useSession.getState().activeRole)
}

let es: EventSource | null = null
let timer: ReturnType<typeof setTimeout> | undefined
export function connectEvents() {
  es?.close()
  const token = getToken()
  if (!token || typeof EventSource === 'undefined') return
  es = new EventSource(`${BASE}/api/events?token=${encodeURIComponent(token)}`)
  es.addEventListener('change', (e) => {
    const v = Number((e as MessageEvent).data)
    if (v && v <= lastVersion) return
    clearTimeout(timer)
    timer = setTimeout(() => syncState().catch(() => {}), 150)
  })
}

export function disconnect() {
  es?.close()
  es = null
}

export function startRemote() {
  setTransport(async (name, args) => {
    const r = await api<{ result: unknown; state?: DBState & { _v?: number } }>('/rpc', { name, args })
    if (r.state) applyState(r.state)
    return r.result
  })
  if (getToken()) {
    syncState().catch(() => {})
    connectEvents()
  }
  // بازگشت به اپ پس از مدتی: همگام‌سازی دوباره
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncState().catch(() => {})
  })
}

/** بارگذاری تصویر روی سرور و دریافت نشانی آن */
export async function uploadImage(dataUrl: string): Promise<string> {
  if (!REMOTE || !dataUrl.startsWith('data:')) return dataUrl
  const r = await api<{ url: string }>('/upload', { dataUrl })
  return r.url
}

/** بارگذاری ویدیو (در حالت نمایشی فقط فایل‌های کوچک به‌صورت محلی نگه داشته می‌شوند) */
export async function uploadVideo(file: File): Promise<string> {
  if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) throw new AppError('فقط ویدیوی MP4، WebM یا MOV')
  if (!REMOTE) {
    if (file.size > 4 * 1024 * 1024) throw new AppError('در نسخه‌ی نمایشی حداکثر ۴ مگابایت؛ در نسخه‌ی سرور تا ۴۰ مگابایت')
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = () => rej(new AppError('خواندن فایل ممکن نشد'))
      r.readAsDataURL(file)
    })
  }
  if (file.size > 40 * 1024 * 1024) throw new AppError('حداکثر حجم ویدیو ۴۰ مگابایت است')
  const token = getToken()
  const res = await fetch(`${BASE}/api/upload-video`, { method: 'POST', headers: { 'Content-Type': file.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: file })
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !data.url) throw new AppError(data.error || 'بارگذاری ویدیو ناموفق بود')
  return data.url
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(new AppError('خواندن فایل ممکن نشد'))
    r.readAsDataURL(file)
  })

/** بارگذاری مدرک خصوصی احراز (تصویر یا PDF)؛ در حالت نمایشی همان داده‌ی محلی برمی‌گردد */
export async function uploadDoc(file: File): Promise<string> {
  if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)) throw new AppError('فقط تصویر JPG، PNG، WebP یا فایل PDF')
  if (file.size > 5 * 1024 * 1024) throw new AppError('حداکثر حجم هر مدرک ۵ مگابایت است')
  const dataUrl = await readAsDataUrl(file)
  if (!REMOTE) {
    if (file.size > 1_500_000) throw new AppError('در نسخه‌ی نمایشی حداکثر ۱.۵ مگابایت')
    return dataUrl
  }
  const r = await api<{ name: string }>('/upload-doc', { dataUrl })
  return r.name
}

/** باز کردن مدرک در زبانه‌ی جدید (با توکن ورود؛ نشانی عمومی ندارد) */
export async function openDoc(ref: string) {
  const w = window.open('', '_blank')
  try {
    let blob: Blob
    if (ref.startsWith('data:')) blob = await (await fetch(ref)).blob()
    else {
      const token = getToken()
      const res = await fetch(`${BASE}/api/doc/${encodeURIComponent(ref)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) throw new AppError('دسترسی به مدرک ممکن نشد')
      blob = await res.blob()
    }
    const u = URL.createObjectURL(blob)
    if (w) w.location.href = u
    else window.open(u, '_blank')
    setTimeout(() => URL.revokeObjectURL(u), 60_000)
  } catch (e) {
    w?.close()
    throw e
  }
}
