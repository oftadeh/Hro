import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { REMOTE, api } from '@/core/client/remote'
import { previewCoupon } from '@/core/services/commerce'
import { Input } from '@/ui/kit'
import { toast } from '@/ui/toast'
import { ArrowDownLeft, ArrowUpRight, Check, CreditCard, Plus, Ticket } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { ROLE_META, SUBSCRIPTION_PLANS } from '@/core/config'
import { isBusiness, primaryBusinessRole } from '@/core/roles'
import { daysLeft, num, toman } from '@/core/format'
import { activeSubscription, buySubscription, startTrial, topUp, trialBlocker } from '@/core/services/wallet'
import { Button, Card, Field, HeroHeader, MetricRow, Money, NumberInput, PageHeader, SectionTitle, Sheet } from '@/ui/kit'
import { KeyCard } from '@/ui/KeyCard'
import { useMe, useBalance } from '@/ui/hooks'
import { run, runOk } from '@/ui/toast'
import { TxList } from './TxList'
import { CardIcon, LiveTiles } from '@/ui/live'
import { moment } from '@/ui/moments'

const AMOUNTS = [200_000, 500_000, 1_000_000, 2_000_000]

export default function WalletPage() {
  const me = useMe()!
  const bal = useBalance(me.id)
  const txs = useDB((s) => s.transactions)
  useDB((s) => s.subscriptions)
  const sub = activeSubscription(me.id)
  const settings = useDB((s) => s.settings)
  const trial = settings.trial ?? { enabled: false, credit: 0, days: 0 }
  const trialWhy = trialBlocker(me.id)
  // حساب کسب‌وکار عضویت ورزشکاری نمی‌خرد؛ درآمد و تسویه‌اش در پنل است
  const biz = isBusiness(me)
  const bizRole = biz ? primaryBusinessRole(me) : undefined
  const financeLink = bizRole ? (bizRole === 'company' ? ROLE_META.company.panel : `${ROLE_META[bizRole].panel}/finance`) : ''
  const [charge, setCharge] = useState(false)
  const [amount, setAmount] = useState(500_000)
  const [busy, setBusy] = useState(false)
  const [buy, setBuy] = useState<string>()
  const [coupon, setCoupon] = useState('')
  const [couponAmt, setCouponAmt] = useState(0)
  const [params, setParams] = useSearchParams()
  // بازگشت از درگاه بانکی
  useEffect(() => {
    const st = params.get('pay')
    if (!st) return
    if (st === 'ok') moment('pay', { title: 'کیف پول شارژ شد', sub: params.get('ref') ? `کد پیگیری ${params.get('ref')}` : undefined })
    else toast.error('پرداخت ناموفق بود یا لغو شد؛ مبلغی کسر نشده است')
    setParams({}, { replace: true })
  }, [params, setParams])
  // کسر پول هنگام باز بودن کیف پول: آرام و بدون جشن
  const lastBal = useRef(bal)
  useEffect(() => {
    if (bal < lastBal.current && !buy) moment('debit', { title: `− ${toman(lastBal.current - bal)}`, sub: 'از کیف پول کسر شد' })
    lastBal.current = bal
  }, [bal]) // eslint-disable-line react-hooks/exhaustive-deps
  const coins = Array.from({ length: 12 }, (_, i) => ({ on: i < Math.min(12, Math.round(bal / 50_000)), y: true, back: '$' }))
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
          {/* سکه‌های زنده: هر سکه ۵۰ هزار تومان موجودی؛ با پرداخت برمی‌گردند و با شارژ اضافه می‌شوند */}
          <CardIcon name="wallet" playKey={bal} />
          <LiveTiles round tiles={coins} className="!bottom-auto !top-[70px] !h-[96px] max-sm:!top-[64px]" />
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
            {biz ? (
              <Link to={financeLink} className="flex h-11 items-center gap-1.5 rounded-full bg-white/15 px-5 text-sm text-white backdrop-blur transition hover:bg-white/25">
                <CreditCard size={16} strokeWidth={1.5} /> درآمد و تسویه
              </Link>
            ) : (
              <a href="#plans" className="flex h-11 items-center gap-1.5 rounded-full bg-white/15 px-5 text-sm text-white backdrop-blur transition hover:bg-white/25">
                <CreditCard size={16} strokeWidth={1.5} /> عضویت
              </a>
            )}
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
        {biz ? (
          <Card className="flex flex-col justify-center gap-3 text-sm leading-7 text-ink-500">
            <p>درآمد فروش و خدمات شما بعد از کسر کمیسیون در «درآمد و تسویه»ی پنل نمایش داده می‌شود و از همان‌جا درخواست تسویه می‌دهید.</p>
            <Link to={financeLink}><Button className="w-full">رفتن به درآمد و تسویه</Button></Link>
          </Card>
        ) : (
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
          {sub && sub.plan.credit > 0 && (
            <Card className="px-4 py-1">
              <MetricRow tone="amber" icon={<Ticket size={17} />} title="مصرف اعتبار ورود" value={`${num(Math.max(0, 1 - sub.credit / sub.plan.credit) * 100)}٪`} progress={Math.max(0, 1 - sub.credit / sub.plan.credit)} />
            </Card>
          )}
          {!sub && trial.enabled && !trialWhy && (
            <Card className="card-lime flex items-center gap-3 text-ink-950">
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-extrabold">{num(trial.days)} روز رایگان امتحان کن</div>
                <p className="mt-0.5 text-[13px] leading-6 opacity-75">{toman(trial.credit)} اعتبار ورود به باشگاه‌های سطح استاندارد، بدون پرداخت. فقط یک بار برای هر شماره.</p>
              </div>
              <Button
                variant="dark"
                onClick={async () => {
                  if (await runOk(() => startTrial(), 'دوره‌ی آزمایشی فعال شد')) moment('unlock', { title: 'دوره‌ی آزمایشی فعال شد', sub: `${toman(trial.credit)} اعتبار ورود` })
                }}
              >
                شروع
              </Button>
            </Card>
          )}
        </div>
        )}
      </div>

      {!biz && (<>
      <div id="plans" /><SectionTitle title="عضویت‌ها" />
      <div className="grid gap-4 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((p, i) => (
          <div key={p.id} className={clsx('relative flex flex-col rounded-[30px] p-6 text-ink-950', ['card-mint', 'card-violet', 'card-peach'][i % 3], p.popular && 'ring-2 ring-ink-950 ring-offset-4 ring-offset-ink-50 dark:ring-white dark:ring-offset-ink-950')}>
            {p.popular && <span className="absolute left-5 top-5 rounded-full bg-ink-950 px-3 py-1 text-[12px] font-bold text-white">پیشنهاد ما</span>}
            <div className="text-[14px] font-bold opacity-70">اشتراک کی‌فیت</div>
            <div className="mt-2 text-[28px] font-black leading-tight">{p.name}</div>
            <div className="mt-3 text-[30px] font-black leading-none"><Money value={p.price} /></div>
            <div className="mt-1 text-[13px] font-semibold opacity-70">{num(p.durationDays)} روزه · {num(Math.round(((p.credit - p.price) / p.price) * 100))}٪ اعتبار هدیه</div>
            <ul className="mt-5 flex-1 space-y-2.5 border-t border-ink-950/10 pt-5 text-[14px]">
              {p.perks.map((perk) => (
                <li key={perk} className="flex gap-2"><Check size={16} strokeWidth={2.2} className="mt-0.5 shrink-0" /> {perk}</li>
              ))}
            </ul>
            <Button className="mt-6 w-full" variant="dark" onClick={() => setBuy(p.id)}>
              {sub?.planId === p.id ? 'تمدید' : 'خرید'}
            </Button>
          </div>
        ))}
      </div>
      </>)}

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
              if (REMOTE) {
                // انتقال به درگاه بانکی؛ پس از پرداخت به همین صفحه برمی‌گردد
                const ok = await runOk(async () => {
                  const r = await api<{ url: string }>('/pay/start', { amount })
                  location.href = r.url
                })
                if (!ok) setBusy(false)
                return
              }
              const ok = await runOk(() => topUp(amount))
              setBusy(false)
              if (ok) {
                setCharge(false)
                moment('pay', { title: 'کیف پول شارژ شد', sub: toman(amount) })
              }
            }}
          >
            پرداخت از درگاه بانکی
          </Button>
          <p className="text-center text-[12px] text-ink-400">{REMOTE ? 'پرداخت امن از طریق درگاه شاپرک' : 'در نسخه‌ی آزمایشی، پرداخت شبیه‌سازی می‌شود.'}</p>
        </div>
      </Sheet>

      <Sheet open={!!buy} onClose={() => setBuy(undefined)} title="خرید اشتراک">
        {buy && (() => {
          const p = SUBSCRIPTION_PLANS.find((x) => x.id === buy)!
          return (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">اشتراک {p.name} — {toman(p.price)} از کیف پول کسر و {toman(p.credit)} اعتبار ورود دریافت می‌کنید.</p>
              <div className="flex gap-2">
                <Input value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponAmt(0) }} placeholder="کد تخفیف (اختیاری)" dir="ltr" className="text-left" />
                <Button variant="secondary" onClick={async () => setCouponAmt((await run(() => previewCoupon(coupon, 'subscription', p.price))) ?? 0)}>اعمال</Button>
              </div>
              {couponAmt > 0 && <div className="text-xs text-aqua-600 dark:text-aqua-400">تخفیف کد: {toman(couponAmt)} — مبلغ نهایی {toman(p.price - couponAmt)}</div>}
              <div className="text-xs text-ink-400">موجودی: {toman(bal)}</div>
              <Button className="w-full" size="lg" onClick={async () => {
                const ok = await runOk(() => buySubscription(p.id, couponAmt ? coupon : undefined))
                if (ok) moment('pay', { title: `اشتراک ${p.name} فعال شد`, sub: `${toman(p.price - couponAmt)} از کیف پول کسر شد` })
                if (ok) {
                  setBuy(undefined)
                  setCoupon('')
                }
              }}>
                پرداخت از کیف پول
              </Button>
              <Link to="/invite" className="block text-center text-xs text-ink-500 underline">خرید این اشتراک به‌عنوان هدیه</Link>
              {bal < p.price && <Button variant="secondary" className="w-full" onClick={() => { setBuy(undefined); setAmount(p.price - bal); setCharge(true) }}>شارژ کیف پول ({toman(p.price - bal)})</Button>}
            </div>
          )
        })()}
      </Sheet>
    </div>
  )
}
