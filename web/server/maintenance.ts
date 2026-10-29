/** نگهداری روزانه: پاک‌سازی نشست‌ها، کدها، استوری‌های کهنه و فایل‌های بی‌استفاده؛ تازه نگه‌داشتن استوری‌های نمایشی */
import fs from 'node:fs'
import path from 'node:path'
import { mutate } from '../src/core/store'
import { createSeed } from '../src/core/seed'
import { env } from './env'
import { getState, kv, sql } from './storage'

const DAY = 86_400_000

export function dailyCleanup(today: string) {
  if (kv.get('cleanup:last') === today) return
  kv.set('cleanup:last', today)
  const now = Date.now()
  sql.prepare('DELETE FROM sessions WHERE last_seen < ?').run(now - 60 * DAY)
  sql.prepare('DELETE FROM otps WHERE expires < ?').run(now - 3_600_000)

  // استوری‌ها فقط ۲۴ ساعت دیده می‌شوند؛ بعد از ۳ روز از داده حذف می‌شوند
  if (getState().stories.some((s) => now - new Date(s.createdAt).getTime() > 3 * DAY))
    mutate((d) => {
      d.stories = d.stories.filter((s) => now - new Date(s.createdAt).getTime() <= 3 * DAY)
    })

  // فایل‌های آپلودی که دو روز است در هیچ جای داده به آن‌ها اشاره نشده
  const dir = path.join(env.dataDir, 'uploads')
  const all = JSON.stringify(getState())
  for (const f of fs.readdirSync(dir)) {
    const file = path.join(dir, f)
    try {
      if (now - fs.statSync(file).mtimeMs > 2 * DAY && !all.includes('/uploads/' + f)) fs.rmSync(file, { force: true })
    } catch {
      /* ادامه */
    }
  }
}

let seedStories: ReturnType<typeof createSeed>['stories'] | undefined

/** در حالت نمایشی، استوری‌های نمونه هر روز تازه می‌شوند تا ردیف استوری خالی نماند */
export function refreshDemoStories() {
  if (!env.demo) return
  const now = Date.now()
  const seed = (seedStories ??= createSeed().stories)
  const stale = seed.some((x) => {
    const s = getState().stories.find((y) => y.id === x.id)
    return !s || now - new Date(s.createdAt).getTime() > 20 * 3_600_000
  })
  if (!stale) return
  mutate((d) => {
    seed.forEach((x, i) => {
      const fresh = { ...x, seenBy: [], createdAt: new Date(now - (i * 2 + 1) * 3_600_000).toISOString() }
      const at = d.stories.findIndex((y) => y.id === x.id)
      if (at >= 0) d.stories.splice(at, 1)
      d.stories.push(fresh)
    })
  })
}
