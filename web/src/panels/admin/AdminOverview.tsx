import { Link } from 'react-router-dom'
import { Activity, Building2, ChevronLeft, Coins, Landmark, Lock, Users } from 'lucide-react'
import { useDB } from '@/core/db'
import { MODULE_LABEL, ROLE_META } from '@/core/config'
import { num, toman } from '@/core/format'
import { dailySeries, platformStats } from '@/core/services/admin'
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
  const pendingDocs = users.filter((u) => u.verification?.status === 'pending').length
  const todo = [
    { n: pendingDocs, label: 'مدرک کسب‌وکار در انتظار بررسی', to: 'approvals', tone: 'card-violet' },
    { n: pendingGyms, label: 'باشگاه در انتظار تأیید', to: 'gyms', tone: 'card-pink' },
    { n: pendingPayouts, label: 'درخواست تسویه در انتظار', to: 'finance', tone: 'card-mint' },
  ].filter((t) => t.n > 0)
  const roleCounts = (Object.keys(ROLE_META) as Role[]).filter((r) => r !== 'admin').map((r) => ({ r, n: users.filter((u) => u.roles.includes(r)).length }))
  const bars = [
    { label: 'اشتراک', value: revenueByModule.subscription ?? 0 },
    ...(Object.keys(MODULE_LABEL) as RevenueModule[]).map((m) => ({ label: MODULE_LABEL[m].split(' ')[0], value: revenueByModule[m] ?? 0 })),
  ]

  return (
    <div className="animate-fade-up">
      <PageHeader title="نمای کلی کی‌فیت" subtitle="نظارت بر همه‌ی ماژول‌ها، نقش‌ها و جریان مالی" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="violet" label="درآمد کی‌فیت (کمیسیون + اشتراک)" value={toman(revenue)} icon={<Coins size={18} />} />
        <Stat label="گردش مالی (GMV)" value={toman(gmv)} icon={<Activity size={18} />} tone="sky" />
        <Stat label="موجودی حساب پلتفرم" value={toman(wallets.platform ?? 0)} icon={<Landmark size={18} />} tone="emerald" />
        <Stat label="صندوق امانی چالش‌ها" value={toman(wallets.escrow ?? 0)} icon={<Lock size={18} />} tone="amber" hint={`${num(challenges.filter((c) => c.status === 'active').length)} چالش فعال`} />
      </div>

      {todo.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {todo.map((t) => (
            <Link key={t.to} to={t.to} className={`press anim-enter flex items-center gap-3 rounded-[22px] p-4 text-ink-950 ${t.tone}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/50 text-[17px] font-extrabold tabular-nums">{num(t.n)}</span>
              <span className="min-w-0 flex-1 text-[14px] font-semibold leading-6">{t.label}</span>
              <ChevronLeft size={18} className="opacity-60" />
            </Link>
          ))}
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

      <SectionTitle title="۱۴ روز اخیر" />
      {(() => {
        const series = dailySeries(14)
        const lbl = (d: string) => new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(new Date(d + 'T12:00'))
        return (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <div className="mb-1 text-sm font-semibold">درآمد خالص کی‌فیت (هزار تومان)</div>
              <MiniBars data={series.map((x) => ({ label: lbl(x.day), value: Math.round(x.revenue / 1000) }))} />
            </Card>
            <Card>
              <div className="mb-1 text-sm font-semibold">ورود به باشگاه‌ها</div>
              <MiniBars data={series.map((x) => ({ label: lbl(x.day), value: x.checkins }))} />
            </Card>
            <Card>
              <div className="mb-1 text-sm font-semibold">کاربران فعال و ثبت‌نام</div>
              <MiniBars data={series.map((x) => ({ label: lbl(x.day), value: x.active + x.signups }))} />
            </Card>
          </div>
        )
      })()}

      <SectionTitle title="آخرین تراکنش‌های سامانه" />
      <Card>
        <TxList txs={txs.slice(0, 15)} userId="platform" showCommission />
      </Card>
    </div>
  )
}
