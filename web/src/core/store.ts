/**
 * هسته‌ی مستقل از محیط: سرویس‌ها فقط از این ماژول استفاده می‌کنند تا همان کد
 * هم در مرورگر (حالت نمایشی/آفلاین) و هم روی سرور اجرا شود.
 *
 * - `db()` و `mutate()` به منبع داده‌ی فعال (zustand در مرورگر، SQLite روی سرور) وصل‌اند.
 * - `svc()` هر سرویس تغییردهنده را با یک نام ثبت می‌کند؛ در حالت سرور، فراخوانی از
 *   مرورگر به `/api/rpc` فرستاده می‌شود و سرور همان تابع را با هویت کاربر اجرا می‌کند.
 */
import type { DBState } from './state'
import type { ID, Role } from './types'

export class AppError extends Error {}

export interface CoreAdapter {
  get(): DBState
  mutate(fn: (d: DBState) => void): void
  userId(): ID | null
}

let adapter: CoreAdapter | null = null
export const configureCore = (a: CoreAdapter) => {
  adapter = a
}
const A = () => {
  if (!adapter) throw new Error('core adapter not configured')
  return adapter
}

export const db = () => A().get()
/** اعمال تغییر روی دیتابیس (یک تراکنش اتمیک؛ در صورت خطا هیچ تغییری ثبت نمی‌شود) */
export const mutate = (fn: (d: DBState) => void) => A().mutate(fn)

export function currentUserId(): ID {
  const id = A().userId()
  if (!id) throw new AppError('ابتدا وارد حساب کاربری شوید')
  return id
}

export const me = () => db().users.find((u) => u.id === currentUserId())!

/** بررسی نقش کاربر فعلی (روی سرور هم پیش از اجرا اعمال می‌شود) */
export function requireRole(...roles: Role[]) {
  const u = me()
  if (!roles.some((r) => u.roles.includes(r))) throw new AppError('دسترسی به این بخش ندارید')
  return u
}

/* ───────── ثبت سرویس‌ها برای RPC ───────── */

export interface SvcOptions {
  /** نقش‌های مجاز؛ اگر خالی باشد هر کاربر واردشده‌ای مجاز است */
  roles?: Role[]
}
export interface SvcEntry {
  fn: (...a: never[]) => unknown
  opts: SvcOptions
}

export const registry = new Map<string, SvcEntry>()
type Transport = (name: string, args: unknown[]) => Promise<unknown>
let transport: Transport | null = null
export const setTransport = (t: Transport | null) => {
  transport = t
}
export const isRemote = () => !!transport

export function svc<A extends unknown[], R>(name: string, fn: (...a: A) => R, opts: SvcOptions = {}) {
  if (registry.has(name)) throw new Error(`duplicate service ${name}`)
  registry.set(name, { fn: fn as SvcEntry['fn'], opts })
  return (...a: A): Promise<Awaited<R>> => {
    if (transport) return transport(name, a) as Promise<Awaited<R>>
    const run = async (): Promise<Awaited<R>> => {
      if (opts.roles?.length) requireRole(...opts.roles)
      return await (fn(...a) as Awaited<R>)
    }
    return run()
  }
}
