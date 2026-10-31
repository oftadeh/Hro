/**
 * فیت‌یار روی سرور با Claude. اگر کلید API تنظیم نشده باشد یا درخواست خطا بدهد،
 * مشاور قاعده‌محور داخلی پاسخ می‌دهد تا اپ هیچ‌وقت بدون جواب نماند.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { AIContext, AIMessage, AIProvider, AIReply, WeekStats } from '../src/core/ai/types'
import { localExpert } from '../src/core/ai/localExpert'
import type { User } from '../src/core/types'
import { bodyOf, GOALS, ACTIVITY } from '../src/core/profile'
import { env } from './env'

const client = env.ai.key ? new Anthropic({ apiKey: env.ai.key, maxRetries: 1, timeout: 60_000 }) : null

const SYSTEM = `تو «فیت‌یار»، دستیار سلامت و تناسب اندام اپ کی‌فیت هستی و همیشه به فارسی روان و صمیمی پاسخ می‌دهی.
- برنامه‌های تمرین و تغذیه را دقیق، عملی و متناسب با مشخصات کاربر بده؛ از غذاهای ایرانی و واحدهای آشنا (قاشق، کف دست، لیوان) استفاده کن.
- پاسخ‌ها را کوتاه و قابل‌اجرا نگه دار و از فهرست‌های گلوله‌ای استفاده کن.
- درباره‌ی بیماری، درد، آسیب یا داروها تشخیص نده؛ کاربر را به پزشکان کی‌فیت ارجاع بده.
- اگر کاربر در فاز قاعدگی، باردار یا پس از زایمان است، شدت تمرین را متناسب پیشنهاد کن.
- برای خرید برنامه‌ی اختصاصی، مربیان فیت‌یار؛ برای ورود به باشگاه، فیت‌یاب؛ و برای غذای سالم، بوفه‌ی کی‌فیت را پیشنهاد بده.`

function profileText(u: User) {
  const b = bodyOf(u)
  return [
    u.name && `نام: ${u.name}`,
    u.gender && `جنسیت: ${u.gender === 'female' ? 'زن' : 'مرد'}`,
    b.age && `سن: ${b.age}`,
    u.heightCm && `قد: ${u.heightCm} سانتی‌متر`,
    u.weightKg && `وزن: ${u.weightKg} کیلوگرم`,
    b.bmi && `BMI: ${b.bmi.toFixed(1)}`,
    u.goal && `هدف: ${GOALS[u.goal]}`,
    u.activityLevel && `سطح فعالیت: ${ACTIVITY[u.activityLevel]}`,
    u.health?.injuries && `آسیب‌دیدگی: ${u.health.injuries}`,
    u.health?.conditions && `شرایط خاص: ${u.health.conditions}`,
    u.health?.allergies && `حساسیت غذایی: ${u.health.allergies}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function contextText(ctx?: AIContext) {
  const parts: string[] = []
  if (ctx?.cycle) parts.push(`چرخه‌ی قاعدگی: روز ${ctx.cycle.day}، فاز ${ctx.cycle.phase}، شدت پیشنهادی ${ctx.cycle.intensity}، ${ctx.cycle.daysToNext} روز تا پریود بعدی.`)
  if (ctx?.week) parts.push(`۷ روز اخیر: ${ctx.week.sessions} جلسه تمرین، میانگین ${ctx.week.avgSteps} قدم، خواب ${ctx.week.avgSleep} ساعت، ${ctx.week.avgKcal} کالری، نمره‌ی سلامت ${ctx.week.avgScore}.`)
  return parts.join('\n')
}

async function ask(system: string, messages: Anthropic.Beta.Messages.BetaMessageParam[], extra: Partial<Anthropic.Beta.Messages.MessageCreateParamsNonStreaming> = {}) {
  const res = await client!.beta.messages.create({
    model: env.ai.model,
    max_tokens: 4000,
    system,
    messages,
    output_config: { effort: 'low' },
    // بازگرداندن خودکار درخواست‌های ردشده به مدل جایگزین پیشنهادی Anthropic
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    ...extra,
  })
  if (res.stop_reason === 'refusal') throw new Error('refusal')
  return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim()
}

const SUGGEST = [
  { label: 'مربیان فیت‌یار', link: '/fityar?tab=coaches' },
  { label: 'ثبت تمرین', link: '/workouts' },
]

export const claudeProvider: AIProvider = {
  name: 'claude',
  async reply(history: AIMessage[], profile: User, ctx?: AIContext): Promise<AIReply> {
    if (!client) return localExpert.reply(history, profile, ctx)
    try {
      const text = await ask(
        `${SYSTEM}\n\nمشخصات کاربر:\n${profileText(profile)}\n${contextText(ctx)}`,
        history.map((m) => ({ role: m.role, content: m.text })),
      )
      return { text, suggestions: SUGGEST }
    } catch (e) {
      console.error('AI reply failed', (e as Error).message)
      return localExpert.reply(history, profile, ctx)
    }
  },
  async weekly(profile: User, week: WeekStats): Promise<AIReply> {
    if (!client) return localExpert.weekly(profile, week)
    try {
      const text = await ask(`${SYSTEM}\n\nمشخصات کاربر:\n${profileText(profile)}`, [
        {
          role: 'user',
          content: `این آمار ۷ روز اخیر من است:\n${JSON.stringify(week)}\nیک مرور هفتگی کوتاه بنویس: نمره‌ی کلی، ۲ نقطه‌ی قوت و حداکثر ۳ پیشنهاد مشخص برای هفته‌ی بعد متناسب با هدفم.`,
        },
      ])
      return { text, suggestions: SUGGEST }
    } catch (e) {
      console.error('AI weekly failed', (e as Error).message)
      return localExpert.weekly(profile, week)
    }
  },
  async foodPhoto(dataUrl: string) {
    if (!client) throw new Error('AI disabled')
    const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/)
    if (!m) throw new Error('bad image')
    const text = await ask(
      'You estimate the nutrition of the meal in a photo. Reply with JSON only. Use a short Persian food name. Estimate for the visible portion.',
      [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: m[1] as 'image/jpeg', data: m[2] } },
            { type: 'text', text: 'نام غذا و تخمین کالری، پروتئین، کربوهیدرات و چربی (گرم) این وعده.' },
          ],
        },
      ],
      {
        output_config: {
          effort: 'low',
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: { name: { type: 'string' }, kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' } },
              required: ['name', 'kcal', 'protein', 'carbs', 'fat'],
              additionalProperties: false,
            },
          },
        },
      },
    )
    const r = JSON.parse(text) as { name: string; kcal: number; protein: number; carbs: number; fat: number }
    const n = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)))
    return { name: String(r.name).slice(0, 60), kcal: n(r.kcal, 5000), protein: n(r.protein, 500), carbs: n(r.carbs, 500), fat: n(r.fat, 500) }
  },
}
