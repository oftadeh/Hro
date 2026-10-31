/** ثبت اعلان‌های Web Push روی گوشی/مرورگر (فقط در نسخه‌ی سرور) */
import { api } from './remote'

const b64ToBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const { publicKey } = await api<{ publicKey?: string }>('/push/key')
  if (!publicKey) return false
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) }))
  await api('/push/subscribe', sub.toJSON())
  return true
}
