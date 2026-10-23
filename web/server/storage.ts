/**
 * ذخیره‌سازی با SQLite داخلی Node:
 *  - وضعیت کامل اپ (همان DBState هسته) به‌صورت یک سند JSON با نوشتن اتمیک و پشتیبان روزانه
 *  - جدول‌های جدا برای نشست‌ها، کدهای تأیید، پرداخت‌ها و اشتراک‌های اعلان
 */
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { produce } from 'immer'
import type { DBState } from '../src/core/state'
import { createEmpty, createSeed } from '../src/core/seed'
import { env } from './env'

fs.mkdirSync(env.dataDir, { recursive: true })
fs.mkdirSync(path.join(env.dataDir, 'uploads'), { recursive: true })
fs.mkdirSync(path.join(env.dataDir, 'backups'), { recursive: true })

export const sql = new DatabaseSync(path.join(env.dataDir, 'keyfit.db'))
sql.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS otps (phone TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, sent_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount INTEGER NOT NULL, authority TEXT, status TEXT NOT NULL, ref_id TEXT, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, json TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_pay_authority ON payments(authority);
`)

const kvGet = sql.prepare('SELECT value FROM kv WHERE key = ?')
const kvSet = sql.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
export const kv = {
  get: (k: string) => (kvGet.get(k) as { value: string } | undefined)?.value,
  set: (k: string, v: string) => kvSet.run(k, v),
}

/** هر مجموعه‌ای که در نسخه‌ی جدید اضافه شده باشد با مقدار پیش‌فرض پر می‌شود */
function migrate(s: Partial<DBState>): DBState {
  const base = createEmpty()
  const out = { ...base, ...s } as DBState
  out.settings = { ...base.settings, ...s.settings, commissions: { ...base.settings.commissions, ...s.settings?.commissions } }
  return out
}

function load(): DBState {
  const raw = kv.get('state')
  if (raw) return migrate(JSON.parse(raw))
  const fresh = env.demo ? createSeed() : createEmpty()
  return fresh
}

let state: DBState = load()
let version = Date.now()
export const getState = () => state
export const getVersion = () => version

/** اعمال تغییر به‌صورت اتمیک (در صورت خطا هیچ تغییری ثبت نمی‌شود) */
export function mutateState(fn: (d: DBState) => void) {
  state = produce(state, fn)
  version += 1
  scheduleSave()
}

let timer: NodeJS.Timeout | undefined
function scheduleSave() {
  clearTimeout(timer)
  timer = setTimeout(saveNow, 250)
}
export function saveNow() {
  clearTimeout(timer)
  kv.set('state', JSON.stringify(state))
}

/** پشتیبان روزانه (۱۴ نسخه‌ی آخر نگه داشته می‌شود) */
export function dailyBackup() {
  const day = new Date().toISOString().slice(0, 10)
  const dir = path.join(env.dataDir, 'backups')
  const file = path.join(dir, `state-${day}.json`)
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(state))
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('state-')).sort()
  files.slice(0, Math.max(0, files.length - 14)).forEach((f) => fs.unlinkSync(path.join(dir, f)))
}

/** مدیر کل سامانه با شماره‌ی ADMIN_PHONE ساخته یا ارتقا داده می‌شود */
export function ensureAdmin() {
  if (!env.adminPhone) return
  mutateState((d) => {
    const u = d.users.find((x) => x.phone === env.adminPhone)
    if (u) {
      if (!u.roles.includes('admin')) u.roles.push('admin')
      return
    }
    d.users.push({ id: 'u-admin-' + env.adminPhone.slice(-4), name: 'مدیر کی‌فیت', phone: env.adminPhone, city: 'تهران', roles: ['user', 'admin'], xp: 0, streak: 0, following: [], createdAt: new Date().toISOString() })
  })
  saveNow()
}
