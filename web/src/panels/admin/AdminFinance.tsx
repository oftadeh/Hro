import { useState } from 'react'
import { useDB } from '@/core/db'
import { faDateTime, toman } from '@/core/format'
import { resolvePayout } from '@/core/services/admin'
import type { TxType } from '@/core/types'
import { Badge, Button, Card, Empty, PageHeader, Select, SectionTitle } from '@/ui/kit'
import { useUserMap } from '@/ui/hooks'

const TYPE_LABEL: Partial<Record<TxType | 'all', string>> = {
  all: 'همه', subscription: 'اشتراک', checkin: 'ورود باشگاه', coach_plan: 'مربی', shop_order: 'فروشگاه', food_order: 'بوفه',
  doctor_visit: 'پزشک', challenge_create: 'ایجاد چالش', challenge_entry: 'ورودی چالش', challenge_prize: 'جایزه', topup: 'شارژ', withdraw: 'تسویه', refund: 'بازگشت',
}

export default function AdminFinance() {
  const txs = useDB((s) => s.transactions)
  const payouts = useDB((s) => s.payouts)
  const users = useUserMap()
  const [type, setType] = useState<TxType | 'all'>('all')
  const list = txs.filter((t) => type === 'all' || t.type === type).slice(0, 100)
  const name = (id: string) => users[id]?.name ?? { platform: 'کی‌فیت', escrow: 'صندوق چالش', gateway: 'درگاه', subscription: 'اعتبار اشتراک', bank: 'بانک' }[id] ?? id

  return (
    <div className="animate-fade-up">
      <PageHeader title="مالی و تسویه" />
      <SectionTitle title="درخواست‌های تسویه" />
      {payouts.length === 0 && <Empty icon="🏦" title="درخواستی نیست" />}
      <div className="grid gap-3 md:grid-cols-2">
        {payouts.map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold">{name(p.userId)} — {toman(p.amount)}</div>
              <div className="truncate text-[11px] text-ink-400" dir="ltr">{p.iban}</div>
              <div className="text-[11px] text-ink-400">{faDateTime(p.createdAt)}</div>
            </div>
            {p.status === 'pending' ? (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => resolvePayout(p.id, true)}>پرداخت شد</Button>
                <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => resolvePayout(p.id, false)}>رد</Button>
              </div>
            ) : (
              <Badge color={p.status === 'paid' ? 'emerald' : 'rose'}>{p.status === 'paid' ? 'پرداخت شد' : 'رد شد'}</Badge>
            )}
          </Card>
        ))}
      </div>

      <SectionTitle title="دفتر کل تراکنش‌ها" action={
        <Select value={type} onChange={(e) => setType(e.target.value as TxType | 'all')} className="!w-40 !py-2">
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      } />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-ink-50 text-xs text-ink-500 dark:bg-white/5">
            <tr>
              <th className="p-3 text-right">شرح</th>
              <th className="p-3 text-right">از</th>
              <th className="p-3 text-right">به</th>
              <th className="p-3 text-right">مبلغ</th>
              <th className="p-3 text-right">کمیسیون</th>
              <th className="p-3 text-right">زمان</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-white/5">
            {list.map((t) => (
              <tr key={t.id}>
                <td className="p-3"><Badge color="slate">{TYPE_LABEL[t.type]}</Badge> {t.description}</td>
                <td className="p-3 text-xs">{name(t.payerId ?? t.from)}{t.from === 'subscription' && ' (اشتراک)'}</td>
                <td className="p-3 text-xs">{name(t.to)}</td>
                <td className="p-3 font-bold">{toman(t.amount)}</td>
                <td className="p-3 font-bold text-brand-600">{t.commission ? toman(t.commission) : '—'}</td>
                <td className="p-3 text-xs text-ink-400">{faDateTime(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
