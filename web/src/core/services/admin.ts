import { mutate, db } from '../db'
import type { RevenueModule } from '../types'
import { notify } from './ledger'
import { uid, now } from '../id'
import { toman } from '../format'

export function setCommission(module: RevenueModule, pct: number) {
  mutate((d) => {
    d.settings.commissions[module] = Math.min(90, Math.max(0, pct))
  })
}

export function setPlatformSetting(key: 'challengeCreationFee' | 'minWithdraw', value: number) {
  mutate((d) => {
    d.settings[key] = Math.max(0, value)
  })
}

export function setGymApproval(gymId: string, approved: boolean) {
  mutate((d) => {
    const g = d.gyms.find((x) => x.id === gymId)
    if (!g) return
    g.approved = approved
    notify(d, g.ownerId, approved ? 'باشگاه شما تایید شد ✅' : 'باشگاه شما غیرفعال شد', approved ? `«${g.name}» اکنون در فیت‌یاب نمایش داده می‌شود.` : `«${g.name}» از فیت‌یاب حذف شد.`, approved ? '✅' : '⚠️', '/panel/gym')
  })
}

export function resolvePayout(id: string, ok: boolean) {
  mutate((d) => {
    const p = d.payouts.find((x) => x.id === id)
    if (!p || p.status !== 'pending') return
    p.status = ok ? 'paid' : 'rejected'
    if (!ok) {
      d.wallets[p.userId] = (d.wallets[p.userId] ?? 0) + p.amount
      d.transactions.unshift({ id: uid('tx-'), type: 'refund', from: 'gateway', to: p.userId, amount: p.amount, commission: 0, description: 'برگشت درخواست تسویه', createdAt: now() })
    }
    notify(d, p.userId, ok ? 'تسویه انجام شد 🏦' : 'درخواست تسویه رد شد', `${toman(p.amount)}`, '🏦', '/wallet')
  })
}

export function toggleBlockUser(userId: string) {
  mutate((d) => {
    const u = d.users.find((x) => x.id === userId)
    if (u) u.blocked = !u.blocked
  })
}

export function broadcast(title: string, body: string) {
  mutate((d) => {
    d.users.forEach((u) => notify(d, u.id, title, body, '📣'))
  })
}

export function platformStats() {
  const s = db()
  const revenueByModule: Record<string, number> = {}
  let gmv = 0
  for (const t of s.transactions) {
    if (['topup', 'withdraw', 'refund', 'challenge_prize'].includes(t.type)) continue
    gmv += t.amount
    const key = t.type === 'subscription' ? 'subscription' : t.module ?? 'other'
    revenueByModule[key] = (revenueByModule[key] ?? 0) + t.commission
  }
  const revenue = Object.values(revenueByModule).reduce((a, b) => a + b, 0)
  return { gmv, revenue, revenueByModule }
}
