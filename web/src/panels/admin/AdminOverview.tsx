import { Link } from 'react-router-dom'
import { Activity, Building2, Coins, Landmark, Lock, Users } from 'lucide-react'
import { useDB } from '@/core/db'
import { MODULE_LABEL, ROLE_META } from '@/core/config'
import { num, toman } from '@/core/format'
import { platformStats } from '@/core/services/admin'
import type { RevenueModule, Role } from '@/core/types'
import { Card, PageHeader, SectionTitle, Stat } from '@/ui/kit'
import { TxList } from '@/pages/TxList'
import { MiniBars } from '../shared/MiniBars'
import { RoleIcon } from '@/ui/icons'

export default function AdminOverview() {
  const users = useDB((s) => s.users)
  const gyms = useDB((s) => s.gyms)
  const payouts = useDB((s) => s.payouts)
  const wallets = useDB((s) => s.wallets)
  const txs = useDB((s) => s.transactions)
  const challenges = useDB((s) => s.challenges)
  const { gmv, revenue, revenueByModule } = platformStats()
  const pendingGyms = gyms.filter((g) => !g.approved).length
  const pendingPayouts = payouts.filter((p) => p.status === 'pending').length
  const roleCounts = (Object.keys(ROLE_META) as Role[]).filter((r) => r !== 'admin').map((r) => ({ r, n: users.filter((u) => u.roles.includes(r)).length }))
  const bars = [
    { label: 'اشتراک', value: revenueByModule.subscription ?? 0 },
    ...(Object.keys(MODULE_LABEL) as RevenueModule[]).map((m) => ({ label: MODULE_LABEL[m].split(' ')[0], value: revenueByModule[m] ?? 0 })),
  ]

  return (
    <div className="animate-fade-up">
      <PageHeader title="نمای کلی کی‌فیت" subtitle="نظارت بر همه‌ی ماژول‌ها، نقش‌ها و جریان مالی" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="درآمد کی‌فیت (کمیسیون + اشتراک)" value={toman(revenue)} icon={<Coins size={18} />} />
        <Stat label="گردش مالی (GMV)" value={toman(gmv)} icon={<Activity size={18} />} tone="sky" />
        <Stat label="موجودی حساب پلتفرم" value={toman(wallets.platform ?? 0)} icon={<Landmark size={18} />} tone="violet" />
        <Stat label="صندوق امانی چالش‌ها" value={toman(wallets.escrow ?? 0)} icon={<Lock size={18} />} tone="amber" hint={`${num(challenges.filter((c) => c.status === 'active').length)} چالش فعال`} />
      </div>

      {(pendingGyms > 0 || pendingPayouts > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {pendingGyms > 0 && <Link to="gyms"><Card className="border-brand-200 bg-brand-50 text-sm font-semibold dark:border-brand-500/20 dark:bg-brand-500/10">{num(pendingGyms)} باشگاه در انتظار تایید</Card></Link>}
          {pendingPayouts > 0 && <Link to="finance"><Card className="border-aqua-200 bg-aqua-50 text-sm font-semibold dark:border-aqua-500/20 dark:bg-aqua-500/10">{num(pendingPayouts)} درخواست تسویه در انتظار</Card></Link>}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="mb-2 font-semibold">درآمد به تفکیک ماژول</div>
          <MiniBars data={bars} color="from-ink-800 to-ink-700" format={(n) => `${num(n / 1000)}k`} />
        </Card>
        <Card>
          <div className="mb-3 flex items-center gap-2 font-semibold"><Users size={18} /> کاربران ({num(users.length)})</div>
          <div className="space-y-2">
            {roleCounts.map(({ r, n }) => (
              <div key={r} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-600 dark:text-ink-300"><RoleIcon role={r} size={15} /> {ROLE_META[r].label}</span>
                <b>{num(n)}</b>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-ink-100 pt-2 text-sm dark:border-white/5">
              <span><Building2 size={14} className="inline" /> باشگاه‌های فعال</span>
              <b>{num(gyms.filter((g) => g.approved).length)}</b>
            </div>
          </div>
        </Card>
      </div>

      <SectionTitle title="آخرین تراکنش‌های سامانه" />
      <Card>
        <TxList txs={txs.slice(0, 15)} userId="platform" showCommission />
      </Card>
    </div>
  )
}
