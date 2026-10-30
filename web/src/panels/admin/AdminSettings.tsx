import { useState } from 'react'
import { useDB } from '@/core/db'
import { DEFAULT_TIER_CAPS, MODULE_LABEL } from '@/core/config'
import { broadcast, saveCoupon, setCommission, setPlatformSetting, setTierCaps, setTrial, setVenueKinds } from '@/core/services/admin'
import { VENUE_KINDS } from '@/core/config'
import type { VenueKind } from '@/core/types'
import type { Coupon } from '@/core/types'
import { faDate, num } from '@/core/format'
import type { RevenueModule } from '@/core/types'
import { Badge, Button, Card, Field, Input, NumberInput, PageHeader, SectionTitle, Select, Textarea } from '@/ui/kit'
import { run } from '@/ui/toast'

export default function AdminSettings() {
  const settings = useDB((s) => s.settings)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const coupons = useDB((s) => s.coupons)
  const [cp, setCp] = useState<Partial<Coupon>>({ code: '', pct: 10, maxAmount: 200_000, module: 'all', maxUses: 100 })
  const num0 = (k: 'shippingFee' | 'freeShippingOver' | 'referralReward' | 'orgDiscountPct' | 'lateCancelFeePct') => settings[k] ?? 0
  const trial = settings.trial ?? { enabled: false, credit: 300_000, days: 7 }
  const caps = settings.tierCaps ?? DEFAULT_TIER_CAPS
  const [capsDraft, setCapsDraft] = useState(caps)
  return (
    <div className="animate-fade-up">
      <PageHeader title="کمیسیون و تنظیمات" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="درصد کمیسیون هر ماژول" />
          <div className="space-y-3">
            {(Object.keys(MODULE_LABEL) as RevenueModule[]).map((m) => (
              <div key={m} className="flex items-center gap-3">
                <span className="flex-1 text-sm">{MODULE_LABEL[m]}</span>
                <input type="range" min={0} max={50} value={settings.commissions[m]} onChange={(e) => setCommission(m, +e.target.value)} className="w-40 accent-brand-500" />
                <b className="w-12 text-left">٪{settings.commissions[m].toLocaleString('fa-IR')}</b>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="space-y-3">
            <Field label="هزینه‌ی ایجاد چالش (تومان)">
              <NumberInput value={settings.challengeCreationFee} onChange={(v) => setPlatformSetting('challengeCreationFee', v)} />
            </Field>
            <Field label="حداقل مبلغ تسویه (تومان)">
              <NumberInput value={settings.minWithdraw} onChange={(v) => setPlatformSetting('minWithdraw', v)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="هزینه‌ی ارسال فروشگاه">
                <NumberInput value={num0('shippingFee')} onChange={(v) => setPlatformSetting('shippingFee', v)} />
              </Field>
              <Field label="ارسال رایگان از مبلغ">
                <NumberInput value={num0('freeShippingOver')} onChange={(v) => setPlatformSetting('freeShippingOver', v)} />
              </Field>
              <Field label="پاداش معرفی (هر طرف)">
                <NumberInput value={num0('referralReward')} onChange={(v) => setPlatformSetting('referralReward', v)} />
              </Field>
              <Field label="تخفیف سازمانی (٪)">
                <NumberInput value={num0('orgDiscountPct')} onChange={(v) => setPlatformSetting('orgDiscountPct', v)} />
              </Field>
              <Field label="هزینه‌ی لغو دیرهنگام (٪)" hint="سهم باشگاه وقتی کمتر از ۲ ساعت به کلاس لغو شود">
                <NumberInput value={num0('lateCancelFeePct')} onChange={(v) => setPlatformSetting('lateCancelFeePct', v)} />
              </Field>
            </div>
            <div className="rounded-2xl bg-ink-900/[.04] p-3 dark:bg-white/[.05]">
              <div className="text-sm font-semibold">سطح باشگاه‌ها بر اساس قیمت سانس</div>
              <p className="mt-1 text-xs leading-6 text-ink-500">نقره‌ای فقط استاندارد، طلایی استاندارد و ویژه، الماس همه‌ی سطح‌ها را پوشش می‌دهد. بقیه با کیف پول.</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="سقف استاندارد (تومان)"><NumberInput value={capsDraft.standard} onChange={(v) => setCapsDraft({ ...capsDraft, standard: v })} /></Field>
                <Field label="سقف ویژه (تومان)" hint="بیشتر از این: لوکس"><NumberInput value={capsDraft.premium} onChange={(v) => setCapsDraft({ ...capsDraft, premium: v })} /></Field>
              </div>
              <Button size="sm" variant="secondary" className="mt-2" disabled={capsDraft.standard === caps.standard && capsDraft.premium === caps.premium} onClick={() => run(() => setTierCaps(capsDraft), 'سطح‌ها ذخیره شد')}>ذخیره‌ی سطح‌ها</Button>
            </div>
            <div className="rounded-2xl bg-ink-900/[.04] p-3 dark:bg-white/[.05]">
              <label className="flex items-center justify-between gap-3 text-sm font-semibold">
                دوره‌ی آزمایشی رایگان (یک بار برای هر شماره)
                <input type="checkbox" checked={trial.enabled} onChange={(e) => run(() => setTrial({ ...trial, enabled: e.target.checked }))} className="h-5 w-5 accent-brand-500" />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="اعتبار (تومان)"><NumberInput value={trial.credit} onChange={(v) => run(() => setTrial({ ...trial, credit: v }))} /></Field>
                <Field label="مدت (روز)"><NumberInput value={trial.days} onChange={(v) => run(() => setTrial({ ...trial, days: v }))} /></Field>
              </div>
            </div>
          </Card>
          <Card className="space-y-3">
            <div className="font-semibold">ارسال اعلان همگانی</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان" />
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="متن اعلان" />
            <Button className="w-full" disabled={!title.trim()} onClick={() => { run(() => broadcast(title, body), 'اعلان ارسال شد'); setTitle(''); setBody('') }}>ارسال به همه‌ی کاربران</Button>
          </Card>
        </div>
      </div>

      <SectionTitle title="انواع مجموعه‌های فعال در فیت‌یاب (فازبندی)" />
      <Card className="flex flex-wrap gap-2 p-4">
        {(Object.keys(VENUE_KINDS) as VenueKind[]).map((k) => {
          const on = (settings.venueKinds ?? ['gym']).includes(k)
          return (
            <button
              key={k}
              onClick={() => run(() => setVenueKinds(on ? (settings.venueKinds ?? ['gym']).filter((x) => x !== k) : [...(settings.venueKinds ?? ['gym']), k]), `${VENUE_KINDS[k].plural} ${on ? 'غیرفعال' : 'فعال'} شد`)}
              className={`rounded-full px-4 py-2 text-xs transition ${on ? 'grad-mint font-medium text-ink-950' : 'bg-ink-900/[.05] text-ink-500 dark:bg-white/[.06]'}`}
            >
              {VENUE_KINDS[k].plural}
            </button>
          )
        })}
        <p className="w-full text-[12px] text-ink-400">مجموعه‌های نوع غیرفعال ثبت و تأیید می‌شوند اما تا فعال‌سازی، به ورزشکاران نمایش داده نمی‌شوند.</p>
      </Card>

      <SectionTitle title="کدهای تخفیف" />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="کد">
              <Input value={cp.code} onChange={(e) => setCp({ ...cp, code: e.target.value.toUpperCase() })} dir="ltr" placeholder="NOWRUZ30" />
            </Field>
            <Field label="بخش">
              <Select value={cp.module} onChange={(e) => setCp({ ...cp, module: e.target.value as Coupon['module'] })}>
                <option value="all">همه</option>
                <option value="shop">فروشگاه</option>
                <option value="buffet">بوفه</option>
                <option value="subscription">اشتراک</option>
              </Select>
            </Field>
            <Field label="درصد">
              <NumberInput value={cp.pct ?? 0} onChange={(v) => setCp({ ...cp, pct: v })} />
            </Field>
            <Field label="سقف تخفیف (تومان)">
              <NumberInput value={cp.maxAmount ?? 0} onChange={(v) => setCp({ ...cp, maxAmount: v })} />
            </Field>
            <Field label="تعداد استفاده">
              <NumberInput value={cp.maxUses ?? 0} onChange={(v) => setCp({ ...cp, maxUses: v })} />
            </Field>
          </div>
          <Button className="w-full" onClick={() => run(() => saveCoupon(cp), 'کد تخفیف ذخیره شد')}>
            ذخیره‌ی کد
          </Button>
        </Card>
        <Card className="px-4 py-1">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center gap-3 border-b hairline py-3 text-sm last:border-0">
              <b dir="ltr" className="w-28">{c.code}</b>
              <span className="flex-1 text-xs text-ink-500">
                {num(c.pct)}٪ تا {num(c.maxAmount)} تومان · {num(c.usedBy.length)}/{num(c.maxUses)} · تا {faDate(c.expiresAt)}
              </span>
              <button onClick={() => run(() => saveCoupon({ ...c, active: !c.active }))}>
                <Badge color={c.active ? 'emerald' : 'slate'}>{c.active ? 'فعال' : 'غیرفعال'}</Badge>
              </button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
