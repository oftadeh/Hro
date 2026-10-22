/**
 * مشاور هوشمند آفلاین فیت‌یار.
 * محاسبات علمی (BMR به روش میفلین-سنت‌جور، TDEE، درشت‌مغذی‌ها) و قالب‌های
 * برنامه‌ی تمرینی را بدون نیاز به سرور انجام می‌دهد. وقتی سرور LLM در
 * دسترس باشد، httpProvider جایگزین آن می‌شود.
 */
import type { User } from '../types'
import type { AIProvider, AIReply, AISuggestion, WeekStats } from './types'
import { dec, faDigitsToEn, num } from '../format'

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w))

function metrics(u: User) {
  const w = u.weightKg ?? 70
  const h = u.heightCm ?? 170
  const age = u.birthYear ? new Date().getFullYear() - (u.birthYear + 621) : 28
  const female = u.gender === 'female'
  const bmr = 10 * w + 6.25 * h - 5 * age + (female ? -161 : 5)
  const tdee = bmr * 1.55
  const bmi = w / (h / 100) ** 2
  return { w, h, age, bmr, tdee, bmi, complete: !!(u.weightKg && u.heightCm) }
}

function bmiLabel(bmi: number) {
  if (bmi < 18.5) return 'کمبود وزن'
  if (bmi < 25) return 'نرمال'
  if (bmi < 30) return 'اضافه وزن'
  return 'چاقی'
}

function macros(cal: number, w: number, proteinPerKg: number) {
  const protein = Math.round(w * proteinPerKg)
  const fat = Math.round((cal * 0.27) / 9)
  const carbs = Math.round((cal - protein * 4 - fat * 9) / 4)
  return { protein, fat, carbs }
}

function dietPlan(u: User, goal: 'lose' | 'gain' | 'fit'): AIReply {
  const m = metrics(u)
  const cal = goal === 'lose' ? m.tdee - 500 : goal === 'gain' ? m.tdee + 300 : m.tdee
  const mc = macros(cal, m.w, goal === 'gain' ? 2 : 1.8)
  const title = goal === 'lose' ? 'کاهش وزن' : goal === 'gain' ? 'افزایش حجم' : 'حفظ تناسب'
  const text = `**برنامه‌ی تغذیه‌ی ${title}**
${m.complete ? '' : 'قد و وزنت رو در پروفایل وارد نکردی؛ محاسبه با مقادیر پیش‌فرض انجام شد.\n'}
• متابولیسم پایه (BMR): ${num(m.bmr)} کالری
• کالری مصرفی روزانه (TDEE): ${num(m.tdee)} کالری
• **کالری هدف: ${num(cal)} کالری در روز**
• پروتئین: ${num(mc.protein)} گرم | کربوهیدرات: ${num(mc.carbs)} گرم | چربی: ${num(mc.fat)} گرم

**نمونه‌ی یک روز:**
صبحانه: ۲ تخم‌مرغ + ۲ سفیده، ۴۰ گرم جو دوسر، یک موز
میان‌وعده: ماست یونانی + ۱۰ عدد بادام
ناهار: ${goal === 'gain' ? '۸ قاشق' : '۵ قاشق'} برنج، ۱۵۰ گرم مرغ یا ماهی، سالاد
قبل تمرین: یک سیب + ۲ عدد خرما
شام: ۱۵۰ گرم گوشت کم‌چرب یا تن ماهی، سبزیجات بخارپز
${goal === 'gain' ? 'قبل خواب: یک لیوان شیر + کره بادام‌زمینی\n' : ''}
حداقل ${dec(m.w * 0.035)} لیتر آب در روز
${goal === 'lose' ? 'کاهش وزن سالم: نیم تا یک کیلو در هفته' : goal === 'gain' ? 'افزایش وزن هدف: ۲۵۰ تا ۵۰۰ گرم در هفته' : ''}

برای برنامه‌ی کاملاً اختصاصی با در نظر گرفتن سلیقه و آزمایش خونت، از مربیان تغذیه‌ی فیت‌یار کمک بگیر.`
  return {
    text,
    suggestions: [
      { label: 'سفارش غذای رژیمی از بوفه', link: '/buffet' },
      { label: 'مشاوره با مربی تغذیه', link: '/fityar?tab=coaches' },
    ],
  }
}

