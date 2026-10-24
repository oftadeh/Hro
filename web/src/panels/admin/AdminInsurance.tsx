import { useState } from 'react'
import { useDB } from '@/core/db'
import { faDate, num, toman } from '@/core/format'
import { CLAIM_STATUS, payClaim, reviewClaim, saveInsurancePlan } from '@/core/services/insurance'
import { Badge, Button, Card, Empty, Input, NumberInput, PageHeader, SectionTitle, Stat, Tabs } from '@/ui/kit'
import { useUserMap } from '@/ui/hooks'
import { run } from '@/ui/toast'

/** کارشناسی خسارت و مدیریت پلن‌های بیمه */
export default function AdminInsurance() {
  const s = useDB((x) => x)
  const users = useUserMap()
  const [tab, setTab] = useState<'open' | 'closed'>('open')
  const [amt, setAmt] = useState<Record<string, number>>({})
  const [note, setNote] = useState<Record<string, string>>({})
  const list = s.claims.filter((c) => (tab === 'open' ? ['submitted', 'reviewing', 'approved'].includes(c.status) : ['paid', 'rejected'].includes(c.status)))
  const premiums = s.transactions.filter((t) => t.type === 'insurance').reduce((a, t) => a + t.amount, 0)
  const paid = s.transactions.filter((t) => t.type === 'claim_payout').reduce((a, t) => a + t.amount, 0)
  return (
    <div className="animate-fade-up">
      <PageHeader title="بیمه و خسارت" subtitle="بررسی پرونده‌ها با مدارک، تأیید مبلغ پس از فرانشیز و پرداخت به کیف پول" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="violet" label="بیمه‌نامه‌ی فعال" value={num(s.policies.filter((p) => p.status === 'active' && new Date(p.endAt) > new Date()).length)} />
        <Stat label="حق بیمه‌ی دریافتی" value={toman(premiums)} tone="sky" />
        <Stat label="خسارت پرداخت‌شده" value={toman(paid)} tone="emerald" />
        <Stat label="مانده‌ی حساب بیمه‌گر" value={toman(s.wallets.insurer ?? 0)} tone="amber" />
      </div>
      <Tabs className="my-4" value={tab} onChange={setTab} items={[{ value: 'open', label: 'در جریان' }, { value: 'closed', label: 'بسته‌شده' }]} />
      {list.length === 0 && <Empty title="پرونده‌ای نیست" />}
      <div className="space-y-3">
        {list.map((c) => {
          const p = s.policies.find((x) => x.id === c.policyId)
          const plan = p && s.insurancePlans.find((x) => x.id === p.planId)
          const max = plan ? Math.round((c.amount * (100 - plan.deductiblePct)) / 100) : c.amount
          return (
            <Card key={c.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <b>{users[c.userId]?.name}</b>
                <span className="text-xs text-ink-500">بیمه‌نامه {p?.number} · {plan?.name}</span>
                <Badge color={c.status === 'rejected' ? 'rose' : c.status === 'paid' || c.status === 'approved' ? 'emerald' : 'amber'} className="mr-auto">{CLAIM_STATUS[c.status]}</Badge>
              </div>
              <div className="mt-2 text-xs text-ink-500">{c.sport} · حادثه: {faDate(c.incidentAt)} · ثبت: {faDate(c.createdAt)}</div>
              <p className="mt-2 text-sm leading-7">{c.description}</p>
              {c.documents.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {c.documents.map((d, i) => <a key={i} href={d} target="_blank" rel="noreferrer"><img src={d} alt="مدرک" className="h-16 w-16 rounded-xl object-cover" /></a>)}
                </div>
              )}
              <div className="mt-2 text-xs">درخواست: {toman(c.amount)} · حداکثر قابل پرداخت (فرانشیز {plan?.deductiblePct}٪): {toman(max)}{c.approvedAmount ? ` · تأییدشده: ${toman(c.approvedAmount)}` : ''}</div>
              {(c.status === 'submitted' || c.status === 'reviewing') && (
                <div className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr_auto_auto_auto]">
                  <NumberInput value={amt[c.id] ?? max} onChange={(v) => setAmt({ ...amt, [c.id]: v })} />
                  <Input value={note[c.id] ?? ''} onChange={(e) => setNote({ ...note, [c.id]: e.target.value })} placeholder="توضیح کارشناس" />
                  {c.status === 'submitted' && <Button size="sm" variant="secondary" onClick={() => run(() => reviewClaim(c.id, 'reviewing', undefined, note[c.id]))}>در حال بررسی</Button>}
                  <Button size="sm" onClick={() => run(() => reviewClaim(c.id, 'approved', amt[c.id] ?? max, note[c.id]), 'تأیید شد')}>تأیید</Button>
                  <Button size="sm" variant="ghost" className="text-coral-500" onClick={() => run(() => reviewClaim(c.id, 'rejected', undefined, note[c.id] || 'مدارک کافی نیست'), 'رد شد')}>رد</Button>
                </div>
              )}
              {c.status === 'approved' && <Button size="sm" className="mt-3" onClick={() => run(() => payClaim(c.id), 'خسارت به کیف پول بیمه‌شده واریز شد')}>پرداخت {toman(c.approvedAmount!)}</Button>}
            </Card>
          )
        })}
      </div>
      <SectionTitle title="پلن‌های بیمه" />
      <div className="grid gap-3 sm:grid-cols-2">
        {s.insurancePlans.map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{p.name} · {toman(p.price)}</div>
              <div className="text-[12px] text-ink-500">درمان تا {toman(p.medicalCover)} · فرانشیز {num(p.deductiblePct)}٪</div>
            </div>
            <button onClick={() => run(() => saveInsurancePlan({ ...p, active: !p.active }))}><Badge color={p.active ? 'emerald' : 'slate'}>{p.active ? 'فعال' : 'غیرفعال'}</Badge></button>
          </Card>
        ))}
      </div>
    </div>
  )
}
