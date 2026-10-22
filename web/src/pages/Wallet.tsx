import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, CreditCard, Plus, Ticket } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { SUBSCRIPTION_PLANS } from '@/core/config'
import { daysLeft, num, toman } from '@/core/format'
import { activeSubscription, buySubscription, topUp } from '@/core/services/wallet'
import { Badge, Button, Card, Field, HeroHeader, MetricRow, NumberInput, PageHeader, RaisedSheet, SectionTitle, Sheet } from '@/ui/kit'
import { KeyCard } from '@/ui/KeyCard'
import { useMe, useBalance } from '@/ui/hooks'
import { runOk } from '@/ui/toast'
import { TxList } from './TxList'

const AMOUNTS = [200_000, 500_000, 1_000_000, 2_000_000]

export default function WalletPage() {
  const me = useMe()!
  const bal = useBalance(me.id)
  const txs = useDB((s) => s.transactions)
  useDB((s) => s.subscriptions)
  const sub = activeSubscription(me.id)
  const [charge, setCharge] = useState(false)
  const [amount, setAmount] = useState(500_000)
  const [busy, setBusy] = useState(false)
  const [buy, setBuy] = useState<string>()
  const mine = txs.filter((t) => t.payerId === me.id || t.to === me.id)
  const monthAgo = Date.now() - 30 * 86_400_000
  const recent = mine.filter((t) => new Date(t.createdAt).getTime() > monthAgo)
  const inSum = recent.filter((t) => t.to === me.id).reduce((a, t) => a + t.amount - t.commission, 0)
  const outSum = recent.filter((t) => t.to !== me.id && t.from !== 'subscription').reduce((a, t) => a + t.amount, 0)

  return (
    <div className="animate-fade-up">
      <PageHeader title="کیف پول و اشتراک" />
      <HeroHeader className="px-5 pb-14 pt-6 text-center">
        <div className="text-xs font-semibold text-white/70">موجودی کیف پول</div>
        <div className="mt-1 text-[2.6rem] font-black leading-none tracking-tight">
          {num(bal)} <span className="text-base font-bold text-white/60">تومان</span>
        </div>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={() => setCharge(true)} className="flex items-center gap-1.5 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-brand-700 shadow-soft dark:bg-gradient-to-l dark:from-gold-300 dark:to-gold-500 dark:text-ink-950">
            <Plus size={16} /> شارژ
          </button>
          <a href="#plans" className="flex items-center gap-1.5 rounded-2xl bg-white/15 px-5 py-2.5 text-sm font-bold backdrop-blur">
            <CreditCard size={16} /> اشتراک
          </a>
        </div>
      </HeroHeader>
      <RaisedSheet>
        <div className="grid gap-4 md:grid-cols-2">
          {sub ? (
            <KeyCard
              tilt
              tone={sub.plan.id === 'plan-diamond' ? 'navy' : 'coral'}
              title={`KEYFIT ${sub.plan.name}`}
              subtitle="اعتبار ورود به باشگاه‌ها"
              amount={toman(sub.credit)}
              footer={<><span>{me.name}</span><span>{num(daysLeft(sub.expiresAt))} روز مانده</span></>}
            />
          ) : (
            <KeyCard tone="violet" title="KEYFIT" subtitle="اشتراک فعال نداری" amount="۰ تومان" footer={<span>با اشتراک، بیش از مبلغ پرداختی اعتبار بگیر</span>} />
          )}
          <div className="space-y-2.5">
            <MetricRow tone="rose" icon={<ArrowDownLeft size={20} />} title="ورودی این ماه" value={toman(inSum)} progress={inSum / Math.max(1, inSum + outSum)} />
            <MetricRow tone="sky" icon={<ArrowUpRight size={20} />} title="خرج این ماه" value={toman(outSum)} progress={outSum / Math.max(1, inSum + outSum)} />
            {sub && <MetricRow tone="amber" icon={<Ticket size={20} />} title="مصرف اعتبار اشتراک" value={`${num((1 - sub.credit / sub.plan.credit) * 100)}٪`} progress={1 - sub.credit / sub.plan.credit} />}
          </div>
        </div>
      </RaisedSheet>

      <div id="plans" /><SectionTitle title="✨ پلن‌های اشتراک کی‌فیت" />
      <div className="grid gap-4 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((p) => (
          <Card key={p.id} className={clsx('relative flex flex-col', p.popular && 'ring-2 ring-brand-400 dark:ring-gold-400/70')}>
            {p.popular && <Badge color="amber" className="absolute left-4 top-4">محبوب‌ترین</Badge>}
            <div className={`h-12 w-12 rounded-[1rem] bg-gradient-to-br shadow-soft ${p.color}`} />
            <div className="mt-3 text-lg font-extrabold">{p.name}</div>
            <div className="text-2xl font-black">{toman(p.price)}</div>
            <div className="text-xs text-ink-400">{num(p.durationDays)} روزه · {num(Math.round(((p.credit - p.price) / p.price) * 100))}٪ اعتبار هدیه</div>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {p.perks.map((perk) => (
                <li key={perk} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-brand-500" /> {perk}</li>
              ))}
            </ul>
            <Button className="mt-4 w-full" variant={p.popular ? 'primary' : 'outline'} onClick={() => setBuy(p.id)}>
              {sub?.planId === p.id ? 'تمدید' : 'خرید'}
            </Button>
          </Card>
        ))}
      </div>

      <SectionTitle title="تراکنش‌ها" />
      <Card>
        <TxList txs={mine.slice(0, 50)} userId={me.id} />
      </Card>

      <Sheet open={charge} onClose={() => setCharge(false)} title="شارژ کیف پول">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {AMOUNTS.map((a) => (
              <button key={a} onClick={() => setAmount(a)} className={clsx('rounded-2xl border p-3 text-sm font-bold', amount === a ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-gold-400 dark:bg-gold-400/10 dark:text-gold-300' : 'border-ink-200 dark:border-white/10')}>
                {toman(a)}
              </button>
            ))}
          </div>
          <Field label="مبلغ دلخواه (تومان)">
            <NumberInput value={amount} onChange={setAmount} />
          </Field>
          <Button
            className="w-full"
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true)
              const ok = await runOk(() => topUp(amount), 'کیف پول شارژ شد 💳')
              setBusy(false)
              if (ok) setCharge(false)
            }}
          >
            پرداخت از درگاه بانکی
          </Button>
          <p className="text-center text-[11px] text-ink-400">در نسخه‌ی آزمایشی، پرداخت شبیه‌سازی می‌شود.</p>
        </div>
      </Sheet>

      <Sheet open={!!buy} onClose={() => setBuy(undefined)} title="خرید اشتراک">
        {buy && (() => {
          const p = SUBSCRIPTION_PLANS.find((x) => x.id === buy)!
          return (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">اشتراک {p.name} — {toman(p.price)} از کیف پول کسر و {toman(p.credit)} اعتبار ورود دریافت می‌کنید.</p>
              <div className="text-xs text-ink-400">موجودی: {toman(bal)}</div>
              <Button className="w-full" size="lg" onClick={async () => {
                const ok = await runOk(() => buySubscription(p.id), `اشتراک ${p.name} فعال شد ✨`)
                if (ok) setBuy(undefined)
              }}>
                پرداخت از کیف پول
              </Button>
              {bal < p.price && <Button variant="secondary" className="w-full" onClick={() => { setBuy(undefined); setAmount(p.price - bal); setCharge(true) }}>شارژ کیف پول ({toman(p.price - bal)})</Button>}
            </div>
          )
        })()}
      </Sheet>
    </div>
  )
}