function workoutPlan(text: string): AIReply {
  const home = has(text, 'خانه', 'منزل', 'بدون وسیله')
  const beginner = has(text, 'مبتدی', 'تازه', 'شروع') || !has(text, 'حرفه', 'پیشرفته')
  const body = home
    ? `**برنامه‌ی تمرین در خانه (۳ روز در هفته)**
هر حرکت ${beginner ? '۳ ست × ۱۰ تکرار' : '۴ ست × ۱۵ تکرار'}، استراحت ۶۰ ثانیه

• اسکات با وزن بدن
• شنای سوئدی (روی زانو برای مبتدی)
• لانج متناوب
• پل باسن (Glute Bridge)
• پلانک ۳۰ تا ۶۰ ثانیه
• برپی ${beginner ? '۸' : '۱۵'} تکرار
پایان: ۱۰ دقیقه طناب یا جامپینگ جک`
    : `**برنامه‌ی ${beginner ? 'فول‌بادی ۳ روزه (مبتدی)' : 'اسپلیت ۴ روزه (متوسط)'}**
${beginner
  ? `روز ۱، ۳ و ۵ — هر حرکت ۳ ست × ۱۰-۱۲
• اسکات هالتر یا گابلت
• پرس سینه دمبل
• زیر بغل سیم‌کش
• سرشانه دمبل نشسته
• ددلیفت رومانیایی
• پلانک ۳ × ۴۵ ثانیه`
  : `روز ۱ — سینه و پشت بازو
• پرس سینه هالتر ۴×۸ • پرس بالا سینه دمبل ۳×۱۰ • قفسه ۳×۱۲ • دیپ ۳×حداکثر
روز ۲ — پشت و جلو بازو
• بارفیکس ۴×حداکثر • زیر بغل هالتر خم ۴×۸ • قایقی ۳×۱۲ • جلو بازو ۳×۱۰
روز ۳ — پا
• اسکات ۵×۵ • پرس پا ۴×۱۲ • ددلیفت رومانیایی ۳×۱۰ • ساق ۴×۱۵
روز ۴ — سرشانه و شکم
• پرس سرشانه ۴×۸ • نشر جانب ۴×۱۵ • فیس‌پول ۳×۱۵ • کرانچ و پلانک`}`
  return {
    text: `${body}

قبل از تمرین ۵-۱۰ دقیقه گرم کن و بعدش حرکات کششی انجام بده.
هر هفته وزنه یا تکرار رو کمی افزایش بده (اضافه‌بار پیشرونده).
حداقل ۷ ساعت خواب برای ریکاوری لازمه.`,
    suggestions: [
      { label: 'پیدا کردن باشگاه نزدیک', link: '/fityab' },
      { label: 'شرکت در چالش ۳۰ روز تمرین', link: '/challenges' },
      { label: 'برنامه‌ی اختصاصی از مربی', link: '/fityar?tab=coaches' },
    ],
  }
}

