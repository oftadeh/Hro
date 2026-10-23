import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Plus, Trophy, Users } from 'lucide-react'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { SUBSCRIPTION_PLANS } from '@/core/config'
import { addSeats, createOrg, orgLeaderboard, removeMember, renewOrg, seatPrice } from '@/core/services/org'
import { Avatar, Button, Card, Field, Input, NumberInput, PageHeader, SectionTitle, Select, Stat } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { run, runOk, toast } from '@/ui/toast'

/** پنل مسئول منابع انسانی: خرید صندلی، مدیریت اعضا و گزارش سلامت گروهی (بدون نمایش اطلاعات فردی سلامت) */
export default function CompanyPanel() {
  const me = useMe()!
  const state = useDB((s) => s)
  const bal = useBalance(me.id)
  const org = state.orgs.find((o) => o.adminId === me.id)
  const [f, setF] = useState({ name: '', planId: SUBSCRIPTION_PLANS[0].id, seats: 10 })
  const [more, setMore] = useState(5)

  if (!org) {
    const price = seatPrice(f.planId, state)
    return (
      <div className="animate-fade-up">
        <PageHeader title="برنامه‌ی سلامت سازمانی" subtitle={`اشتراک گروهی کی‌فیت برای کارکنان با ${num(state.settings.orgDiscountPct ?? 0)}٪ تخفیف`} />
        <Card className="max-w-lg space-y-3 p-5">
          <Field label="نام سازمان"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="پلن کارکنان">
            <Select value={f.planId} onChange={(e) => setF({ ...f, planId: e.target.value })}>
              {SUBSCRIPTION_PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} — هر نفر {toman(seatPrice(p.id, state))}</option>)}
            </Select>
          </Field>
          <Field label="تعداد کارکنان"><NumberInput value={f.seats} onChange={(v) => setF({ ...f, seats: v })} /></Field>
          <div className="flex justify-between rounded-2xl bg-ink-900/[.04] p-3 text-sm dark:bg-white/[.05]"><span>جمع</span><b>{toman(price * f.seats)}</b></div>
          <Button className="w-full" disabled={bal < price * f.seats} onClick={() => run(() => createOrg(f.name, f.planId, f.seats), 'سازمان ثبت شد')}>پرداخت و فعال‌سازی</Button>
          <div className="text-center text-[11px] text-ink-400">موجودی کیف پول: {toman(bal)} · <Link to="/wallet" className="underline">شارژ</Link></div>
        </Card>
      </div>
    )
  }

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === org.planId)!
  const board = orgLeaderboard(org.id, state)
  const weekXp = board.reduce((a, x) => a + x.xp, 0)
  const activeWeek = board.filter((x) => x.xp > 0).length
  return (
    <div className="animate-fade-up">
      <PageHeader title={org.name} subtitle={`پلن ${plan.name} · ${num(org.members.length)} از ${num(org.seats)} صندلی`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="اعضا" value={`${num(org.members.length)}/${num(org.seats)}`} icon={<Users size={18} />} />
        <Stat label="فعال این هفته" value={num(activeWeek)} icon={<Trophy size={18} />} tone="emerald" />
        <Stat label="امتیاز فعالیت تیم (هفته)" value={num(weekXp)} tone="violet" />
        <Stat label="موجودی کیف پول" value={toman(bal)} tone="amber" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-medium">کد عضویت کارکنان</div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-ink-900/[.04] p-3 dark:bg-white/[.05]">
            <span className="flex-1 font-display text-3xl tracking-widest" dir="ltr">{org.code}</span>
            <Button size="sm" variant="secondary" icon={<Copy size={14} />} onClick={() => { navigator.clipboard?.writeText(org.code); toast.success('کد کپی شد') }}>کپی</Button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-ink-500">کارکنان در اپ کی‌فیت ← پروفایل ← «اشتراک سازمانی» این کد را وارد می‌کنند و اشتراک‌شان فوراً فعال می‌شود.</p>
          <div className="mt-4 flex gap-2">
            <NumberInput value={more} onChange={setMore} />
            <Button variant="secondary" icon={<Plus size={14} />} onClick={() => runOk(() => addSeats(more), 'صندلی اضافه شد')}>افزودن صندلی ({toman(seatPrice(org.planId, state) * more)})</Button>
          </div>
          <Button className="mt-2 w-full" variant="outline" onClick={() => confirm(`تمدید اشتراک ${org.members.length} عضو؟`) && runOk(() => renewOrg(), 'اشتراک همه‌ی اعضا تمدید شد')}>
            تمدید دوره برای همه ({toman(seatPrice(org.planId, state) * org.members.length)})
          </Button>
          <Link to="/challenges/new"><Button className="mt-2 w-full" variant="secondary">ساخت چالش داخلی سازمان</Button></Link>
        </Card>
        <Card className="p-5">
          <SectionTitle title="رتبه‌بندی هفتگی" />
          <div className="-mt-2 space-y-1">
            {board.map((x, i) => (
              <div key={x.user.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="w-5 text-center text-ink-400">{num(i + 1)}</span>
                <Avatar name={x.user.name} src={x.user.avatar} size={28} />
                <span className="flex-1 truncate">{x.user.name}</span>
                <span className="text-xs tabular-nums">{num(x.xp)}</span>
                {x.user.id !== me.id && (
                  <button className="text-[11px] text-coral-500" onClick={() => confirm(`${x.user.name} از سازمان حذف شود؟`) && run(() => removeMember(x.user.id), 'عضو حذف شد')}>حذف</button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-ink-400">به احترام حریم خصوصی، اطلاعات سلامت فردی کارکنان به سازمان نمایش داده نمی‌شود؛ فقط آمار تجمیعی.</p>
        </Card>
      </div>
    </div>
  )
}
