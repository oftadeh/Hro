import { useState } from 'react'
import { Banknote, Percent, TrendingUp, Wallet } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDate, toman } from '@/core/format'
import { requestWithdraw } from '@/core/services/wallet'
import { Badge, Button, Card, Field, Input, NumberInput, PageHeader, SectionTitle, Stat } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { run } from '@/ui/toast'
import { TxList } from '@/pages/TxList'

/** درآمد، کمیسیون کسرشده و تسویه برای همه‌ی نقش‌های ارائه‌دهنده */
export default function PanelFinance() {
  const me = useMe()!
  const bal = useBalance(me.id)
  const txs = useDB((s) => s.transactions)
  const payouts = useDB((s) => s.payouts)
  const min = useDB((s) => s.settings.minWithdraw)
  const [amount, setAmount] = useState(0)
  const [iban, setIban] = useState('IR')
  const incoming = txs.filter((t) => t.to === me.id && t.type !== 'topup' && t.type !== 'refund')
  const gross = incoming.reduce((a, t) => a + t.amount, 0)
  const commission = incoming.reduce((a, t) => a + t.commission, 0)
  const mine = payouts.filter((p) => p.userId === me.id)

  return (
    <div className="animate-fade-up">
      <PageHeader title="درآمد و تسویه" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="violet" label="موجودی قابل برداشت" value={toman(bal)} icon={<Wallet size={18} />} />
        <Stat label="فروش ناخالص" value={toman(gross)} icon={<TrendingUp size={18} />} tone="sky" />
        <Stat label="کمیسیون کی‌فیت" value={toman(commission)} icon={<Percent size={18} />} tone="emerald" />
        <Stat label="درآمد خالص" value={toman(gross - commission)} icon={<Banknote size={18} />} tone="amber" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="mb-2 font-semibold">تراکنش‌های درآمدی</div>
          <TxList txs={incoming.slice(0, 60)} userId={me.id} showCommission />
        </Card>
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="font-semibold">درخواست تسویه</div>
            <Field label="مبلغ (تومان)" hint={`حداقل ${toman(min)}`}>
              <NumberInput value={amount} onChange={setAmount} />
            </Field>
            <Field label="شماره شبا">
              <Input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} dir="ltr" className="text-left" placeholder="IR000000000000000000000000" />
            </Field>
            <Button className="w-full" onClick={() => run(() => requestWithdraw(amount, iban), 'درخواست تسویه ثبت شد')}>ثبت درخواست</Button>
          </Card>
          <SectionTitle title="درخواست‌های تسویه" />
          {mine.map((p) => (
            <Card key={p.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-semibold">{toman(p.amount)}</div>
                <div className="text-[12px] text-ink-400">{faDate(p.createdAt)}</div>
              </div>
              <Badge color={p.status === 'paid' ? 'emerald' : p.status === 'rejected' ? 'rose' : 'amber'}>{p.status === 'paid' ? 'پرداخت شد' : p.status === 'rejected' ? 'رد شد' : 'در انتظار'}</Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