function answer(raw: string, u: User): AIReply {
  const t = faDigitsToEn(raw)
  const m = metrics(u)

  if (has(t, 'سلام', 'درود', 'hi', 'hello') && t.length < 20)
    return { text: `سلام ${u.name.split(' ')[0]} من فیت‌یار هستم، مشاور هوشمند تغذیه و تمرین. می‌تونی ازم بپرسی:\n• برنامه‌ی رژیم کاهش وزن\n• برنامه‌ی تمرینی حجم یا خانگی\n• کالری و پروتئین مورد نیازت\n• مکمل‌ها، خواب و ریکاوری` }

  if (has(t, 'bmi', 'بی ام آی', 'شاخص توده', 'وزن ایده', 'وزن مناسب'))
    return {
      text: `**شاخص توده‌ی بدنی تو**
BMI: ${m.bmi.toFixed(1)} — ${bmiLabel(m.bmi)}
محدوده‌ی وزن سالم برای قد ${num(m.h)} سانتی‌متر: ${num(18.5 * (m.h / 100) ** 2)} تا ${num(24.9 * (m.h / 100) ** 2)} کیلوگرم.
${m.complete ? '' : '\n برای دقت بیشتر قد و وزنت رو در پروفایل ثبت کن.'}`,
      suggestions: [{ label: 'تکمیل پروفایل', link: '/profile' }],
    }

  if (has(t, 'کالری', 'پروتئین', 'ماکرو', 'درشت مغذی'))
    return dietPlan(u, u.goal ?? 'fit')

  if (has(t, 'لاغر', 'کاهش وزن', 'چربی سوزی', 'چربی‌سوزی', 'چاق', 'شکم', 'کم کردن وزن', 'کاهش چربی'))
    return dietPlan(u, 'lose')

  if (has(t, 'حجم', 'عضله', 'افزایش وزن', 'چاق شدن', 'بالک', 'گین'))
    return has(t, 'تمرین', 'برنامه تمرین', 'باشگاه') ? workoutPlan(t) : dietPlan(u, 'gain')

  if (has(t, 'رژیم', 'تغذیه', 'غذا', 'وعده', 'صبحانه', 'شام', 'ناهار'))
    return dietPlan(u, u.goal ?? 'fit')

  if (has(t, 'تمرین', 'ورزش', 'برنامه', 'باشگاه', 'خانه', 'بدنسازی', 'فیتنس'))
    return workoutPlan(t)

  if (has(t, 'مکمل', 'کراتین', 'وی', 'پروتئین پودر', 'bcaa', 'آمینو'))
    return {
      text: `**راهنمای مکمل‌ها**
• **پروتئین وی:** اگه از غذا به ${num(m.w * 1.8)} گرم پروتئین روزانه نمی‌رسی، ۱-۲ اسکوپ بعد تمرین.
• **کراتین مونوهیدرات:** پرتحقیق‌ترین مکمل؛ روزانه ۳-۵ گرم، هر ساعتی از روز. فاز بارگیری لازم نیست.
• **ویتامین D و امگا ۳:** برای بیشتر ایرانی‌ها مفیده (بعد از آزمایش).
• **BCAA:** اگه پروتئین کافی می‌خوری، ضرورتی نداره.
قبل از مصرف هر مکمل، مخصوصاً اگه بیماری زمینه‌ای داری، با پزشک مشورت کن.`,
      suggestions: [
        { label: 'خرید مکمل اصل از فروشگاه', link: '/shop' },
        { label: 'مشاوره با پزشک ورزشی', link: '/doctors' },
      ],
    }

  if (has(t, 'درد', 'آسیب', 'مصدوم', 'زانو', 'کمر', 'کتف', 'رگ به رگ'))
    return {
      text: `درد و آسیب رو جدی بگیر. تا زمان بررسی:
• تمرین روی ناحیه‌ی آسیب‌دیده رو متوقف کن
• ۴۸ ساعت اول: استراحت، یخ (۱۵ دقیقه هر ۲ ساعت)، بانداژ و بالا نگه داشتن
• اگه درد تیز، تورم شدید، بی‌حسی یا محدودیت حرکتی داری حتماً به پزشک مراجعه کن

من جایگزین پزشک نیستم؛ پزشکان ورزشی کی‌فیت می‌تونن آنلاین ویزیتت کنن.`,
      suggestions: [{ label: 'رزرو ویزیت پزشک ورزشی', link: '/doctors' }],
    }

  if (has(t, 'خواب', 'ریکاوری', 'خستگی', 'استراحت'))
    return { text: `**ریکاوری بهتر**\n• ۷ تا ۹ ساعت خواب منظم\n• ۲ ساعت قبل خواب نور آبی موبایل رو کم کن\n• بعد تمرین سنگین ۲۴-۴۸ ساعت به همون عضله استراحت بده\n• پروتئین کافی و آب فراوان\n• هفته‌ای یک روز ریکاوری فعال: پیاده‌روی یا یوگا`, suggestions: [{ label: 'باشگاه یوگا نزدیک من', link: '/fityab' }] }

  if (has(t, 'آب', 'مایعات'))
    return { text: `برای وزن ${num(m.w)} کیلو، روزانه حدود ${dec(m.w * 0.035)} لیتر (≈ ${num(m.w * 0.035 * 4)} لیوان) آب نیاز داری. روزهای تمرین ۲-۳ لیوان بیشتر. از داشبورد خانه لیوان‌هات رو ثبت کن!`, suggestions: [{ label: 'ثبت آب در داشبورد', link: '/' }] }

  if (has(t, 'دویدن', 'دو ', 'رانینگ', 'کاردیو', 'پیاده'))
    return { text: `**شروع دویدن (۴ هفته)**\nهفته ۱: ۱ دقیقه دو + ۲ دقیقه پیاده × ۸\nهفته ۲: ۲ دقیقه دو + ۱ دقیقه پیاده × ۸\nهفته ۳: ۵ دقیقه دو + ۱ دقیقه پیاده × ۴\nهفته ۴: ۲۰ دقیقه دوی پیوسته \nهفته‌ای ۳ جلسه، با کفش مناسب.`, suggestions: [{ label: 'چالش ماراتن مجازی', link: '/challenges' }, { label: 'کفش رانینگ', link: '/shop' }] }

  return {
    text: `سوال خوبیه برای اینکه دقیق‌تر راهنماییت کنم، کمی بیشتر توضیح بده. مثلاً:\n• «برای کاهش ۵ کیلو وزن چه رژیمی بگیرم؟»\n• «برنامه‌ی تمرینی حجم ۴ روزه می‌خوام»\n• «روزی چقدر پروتئین لازم دارم؟»\n• «تمرین در خانه بدون وسیله»`,
    suggestions: [{ label: 'گفتگو با مربی واقعی', link: '/fityar?tab=coaches' }],
  }
}

