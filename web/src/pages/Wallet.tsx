import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, CreditCard, Plus, Ticket } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { SUBSCRIPTION_PLANS } from '@/core/config'
import { daysLeft, num, toman } from '@/core/format'
import { activeSubscription, buySubscription, topUp } from '@/core/services/wallet'
import { Badge, Button, Card, Field, HeroHeader, MetricRow, Money, NumberInput, PageHeader, SectionTitle, Sheet } from '@/ui/kit'
import { KeyCard } from '@/ui/KeyCard'
import { useMe, useBalance } from '@/ui/hooks'
import { runOk } from '@/ui/toast'
import { TxList } from './TxList'
import { WalletCoins } from '@/ui/art'

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
      <PageHeader title="کیف پول و عضویت" />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <HeroHeader seed="wallet" className="flex flex-col justify-between p-6">
          <WalletCoins size={130} className="pointer-events-none absolute left-3 top-3 max-sm:opacity-70" />
          <div>
            <div className="font-display text-[1.9rem] leading-none">کیف پول</div>
            <div className="mt-3 font-display text-[3rem] leading-none">
              <Money value={bal} unitClass="font-sans" />
            </div>
          </div>
          <div className="mt-8 flex gap-2">
            <button onClick={() => setCharge(true)} className="flex h-11 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-medium text-ink-950 transition hover:scale-[1.02]">
              <Plus size={16} strokeWidth={1.5} /> افزایش موجودی
            </button>
            <a href="#plans" className="flex h-11 items-center gap-1.5 rounded-full bg-white/15 px-5 text-sm text-white backdrop-blur transition hover:bg-white/25">
              <CreditCard size={16} strokeWidth={1.5} /> عضویت
            </a>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 text-xs">
            <div>
              <div className="flex items-center gap-1.5 text-white/65"><ArrowDownLeft size={13} strokeWidth={1.5} /> ورودی ۳۰ روز</div>
              <div className="mt-1 text-base tabular-nums">{toman(inSum)}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-white/65"><ArrowUpRight size={13} strokeWidth={1.5} /> هزینه‌ی ۳۰ روز</div>
              <div className="mt-1 text-base tabular-nums">{toman(outSum)}</div>
            </div>
          </div>
        </HeroHeader>
        <div className="space-y-3">
          {sub ? (
            <KeyCard
              tone={sub.plan.id === 'plan-diamond' ? 'mint' : sub.plan.id === 'plan-gold' ? 'lavender' : 'peach'}
              title={`KEYFIT · ${sub.plan.name}`}
              subtitle="اعتبار ورود به باشگاه‌ها"
              amount={sub.credit}
              footer={<><span>{me.name}</span><span>{num(daysLeft(sub.expiresAt))} روز باقی‌مانده</span></>}
            />
          ) : (
            <KeyCard tone="lavender" title="KEYFIT" subtitle="عضویت فعال ندارید" amount="۰ تومان" footer={<span>با عضویت، بیش از مبلغ پرداختی اعتبار بگیرید</span>} />
          )}
          {sub && (
            <Card className="px-4 py-1">
              <MetricRow tone="amber" icon={<Ticket size={17} />} title="مصرف اعتبار ورود" value={`${num((1 - sub.credit / sub.plan.credit) * 100)}٪`} progress={1 - sub.credit / sub.plan.credit} />
            </Card>
          )}
        </div>
      </div>

      <div id="plans" /><SectionTitle title="عضویت‌ها" />
      <div className="grid gap-4 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((p) => (
          <Card key={p.id} className={clsx('relative flex flex-col p-6', p.popular && 'border-ink-950 dark:border-brand-300/50')}>
            {p.popular && <Badge color="amber" className="absolute left-5 top-5">پیشنهاد ما</Badge>}
            <div className="text-[11px] tracking-[.25em] text-ink-400">KEYFIT</div>
            <div className="mt-3 font-display text-[2rem] leading-none">{p.name}</div>
            <div className="mt-4 font-display text-[2.2rem] leading-none"><Money value={p.price} unitClass="font-sans" /></div>
            <div className="text-xs text-ink-400">{num(p.durationDays)} روزه · {num(Math.round(((p.credit - p.price) / p.price) * 100))}٪ اعتبار هدیه</div>
            <ul className="mt-6 flex-1 space-y-3 border-t hairline pt-5 text-[13px] text-ink-600 dark:text-ink-300">
              {p.perks.map((perk) => (
                <li key={perk} className="flex gap-2"><Check size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-brand-500" /> {perk}</li>
              ))}
            </ul>
            <Button className="mt-6 w-full" variant={p.popular ? 'primary' : 'outline'} onClick={() => setBuy(p.id)}>
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
              <button key={a} onClick={() => setAmount(a)} className={clsx('rounded-2xl border p-3 text-sm font-semibold', amount === a ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-gold-400 dark:bg-gold-400/10 dark:text-gold-300' : 'border-ink-200 dark:border-white/10')}>
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
              const ok = await runOk(() => topUp(amount), 'کیف پول شارژ شد')
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
                const ok = await runOk(() => buySubscription(p.id), `اشتراک ${p.name} فعال شد`)
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
