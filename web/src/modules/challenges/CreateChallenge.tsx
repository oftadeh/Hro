import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { GRADIENTS } from '@/core/config'
import { toman } from '@/core/format'
import { createChallenge, type NewChallenge } from '@/core/services/challenges'
import type { ChallengeMetric, Prize } from '@/core/types'
import { Button, Card, Cover, Field, Input, NumberInput, PageHeader, Select, Textarea } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { run } from '@/ui/toast'

const METRICS: Record<ChallengeMetric, { label: string; unit: string; emoji: string }> = {
  steps: { label: 'تعداد قدم', unit: 'قدم', emoji: '👟' },
  workouts: { label: 'تعداد جلسات تمرین', unit: 'جلسه', emoji: '🔥' },
  minutes: { label: 'دقیقه‌ی تمرین', unit: 'دقیقه', emoji: '⏱️' },
  km: { label: 'مسافت (دویدن/دوچرخه)', unit: 'کیلومتر', emoji: '🏅' },
  weight_loss: { label: 'کاهش وزن', unit: 'کیلوگرم', emoji: '⚖️' },
  custom: { label: 'سفارشی', unit: 'امتیاز', emoji: '⭐' },
}

const PRIZE_PRESETS: Record<string, Prize[]> = {
  winner: [{ rank: 1, title: 'نفر اول', percent: 100 }],
  top2: [{ rank: 1, title: 'نفر اول', percent: 60 }, { rank: 2, title: 'نفر دوم', percent: 40 }],
  top3: [{ rank: 1, title: 'نفر اول', percent: 50 }, { rank: 2, title: 'نفر دوم', percent: 30 }, { rank: 3, title: 'نفر سوم', percent: 20 }],
}

export default function CreateChallenge() {
  const me = useMe()!
  const nav = useNavigate()
  const fee = useDB((s) => s.settings.challengeCreationFee)
  const commission = useDB((s) => s.settings.commissions.challenge)
  const bal = useBalance(me.id)
  const [f, setF] = useState<NewChallenge & { preset: string }>({
    title: '', description: '', metric: 'steps', unit: 'قدم', goal: 100_000, entryFee: 50_000, sponsorPrize: 0, extraReward: '',
    prizes: PRIZE_PRESETS.top3, xpReward: 200, gradient: GRADIENTS[0], emoji: '👟', maxParticipants: 200, days: 30, preset: 'top3',
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))
  const total = fee + f.sponsorPrize

  return (
    <div className="animate-fade-up">
      <PageHeader back="/challenges" title="ساخت چالش جدید" subtitle="چالش خودت رو بساز و درآمد ورودی‌ها رو به جایزه تبدیل کن" />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="space-y-4">
          <Field label="عنوان چالش">
            <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="مثلاً: ۱۰۰ هزار قدم در ۲ هفته" />
          </Field>
          <Field label="توضیحات و قوانین">
            <Textarea value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="شرکت‌کننده‌ها چطور امتیاز می‌گیرن؟" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="معیار امتیاز">
              <Select
                value={f.metric}
                onChange={(e) => {
                  const m = e.target.value as ChallengeMetric
                  setF((s) => ({ ...s, metric: m, unit: METRICS[m].unit, emoji: METRICS[m].emoji }))
                }}
              >
                {Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </Select>
            </Field>
            <Field label={`هدف (${f.unit})`}>
              <NumberInput value={f.goal} onChange={(v) => set('goal', v)} />
            </Field>
            <Field label="مدت چالش (روز)">
              <NumberInput value={f.days} onChange={(v) => set('days', Math.max(1, v))} />
            </Field>
            <Field label="حداکثر شرکت‌کننده">
              <NumberInput value={f.maxParticipants} onChange={(v) => set('maxParticipants', v)} />
            </Field>
            <Field label="هزینه‌ی ورودی (تومان)" hint={`${commission}٪ کمیسیون کی‌فیت کسر و بقیه به صندوق جایزه می‌رود`}>
              <NumberInput value={f.entryFee} onChange={(v) => set('entryFee', v)} />
            </Field>
            <Field label="جایزه‌ی نقدی اسپانسر (اختیاری)" hint="از کیف پول شما به صندوق اضافه می‌شود">
              <NumberInput value={f.sponsorPrize} onChange={(v) => set('sponsorPrize', v)} />
            </Field>
          </div>
          <Field label="تقسیم جوایز">
            <Select
              value={f.preset}
              onChange={(e) => setF((s) => ({ ...s, preset: e.target.value, prizes: PRIZE_PRESETS[e.target.value] }))}
            >
              <option value="winner">همه برای نفر اول</option>
              <option value="top2">۲ نفر اول (۶۰٪ / ۴۰٪)</option>
              <option value="top3">۳ نفر اول (۵۰٪ / ۳۰٪ / ۲۰٪)</option>
            </Select>
          </Field>
          <Field label="جایزه‌ی غیرنقدی (اختیاری)">
            <Input value={f.extraReward} onChange={(e) => set('extraReward', e.target.value)} placeholder="مثلاً: یک ماه برنامه‌ی رایگان" />
          </Field>
          <Field label="رنگ کاور">
            <div className="flex flex-wrap gap-2">
              {GRADIENTS.map((g) => (
                <button key={g} onClick={() => set('gradient', g)} className={clsx('h-10 w-10 rounded-xl bg-gradient-to-br', g, f.gradient === g && 'ring-4 ring-brand-400 ring-offset-2 dark:ring-offset-ink-900')} aria-label="رنگ" />
              ))}
            </div>
          </Field>
        </Card>

        <div className="space-y-4">
          <Cover gradient={f.gradient} className="rounded-[1.75rem]">
            <div className="flex flex-col items-center p-6 text-center text-white">
              <div className="text-6xl">{f.emoji}</div>
              <div className="mt-2 font-black">{f.title || 'عنوان چالش'}</div>
              <div className="text-xs opacity-80">{f.days} روز · هدف {f.goal.toLocaleString('fa-IR')} {f.unit}</div>
            </div>
          </Cover>
          <Card className="space-y-2 text-sm">
            <div className="flex justify-between"><span>هزینه‌ی ایجاد چالش</span><b>{toman(fee)}</b></div>
            <div className="flex justify-between"><span>جایزه‌ی اسپانسر</span><b>{toman(f.sponsorPrize)}</b></div>
            <div className="flex justify-between border-t border-ink-100 pt-2 dark:border-white/10"><span>جمع پرداختی</span><b className="text-lg">{toman(total)}</b></div>
            <div className="text-xs text-ink-400">موجودی کیف پول: {toman(bal)}</div>
            <Button
              size="lg"
              className="!mt-4 w-full"
              onClick={async () => {
                const { preset: _preset, ...data } = f
                const id = await run(() => createChallenge(data), 'چالش ساخته شد! 🎉')
                if (id) nav(`/challenges/${id}`)
              }}
            >
              پرداخت و انتشار چالش
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