const fa = (n: number) => n.toLocaleString('fa-IR')

/** مرور هفتگی قاعده‌محور */
export function weeklyText(profile: User, w: WeekStats): AIReply {
  const good: string[] = []
  const fix: string[] = []
  if (w.sessions >= 3) good.push(`${fa(w.sessions)} جلسه تمرین در هفته — عالی!`)
  else fix.push(`این هفته ${fa(w.sessions)} جلسه تمرین داشتی؛ هدف هفته‌ی بعد را ${fa(Math.max(3, w.sessions + 1))} جلسه بگذار. رزرو یک کلاس گروهی در فیت‌یاب کمک می‌کند تعهدت بیشتر شود.`)
  if (w.avgSteps >= 7000) good.push(`میانگین ${fa(w.avgSteps)} قدم در روز`)
  else fix.push(`میانگین قدم روزانه ${fa(w.avgSteps)} است؛ ۱۰ دقیقه پیاده‌روی بعد از هر وعده حدود ۳۰۰۰ قدم اضافه می‌کند.`)
  if (w.avgSleep && w.avgSleep < 6.5) fix.push(`میانگین خواب ${fa(w.avgSleep)} ساعت است؛ کمبود خواب ریکاوری و اشتها را مختل می‌کند. هدف: ۷ تا ۸ ساعت.`)
  else if (w.avgSleep >= 7) good.push(`خواب منظم (${fa(w.avgSleep)} ساعت)`)
  if (w.avgWater < 6) fix.push(`آب مصرفی (${fa(w.avgWater)} لیوان) کمتر از نیاز است.`)
  if (w.avgKcal === 0) fix.push('هنوز وعده‌ای در کالری‌شمار ثبت نکرده‌ای؛ ثبت ۳ روز کافی است تا الگوی تغذیه‌ات را ببینم.')
  let weight = ''
  if (w.weightChange !== undefined) {
    if (profile.goal === 'lose') weight = w.weightChange < 0 ? `وزنت ${fa(Math.abs(w.weightChange))} کیلو کم شده؛ دقیقاً در مسیر درستی.` : 'وزنت کم نشده؛ ۲۰۰ تا ۳۰۰ کالری از شام کم کن و پروتئین را بالا نگه دار.'
    else if (profile.goal === 'gain') weight = w.weightChange > 0 ? `${fa(w.weightChange)} کیلو افزایش وزن؛ ادامه بده.` : 'برای افزایش حجم، یک میان‌وعده‌ی ۴۰۰ کالری (مثلاً شیر و کره بادام‌زمینی) اضافه کن.'
  }
  const trend = w.scores[6] - w.scores[0]
  return {
    text: `**مرور هفتگی تو** — میانگین نمره‌ی سلامت: **${fa(w.avgScore)} از ۱۰۰** (${trend >= 0 ? 'رو به بهبود' : 'کمی افت'})

${good.length ? `**نقاط قوت:**
${good.map((g) => `• ${g}`).join('\n')}

` : ''}${fix.length ? `**برای هفته‌ی بعد:**
${fix.map((g) => `• ${g}`).join('\n')}

` : ''}${weight}`.trim(),
    suggestions: [
      { label: 'ثبت تمرین', link: '/workouts' },
      { label: 'کالری‌شمار', link: '/nutrition' },
    ],
  }
}

