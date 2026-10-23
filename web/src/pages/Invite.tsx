import { useState } from 'react'
import { Copy, Gift, Share2, UserPlus } from 'lucide-react'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { SUBSCRIPTION_PLANS } from '@/core/config'
import { giftSubscription, redeemGift } from '@/core/services/wallet'
import { Button, Card, Field, Input, PageHeader, SectionTitle, Select, Textarea } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { run, runOk, toast } from '@/ui/toast'

export default function Invite() {
  const me = useMe()!
  const settings = useDB((s) => s.settings)
  const users = useDB((s) => s.users)
  const gifts = useDB((s) => s.giftCards)
  const bal = useBalance(me.id)
  const invited = users.filter((u) => u.referredBy === me.id)
  const link = `${location.origin}/?ref=${me.referralCode ?? ''}`
  const [g, setG] = useState({ planId: SUBSCRIPTION_PLANS[0].id, phone: '', message: '' })
  const [code, setCode] = useState(new URLSearchParams(location.search).get('gift') ?? '')
  const [sent, setSent] = useState('')
  const myGifts = gifts.filter((x) => x.fromId === me.id)
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === g.planId)!
  const share = async () => {
    const text = `با کد ${me.referralCode} در کی‌فیت عضو شو و ${toman(settings.referralReward ?? 0)} هدیه بگیر! ${link}`
    try {
      if (navigator.share) await navigator.share({ title: 'کی‌فیت', text, url: link })
      else {
        await navigator.clipboard.writeText(text)
        toast.success('متن دعوت کپی شد')
      }
    } catch {
      /* لغو */
    }
  }
  return (
    <div className="animate-fade-up">
      <PageHeader back title="دعوت و هدیه" />
      <div className="rounded-[2rem] grad-peach p-6 text-ink-950">
        <UserPlus size={22} />
        <div className="mt-3 font-display text-[2rem] leading-[1.1]">دوستانت را دعوت کن</div>
        <p className="mt-2 text-xs leading-6 opacity-70">با اولین خرید اشتراک دوستت، به هر دو نفر {toman(settings.referralReward ?? 0)} اعتبار کیف پول هدیه داده می‌شود.</p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/60 p-3">
          <span className="flex-1 font-display text-2xl tracking-widest" dir="ltr">{me.referralCode}</span>
          <Button size="sm" variant="dark" icon={<Copy size={14} />} onClick={() => { navigator.clipboard?.writeText(me.referralCode ?? ''); toast.success('کد کپی شد') }}>کپی</Button>
        </div>
        <Button className="mt-3 w-full" variant="dark" icon={<Share2 size={16} />} onClick={share}>ارسال دعوت‌نامه</Button>
        <div className="mt-3 text-center text-xs opacity-70">{num(invited.length)} دوست با کد تو عضو شده‌اند · {num(invited.filter((u) => u.referralRewarded).length)} پاداش گرفته‌ای</div>
      </div>

      <SectionTitle title="اشتراک هدیه" />
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-sm font-medium"><Gift size={16} className="text-coral-400" /> یک ماه سلامتی هدیه بده</div>
        <Field label="پلن">
          <Select value={g.planId} onChange={(e) => setG({ ...g, planId: e.target.value })}>
            {SUBSCRIPTION_PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} — {toman(p.price)}</option>)}
          </Select>
        </Field>
        <Field label="شماره موبایل گیرنده"><Input value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} dir="ltr" inputMode="tel" placeholder="09…" className="text-left" /></Field>
        <Field label="پیام (اختیاری)"><Textarea rows={2} value={g.message} onChange={(e) => setG({ ...g, message: e.target.value })} /></Field>
        <Button className="w-full" disabled={bal < plan.price} onClick={async () => { const c = await run(() => giftSubscription(g.planId, g.phone, g.message), 'هدیه خریداری شد'); if (c) { setSent(c); setG({ ...g, phone: '', message: '' }) } }}>
          پرداخت {toman(plan.price)} از کیف پول
        </Button>
        {bal < plan.price && <div className="text-center text-[11px] text-ink-400">موجودی کیف پول: {toman(bal)}</div>}
        {sent && (
          <div className="rounded-2xl bg-aqua-400/10 p-3 text-center text-xs">
            کد هدیه: <b dir="ltr" className="text-base">{sent}</b>
            <div className="mt-1 text-ink-500">اگر گیرنده عضو کی‌فیت باشد اعلان دریافت می‌کند؛ کد را برایش بفرستید.</div>
          </div>
        )}
        {myGifts.length > 0 && <div className="text-[11px] text-ink-400">{num(myGifts.length)} هدیه خریده‌ای · {num(myGifts.filter((x) => x.redeemedBy).length)} فعال‌شده</div>}
      </Card>

      <SectionTitle title="کد هدیه داری؟" />
      <Card className="flex gap-2 p-4">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="کد هدیه" dir="ltr" className="text-left" />
        <Button onClick={async () => { if (await runOk(() => redeemGift(code), 'اشتراک هدیه فعال شد!')) setCode('') }}>فعال‌سازی</Button>
      </Card>
    </div>
  )
}
