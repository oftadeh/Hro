import { useState } from 'react'
import { useDB } from '@/core/db'
import { MODULE_LABEL } from '@/core/config'
import { broadcast, setCommission, setPlatformSetting } from '@/core/services/admin'
import type { RevenueModule } from '@/core/types'
import { Button, Card, Field, Input, NumberInput, PageHeader, SectionTitle, Textarea } from '@/ui/kit'
import { run } from '@/ui/toast'

export default function AdminSettings() {
  const settings = useDB((s) => s.settings)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
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
                <input type="range" min={0} max={50} value={settings.commissions[m]} onChange={(e) => setCommission(m, +e.target.value)} className="w-40 accent-emerald-500" />
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
          </Card>
          <Card className="space-y-3">
            <div className="font-extrabold">📣 ارسال اعلان همگانی</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان" />
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="متن اعلان" />
            <Button className="w-full" disabled={!title.trim()} onClick={() => { run(() => broadcast(title, body), 'اعلان ارسال شد'); setTitle(''); setBody('') }}>ارسال به همه‌ی کاربران</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