export const localExpert: AIProvider = {
  name: 'local',
  async weekly(profile, week) {
    return weeklyText(profile, week)
  },
  async reply(history, profile, ctx) {
    const last = [...history].reverse().find((m) => m.role === 'user')?.text ?? ''
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 600))
    const c = ctx?.cycle
    // پرسش درباره‌ی چرخه
    if (/پریود|قاعدگی|عادت ماهانه|چرخه|دوره‌ی ماهانه/.test(last)) {
      if (!c)
        return {
          text: profile.gender === 'female' ? 'برای راهنمایی دقیق، ردیاب چرخه را در پروفایل فعال کن تا فاز امروزت را بدانم.' : 'این بخش مخصوص بانوان است. برای سوالات سلامت می‌توانی با پزشکان کی‌فیت مشورت کنی.',
          suggestions: [{ label: profile.gender === 'female' ? 'فعال‌سازی ردیاب چرخه' : 'مشاوره با پزشک', link: profile.gender === 'female' ? '/profile?tab=health' : '/doctors' }],
        }
      return {
        text: `**امروز روز ${c.day} چرخه‌ات و در فاز ${c.phase} هستی** (شدت پیشنهادی تمرین: ${c.intensity}).\n\n**تمرین:** ${c.workout}\n\n**تغذیه:** ${c.nutrition}\n\n${c.daysToNext} روز تا پریود بعدی. اگر درد شدید یا نامنظمی طولانی داری، حتماً با پزشک مشورت کن.`,
        suggestions: [{ label: 'مشاوره با پزشک زنان', link: '/doctors' }],
      }
    }
    if (/هفته|پیشرفت|عملکرد|گزارش/.test(last) && ctx?.week) return weeklyText(profile, ctx.week)
    const r = answer(last, profile)
    // افزودن نکته‌ی فاز به برنامه‌های تمرین و تغذیه
    if (c && /برنامه/.test(r.text)) {
      r.text += `\n\n**متناسب با چرخه‌ات:** امروز در فاز ${c.phase} هستی؛ شدت ${c.intensity} مناسب است. ${c.workout}`
    }
    return r
  },
}

export type { AISuggestion }
