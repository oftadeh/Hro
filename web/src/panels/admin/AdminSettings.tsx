import { useState } from 'react'
import { useDB } from '@/core/db'
import { MODULE_LABEL } from '@/core/config'
import { broadcast, saveCoupon, setCommission, setPlatformSetting, setVenueKinds } from '@/core/services/admin'
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
  const num0 = (k: 'shippingFee' | 'freeShippingOver' | 'referralReward' | 'orgDiscountPct') => settings[k] ?? 0
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
        <p className="w-full text-[11px] text-ink-400">مجموعه‌های نوع غیرفعال ثبت و تأیید می‌شوند اما تا فعال‌سازی، به ورزشکاران نمایش داده نمی‌شوند.</p>
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
