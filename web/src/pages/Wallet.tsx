import { useState } from 'react'
import { Check, CreditCard, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { SUBSCRIPTION_PLANS } from '@/core/config'
import { daysLeft, num, toman } from '@/core/format'
import { activeSubscription, buySubscription, topUp } from '@/core/services/wallet'
import { Badge, Button, Card, Field, NumberInput, PageHeader, Progress, SectionTitle, Sheet } from '@/ui/kit'
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

  return (
    <div className="animate-fade-up">
      <PageHeader title="کیف پول و اشتراک" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-6 text-white shadow-glow">
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 right-0 h-48 w-48 rounded-full bg-black/10" />
          <div className="relative">
            <div className="flex items-center justify-between text-sm opacity-90">
              <span>موجودی کیف پول</span>
              <CreditCard size={20} />
            </div>
            <div className="mt-2 text-3xl font-black">{num(bal)} <span className="text-base font-semibold opacity-80">تومان</span></div>
            <div className="mt-6 flex gap-2">
              <Button variant="dark" className="!bg-white !text-ink-900" icon={<Plus size={16} />} onClick={() => setCharge(true)}>شارژ کیف پول</Button>
            </div>
          </div>
        </div>
        <Card className="relative overflow-hidden">
          {sub ? (
            <>
              <div className="flex items-center justify-between">
                <div className={`rounded-xl bg-gradient-to-br ${sub.plan.color} px-3 py-1 text-sm font-black text-ink-900`}>اشتراک {sub.plan.name}</div>
                <Badge color="emerald">فعال</Badge>
              </div>
              <div className="mt-4 text-xs text-ink-500">اعتبار باقی‌مانده برای ورود به باشگاه‌ها</div>
              <div className="text-2xl font-black">{toman(sub.credit)}</div>
              <Progress value={sub.credit / sub.plan.credit} className="mt-2" />
              <div className="mt-2 text-xs text-ink-400">{num(daysLeft(sub.expiresAt))} روز تا پایان اشتراک</div>
            </>
          ) : (
            <div className="flex h-full flex-col justify-center text-center">
              <div className="text-4xl">🔑</div>
              <div className="mt-2 font-bold">اشتراک فعال نداری</div>
              <p className="text-xs text-ink-500">با اشتراک، بیش از هزینه‌ای که می‌دی اعتبار ورود می‌گیری!</p>
            </div>
          )}
        </Card>
      </div>

      <SectionTitle title="✨ پلن‌های اشتراک کی‌فیت" />
      <div className="grid gap-4 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((p) => (
          <Card key={p.id} className={clsx('relative flex flex-col', p.popular && 'ring-2 ring-amber-400')}>
            {p.popular && <Badge color="amber" className="absolute left-4 top-4">محبوب‌ترین</Badge>}
            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${p.color}`} />
            <div className="mt-3 text-lg font-extrabold">{p.name}</div>
            <div className="text-2xl font-black">{toman(p.price)}</div>
            <div className="text-xs text-ink-400">{num(p.durationDays)} روزه · {num(Math.round(((p.credit - p.price) / p.price) * 100))}٪ اعتبار هدیه</div>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {p.perks.map((perk) => (
                <li key={perk} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-500" /> {perk}</li>
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
              <button key={a} onClick={() => setAmount(a)} className={clsx('rounded-2xl border p-3 text-sm font-bold', amount === a ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10' : 'border-ink-200 dark:border-white/10')}>
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
