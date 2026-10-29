/* سرویس‌ورکر کی‌فیت: کش پوسته‌ی اپ برای باز شدن سریع/آفلاین و نمایش اعلان‌های Push */
const CACHE = 'keyfit-v6'
/** حداکثر فایل‌های ساخت که روی گوشی نگه داشته می‌شود؛ نسخه‌های قدیمی‌تر پاک می‌شوند */
const MAX_ASSETS = 160

async function trimAssets(c) {
  const keys = (await c.keys()).filter((r) => new URL(r.url).pathname.startsWith('/assets/'))
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((r) => c.delete(r)))
}
const SHELL = ['/', '/favicon.svg', '/manifest.webmanifest', '/icon-192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.origin !== location.origin) return
  // ناوبری: شبکه اول، در صورت قطعی پوسته‌ی کش‌شده
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')))
    return
  }
  // فایل‌های ثابت (نام‌گذاری شده با هش): کش اول
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            const copy = res.clone()
            if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, copy).then(() => trimAssets(c)))
            return res
          }),
      ),
    )
  }
})

self.addEventListener('push', (e) => {
  let data = { title: 'کی‌فیت', body: '', link: '/' }
  try {
    data = { ...data, ...e.data.json() }
  } catch {
    /* متن ساده */
  }
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/icon-192.png', badge: '/icon-192.png', dir: 'rtl', lang: 'fa', data: { link: data.link } }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const link = (e.notification.data && e.notification.data.link) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const c of list) if ('focus' in c) return c.navigate(link).then((w) => w && w.focus())
      return self.clients.openWindow(link)
    }),
  )
})
