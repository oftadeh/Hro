/** اعلان‌های Web Push روی گوشی و مرورگر (کلیدهای VAPID در .env) */
import webpush from 'web-push'
import { sql } from './storage'
import { env } from './env'

export const pushEnabled = !!(env.push.publicKey && env.push.privateKey)
if (pushEnabled) webpush.setVapidDetails(env.push.subject, env.push.publicKey, env.push.privateKey)

export function saveSubscription(userId: string, sub: { endpoint?: string }) {
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint)) throw new Error('bad subscription')
  sql.prepare('INSERT INTO push_subs (endpoint, user_id, json) VALUES (?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, json = excluded.json').run(sub.endpoint, userId, JSON.stringify(sub))
}

export async function pushTo(userId: string, payload: { title: string; body: string; link?: string }) {
  if (!pushEnabled) return
  const rows = sql.prepare('SELECT endpoint, json FROM push_subs WHERE user_id = ?').all(userId) as { endpoint: string; json: string }[]
  await Promise.all(
    rows.map((r) =>
      webpush.sendNotification(JSON.parse(r.json), JSON.stringify(payload), { TTL: 3600 }).catch((e: { statusCode?: number }) => {
        // اشتراک منقضی‌شده حذف می‌شود
        if (e.statusCode === 404 || e.statusCode === 410) sql.prepare('DELETE FROM push_subs WHERE endpoint = ?').run(r.endpoint)
      }),
    ),
  )
}
